import prisma from '../db/client';
import { getEtherealAccount } from './ethereal';

/**
 * Gets or creates a sender
 */
export async function getOrCreateSender(email: string, name: string = 'Default Sender') {
  let sender = await prisma.sender.findUnique({
    where: { email },
  });

  if (!sender) {
    // Create Ethereal account for this sender
    const account = await getEtherealAccount();
    
    sender = await prisma.sender.create({
      data: {
        email: account.user,
        password: account.pass,
        name,
      },
    });
  }

  return sender;
}

/**
 * Gets the default sender (creates if doesn't exist)
 */
export async function getDefaultSender() {
  return getOrCreateSender('default@ethereal.email', 'Default Sender');
}
