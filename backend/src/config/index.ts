import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/email_scheduler',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  email: {
    etherealUser: process.env.ETHEREAL_USER,
    etherealPass: process.env.ETHEREAL_PASS,
  },
  rateLimiting: {
    maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10),
    minDelayBetweenEmails: parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS || '2000', 10),
    concurrencyLevel: parseInt(process.env.CONCURRENCY_LEVEL || '5', 10),
  },
};
