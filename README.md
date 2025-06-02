# API Gateway with Keycloak Authentication

A secure API Gateway built with Express.js that provides authentication, authorization, and request proxying to backend services using Keycloak for identity and access management.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│     Client      │    │   API Gateway   │    │   Keycloak      │
│   (Postman/     │    │   (Port 3000)   │    │   (Port 8080)   │
│    Browser)     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Request with       │                       │
         │    Bearer Token       │                       │
         └──────────────────────►│                       │
                                 │ 2. Validate Token     │
                                 └──────────────────────►│
                                 │                       │
                                 │ 3. Token Valid        │
                                 │◄──────────────────────┘
                                 │
                                 │ 4. Check User Roles
                                 │    & Authorization
                                 │
┌─────────────────┐              │
│                 │              │ 5. Proxy Request
│   Backend API   │◄─────────────┤    (if authorized)
│   (Port 4000)   │              │
│                 │              │ 6. Forward Response
└─────────────────┘              │
         │                       │
         │ 7. Response           │
         └──────────────────────►│
                                 │ 8. Response to Client
         ┌───────────────────────┘
         │
         ▼
┌─────────────────┐
│     Client      │
│   (Response)    │
└─────────────────┘
```

## 🚀 Features

- **JWT Authentication**: Secure token-based authentication using Keycloak
- **Role-Based Authorization**: Fine-grained access control with realm and client roles
- **Request Proxying**: Seamless forwarding of authenticated requests to backend services
- **Observability**: Built-in metrics with Prometheus and OpenTelemetry tracing
- **Health Monitoring**: Health check endpoints for service monitoring
- **Enhanced Logging**: Comprehensive request/response logging with debugging capabilities

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Running Keycloak instance
- Backend service running on port 4000

## 🔧 Configuration

### Keycloak Configuration
```javascript
const keycloakConfig = {
  "realm": "newRelm",
  "auth-server-url": "http://keycloak:8080/",
  "ssl-required": "none",
  "resource": "api-gateway-client",
  "public-client": false,
  "confidential-port": 0,
  "bearer-only": true
};
```

### Required Keycloak Setup
1. Create realm: `newRelm`
2. Create client: `api-gateway-client`
3. Configure client as confidential with bearer-only access
4. Create users with appropriate roles (`admin`)
5. Assign roles to users in both realm and client scopes

## 🚀 Getting Started

### 1. Clone and Setup
```bash
git clone <https://github.com/mammenmathewz/api-gateway-rbac-observability>
cd api-gateway
npm install
```

### 2. Build and Run with Docker
```bash
docker-compose up --build
```

### 3. Verify Services
- API Gateway: http://localhost:3000
- Keycloak: http://localhost:8080
- Metrics: http://localhost:3000/metrics
- Health Check: http://localhost:3000/health

## 🔐 Authentication Flow

### 1. Get Access Token from Keycloak
```bash
curl -X POST \
  "http://localhost:8080/realms/newRelm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=api-gateway-client" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD"
```

### 2. Use Token in API Requests
```bash
curl -X GET \
  "http://localhost:3000/backend/data" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📡 API Endpoints

### Public Endpoints
- `GET /health` - Health check
- `GET /public` - Public test endpoint
- `GET /metrics` - Prometheus metrics

### Protected Endpoints
- `GET /backend/*` - Proxied backend requests (requires authentication)

### Debug Endpoints
- `GET /debug/keycloak-test` - Test Keycloak connectivity

## 🔍 Debugging

### Enable Debug Mode
The application includes comprehensive logging for troubleshooting:

1. **Request Logging**: All incoming requests are logged with headers and timing
2. **Token Validation**: JWT token content and validation status
3. **Role Checking**: User roles and authorization decisions
4. **Proxy Logging**: Backend request/response details

### Common Issues and Solutions

#### 1. "Access Denied" Error
- **Cause**: Missing or invalid Bearer token
- **Solution**: Ensure valid JWT token in Authorization header

#### 2. Authentication Timeout
- **Cause**: Keycloak connectivity issues
- **Solution**: Check Keycloak service status and network connectivity

#### 3. Insufficient Permissions
- **Cause**: User lacks required roles
- **Solution**: Assign `admin` or `user` roles in Keycloak

### Testing Connectivity
```bash
# Test Keycloak connectivity
curl http://localhost:3000/debug/keycloak-test

# Test public endpoint
curl http://localhost:3000/public

# Test health endpoint
curl http://localhost:3000/health
```

## 📊 Monitoring

### Prometheus Metrics
Available at `/metrics` endpoint:
- HTTP request duration
- Request count by status code
- Active connections
- Custom business metrics

### OpenTelemetry Tracing
Distributed tracing enabled for:
- HTTP requests
- Keycloak validation calls
- Backend proxy requests

## 🐳 Docker Configuration

### docker-compose.yml Structure
```yaml
services:
  api-gateway:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - keycloak
      - backend
    environment:
      - NODE_ENV=production
```

## 🔧 Development

### Local Development
```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```




### Manual Testing with Postman
1. Import the provided Postman collection
2. Set up environment variables:
   - `gateway_url`: http://localhost:3000
   - `keycloak_url`: http://localhost:8080
   - `bearer_token`: Your JWT token


## 🚨 Security Considerations

- JWT tokens are validated against Keycloak for every request
- Role-based access control implemented at gateway level
- Bearer-only client configuration prevents token issuance from gateway
- Request headers sanitized and user context forwarded to backend
- HTTPS recommended for production deployments

## 📈 Performance

- Connection pooling for backend requests
- Efficient JWT validation with caching
- Async/await patterns for non-blocking operations
- Prometheus metrics for performance monitoring



## 📞 Support

For issues and questions:
1. Check the debugging section above
2. Review logs for specific error messages
3. Test Keycloak connectivity using debug endpoints
4. Verify user roles and permissions in Keycloak admin console