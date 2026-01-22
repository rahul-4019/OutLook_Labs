import express from 'express';
import cors from 'cors';
import { config } from './config';
import emailRoutes from './routes/emails';
import { emailWorker } from './queue/emailQueue';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/emails', emailRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
const PORT = config.server.port;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📧 Email worker started with concurrency: ${config.rateLimiting.concurrencyLevel}`);
  console.log(`⏱️  Rate limit: ${config.rateLimiting.maxEmailsPerHour} emails/hour`);
  console.log(`⏳ Min delay between emails: ${config.rateLimiting.minDelayBetweenEmails}ms`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await emailWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await emailWorker.close();
  process.exit(0);
});
