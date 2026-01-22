import nodemailer from 'nodemailer';
import { config } from '../config';
import prisma from '../db/client';

interface EtherealAccount {
  user: string;
  pass: string;
}

let defaultAccount: EtherealAccount | null = null;

/**
 * Creates or retrieves an Ethereal email account
 */
export async function getEtherealAccount(senderId?: string): Promise<EtherealAccount> {
  // If credentials are provided in env, use them
  if (config.email.etherealUser && config.email.etherealPass) {
    return {
      user: config.email.etherealUser,
      pass: config.email.etherealPass,
    };
  }

  // If senderId is provided, try to get from database
  if (senderId) {
    const sender = await prisma.sender.findUnique({
      where: { id: senderId },
    });
    if (sender) {
      return {
        user: sender.email,
        pass: sender.password,
      };
    }
  }

  // Use default account or create new one
  if (!defaultAccount) {
    defaultAccount = await nodemailer.createTestAccount();
    console.log('Created Ethereal account:', defaultAccount.user);
  }

  return defaultAccount;
}

/**
 * Creates a nodemailer transporter for Ethereal
 */
export async function createTransporter(senderId?: string) {
  const account = await getEtherealAccount(senderId);
  
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });
}

/**
 * Sends an email via Ethereal
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  senderId?: string
): Promise<{ messageId: string; previewUrl: string }> {
  const transporter = await createTransporter(senderId);
  
  const mailOptions = {
    from: `"Email Scheduler" <${(await getEtherealAccount(senderId)).user}>`,
    to,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info) || '';

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
