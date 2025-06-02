import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

// --- CRITICAL FIX 1: Import 'resourceFromAttributes' along with 'Resource' (Resource for type, resourceFromAttributes for value) ---
import { Resource, resourceFromAttributes } from '@opentelemetry/resources';

// Import individual semantic attribute constants
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT
} from '@opentelemetry/semantic-conventions';

export const initOpenTelemetry = (serviceName: string) => {
  const prometheusExporter = new PrometheusExporter({
    port: serviceName === 'api-gateway' ? 9464 : 9465,
  });

  prometheusExporter.startServer().then(() => {
    console.log(`Prometheus scrape endpoint started on port ${serviceName === 'api-gateway' ? 9464 : 9465}`);
  });

  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
  });

 const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: "1.0.0",
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development",
  }),
  traceExporter: traceExporter,
  metricReader: prometheusExporter, // ✅ THIS IS MANDATORY FOR METRICS TO WORK!
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) => ['/metrics', '/health'].includes(req.url || ''),
      },
      '@opentelemetry/instrumentation-express': {},
    }),
  ],
});


  try {
    sdk.start();
    console.log(`OpenTelemetry SDK started for ${serviceName}`);
  } catch (error) {
    console.error(`Error initializing OpenTelemetry for ${serviceName}:`, error);
  }

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error) => console.log('Error shutting down OpenTelemetry SDK', error))
      .finally(() => process.exit(0));
  });
};