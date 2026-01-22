const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ScheduleEmailRequest {
  subject: string;
  body: string;
  recipients: string[];
  scheduledAt: string;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
}

export interface Email {
  id: string;
  recipient: string;
  subject: string;
  scheduledAt?: string;
  sentAt?: string | null;
  status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
  errorMessage?: string | null;
  createdAt: string;
}

export interface ScheduleEmailResponse {
  success: boolean;
  message: string;
  emailIds: string[];
  scheduledAt: string;
}

export interface GetEmailsResponse {
  success: boolean;
  emails: Email[];
}

export async function scheduleEmails(data: ScheduleEmailRequest): Promise<ScheduleEmailResponse> {
  const response = await fetch(`${API_URL}/api/emails/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to schedule emails');
  }

  return response.json();
}

export async function getScheduledEmails(): Promise<Email[]> {
  const response = await fetch(`${API_URL}/api/emails/scheduled`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch scheduled emails');
  }

  const data: GetEmailsResponse = await response.json();
  return data.emails;
}

export async function getSentEmails(): Promise<Email[]> {
  const response = await fetch(`${API_URL}/api/emails/sent`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sent emails');
  }

  const data: GetEmailsResponse = await response.json();
  return data.emails;
}
