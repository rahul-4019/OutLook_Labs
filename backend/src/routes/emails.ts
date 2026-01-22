import { Router, Request, Response } from 'express';
import prisma from '../db/client';
import { scheduleEmail } from '../queue/emailQueue';
import { getDefaultSender } from '../services/sender';

const router = Router();

/**
 * POST /api/emails/schedule
 * Schedule one or more emails
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const {
      subject,
      body,
      recipients,
      scheduledAt,
      delayBetweenEmails = 2000,
      hourlyLimit = 200,
    } = req.body;

    // Validation
    if (!subject || !body || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: subject, body, recipients',
      });
    }

    if (!scheduledAt) {
      return res.status(400).json({
        error: 'scheduledAt is required',
      });
    }

    const scheduledTime = new Date(scheduledAt);
    if (isNaN(scheduledTime.getTime())) {
      return res.status(400).json({
        error: 'Invalid scheduledAt date',
      });
    }

    // Get or create default sender
    const sender = await getDefaultSender();

    // Create email records and schedule jobs
    const emailIds: string[] = [];
    let currentScheduledTime = scheduledTime;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Create email record
      const email = await prisma.email.create({
        data: {
          subject,
          body,
          recipient,
          senderId: sender.id,
          scheduledAt: currentScheduledTime,
          status: 'SCHEDULED',
        },
      });

      // Schedule the email job
      await scheduleEmail(
        email.id,
        recipient,
        subject,
        body,
        sender.id,
        currentScheduledTime
      );

      emailIds.push(email.id);

      // Calculate next scheduled time with delay
      if (i < recipients.length - 1) {
        currentScheduledTime = new Date(currentScheduledTime.getTime() + delayBetweenEmails);
      }
    }

    res.json({
      success: true,
      message: `Scheduled ${emailIds.length} emails`,
      emailIds,
      scheduledAt: scheduledTime.toISOString(),
    });
  } catch (error: any) {
    console.error('Error scheduling emails:', error);
    res.status(500).json({
      error: 'Failed to schedule emails',
      message: error.message,
    });
  }
});

/**
 * GET /api/emails/scheduled
 * Get all scheduled emails
 */
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        status: 'SCHEDULED',
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      emails: emails.map((email) => ({
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        scheduledAt: email.scheduledAt.toISOString(),
        status: email.status,
        createdAt: email.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching scheduled emails:', error);
    res.status(500).json({
      error: 'Failed to fetch scheduled emails',
      message: error.message,
    });
  }
});

/**
 * GET /api/emails/sent
 * Get all sent emails
 */
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        status: {
          in: ['SENT', 'FAILED'],
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 100, // Limit to recent 100
    });

    res.json({
      success: true,
      emails: emails.map((email) => ({
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        sentAt: email.sentAt?.toISOString() || null,
        status: email.status,
        errorMessage: email.errorMessage,
        createdAt: email.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({
      error: 'Failed to fetch sent emails',
      message: error.message,
    });
  }
});

/**
 * GET /api/emails/:id
 * Get email details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!email) {
      return res.status(404).json({
        error: 'Email not found',
      });
    }

    res.json({
      success: true,
      email: {
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        scheduledAt: email.scheduledAt.toISOString(),
        sentAt: email.sentAt?.toISOString() || null,
        status: email.status,
        errorMessage: email.errorMessage,
        createdAt: email.createdAt.toISOString(),
        updatedAt: email.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching email:', error);
    res.status(500).json({
      error: 'Failed to fetch email',
      message: error.message,
    });
  }
});

export default router;
