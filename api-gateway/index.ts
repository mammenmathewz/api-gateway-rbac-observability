import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import KeycloakConnect from 'keycloak-connect';
import { register, collectDefaultMetrics } from 'prom-client';
import { initOpenTelemetry } from './observability';

initOpenTelemetry('api-gateway');

const app = express();
const port = 3000;

// Keycloak configuration
const keycloakConfig = {
  realm: 'newRelm',
  'auth-server-url': 'http://keycloak:8080/',
  'ssl-required': 'none',
  resource: 'api-gateway-client',
  'public-client': false,
  'confidential-port': 0,
  'bearer-only': true
};

const keycloak = new KeycloakConnect({}, keycloakConfig);

// Keycloak middleware
app.use(keycloak.middleware({ logout: '/logout', admin: '/' }));

// Metrics endpoint
collectDefaultMetrics();
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.status(200).send('API Gateway is healthy');
});

// Public route
app.get('/public', (_req, res) => {
  res.send('This is a public endpoint of the API Gateway!');
});

// Step 1: Keycloak Authentication
app.use('/backend', (req, res, next) => {
  keycloak.protect()(req, res, (err) => {
    if (err) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid or expired token',
        details: err.message
      });
    }
    next();
  });
});

// Step 2: Authorization
app.use('/backend', (req, res, next) => {
  try {
    const grant = (req as any).kauth?.grant;
    const token = grant?.access_token;

    if (!token) {
      return res.status(401).json({
        error: 'No Access Token',
        message: 'Authentication token missing'
      });
    }

    const content = token.content;
    const clientRoles = content.resource_access?.['api-gateway-client']?.roles || [];
    const realmRoles = content.realm_access?.roles || [];

    const hasPermission =
      token.hasRole('admin', 'api-gateway-client') ||
      realmRoles.includes('admin') ||
      realmRoles.includes('user') ||
      clientRoles.includes('user');

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: 'Authorization Error',
      message: 'Failed to check permissions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Step 3: Proxy to backend
const proxyOptions = {
  target: 'http://backend:4000',
  changeOrigin: true,
  pathRewrite: {
    '^/backend': '/',
  },
  onProxyReq: (proxyReq: any, req: any) => {
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }

    const grant = (req as any).kauth?.grant;
    const content = grant?.access_token?.content;

    if (content) {
      proxyReq.setHeader('X-User-ID', content.sub || '');
      proxyReq.setHeader('X-Username', content.preferred_username || '');
      proxyReq.setHeader('X-User-Roles', JSON.stringify(content.realm_access?.roles || []));
    }
  },
  onError: (err: any, _req: any, res: any) => {
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Could not reach backend service',
        details: err.message
      });
    }
  }
};

app.use('/backend', createProxyMiddleware(proxyOptions));

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  if (res.headersSent) return;

  res.status(err.statusCode || 500).json({
    error: err.statusCode ? 'Request Error' : 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
});
