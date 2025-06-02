import express from 'express';
import { register, collectDefaultMetrics } from 'prom-client';
import { initOpenTelemetry } from './observability';

initOpenTelemetry('backend-service');

const app = express();
const port = 4000;

app.use(express.json());

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('Backend Service is healthy');
});

app.get('/public', (req, res) => {
  console.log('Backend: Received request on public endpoint');
  res.send('This is a public endpoint from the Backend Service!');
});

app.get('/data', (req, res) => {
  const userId = req.headers['x-user-id'] || 'N/A';
  const userRoles = req.headers['x-user-roles'] ? JSON.parse(req.headers['x-user-roles'] as string) : [];

  console.log(`Backend: Received request on /data from User ID: ${userId}, Roles: ${userRoles.join(', ')}`);

  res.json({
    message: `Hello from Backend Service!`,
    data: 'This is some protected data.',
    receivedUser: {
      id: userId,
      roles: userRoles
    }
  });
});

app.listen(port, () => {
  console.log(`Backend Service running on port ${port}`);
});