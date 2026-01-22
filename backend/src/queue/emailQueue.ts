import { Queue, Worker, Job } from 'bullmq';
import redis from '../redis/client';
import { config } from '../config';
import { sendEmail } from '../services/ethereal';
import { checkRateLimit, incrementRateLimit, getDelayUntilNextWindow } from '../services/rateLimiter';
import prisma from '../db/client';

export const emailQueue = new Queue('email-queue', {
  connection: {
    host: config.redis.host,
    port: config.redis.port,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

interface EmailJobData {
  emailId: string;
  recipient: string;
  subject: string;
  body: string;
  senderId: string;
}

/**
 * Email worker that processes email jobs
 */
export const emailWorker = new Worker<EmailJobData>(
  'email-queue',
  async (job: Job<EmailJobData>) => {
    const { emailId, recipient, subject, body, senderId } = job.data;

    // Check if email was already sent (idempotency check)
    const email = await prisma.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    if (email.status === 'SENT') {
      console.log(`Email ${emailId} already sent, skipping`);
      return { skipped: true, reason: 'already_sent' };
    }

    // Check rate limit
    const isRateLimited = await checkRateLimit(senderId);
    
    if (isRateLimited) {
      // Reschedule to next hour window
      const delay = await getDelayUntilNextWindow(senderId);
      const nextScheduledTime = new Date(Date.now() + delay);
      console.log(`Rate limit reached for sender ${senderId}, rescheduling to ${nextScheduledTime.toISOString()}`);
      
      // Create a new job for the next hour window
      const newJob = await emailQueue.add(
        `email-${emailId}`,
        job.data,
        {
          delay,
          jobId: `email-${emailId}-${nextScheduledTime.getTime()}`, // Unique job ID
        }
      );

      // Update email status to show it's been rescheduled
      await prisma.email.update({
        where: { id: emailId },
        data: {
          scheduledAt: nextScheduledTime,
          jobId: newJob.id?.toString(),
        },
      });

      // Return success to prevent retry
      return {
        success: true,
        rescheduled: true,
        nextScheduledTime: nextScheduledTime.toISOString(),
      };
    }

    // Increment rate limit counter
    await incrementRateLimit(senderId);

    try {
      // Send email
      const result = await sendEmail(recipient, subject, body, senderId);
      
      // Update email status
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          jobId: job.id?.toString(),
        },
      });

      console.log(`Email sent successfully: ${emailId} to ${recipient}`);
      console.log(`Preview URL: ${result.previewUrl}`);

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: result.previewUrl,
      };
    } catch (error: any) {
      // Update email status to failed
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          jobId: job.id?.toString(),
        },
      });

      throw error;
    }
  },
  {
    connection: {
      host: config.redis.host,
      port: config.redis.port,
    },
    concurrency: config.rateLimiting.concurrencyLevel,
    limiter: {
      max: 1,
      duration: config.rateLimiting.minDelayBetweenEmails,
    },
  }
);

emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

emailWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

/**
 * Schedule an email to be sent at a specific time
 */
export async function scheduleEmail(
  emailId: string,
  recipient: string,
  subject: string,
  body: string,
  senderId: string,
  scheduledAt: Date
): Promise<string> {
  const now = Date.now();
  const scheduledTime = scheduledAt.getTime();
  const delay = Math.max(0, scheduledTime - now);

  const job = await emailQueue.add(
    `email-${emailId}`,
    {
      emailId,
      recipient,
      subject,
      body,
      senderId,
    },
    {
      delay,
      jobId: `email-${emailId}`, // Use email ID as job ID for idempotency
    }
  );

  // Update email with job ID
  await prisma.email.update({
    where: { id: emailId },
    data: {
      jobId: job.id,
    },
  });

  return job.id!;
}
