import redis from '../redis/client';
import { config } from '../config';

/**
 * Gets the current hour window key for rate limiting
 */
function getHourWindowKey(senderId: string): string {
  const now = new Date();
  const hour = now.getUTCHours();
  const date = now.toISOString().split('T')[0];
  return `rate_limit:${date}-${hour}:${senderId}`;
}

/**
 * Gets the next available hour window key
 */
function getNextHourWindowKey(senderId: string): string {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1);
  const hour = nextHour.getUTCHours();
  const date = nextHour.toISOString().split('T')[0];
  return `rate_limit:${date}-${hour}:${senderId}`;
}

/**
 * Checks if the sender has reached the hourly rate limit
 */
export async function checkRateLimit(senderId: string): Promise<boolean> {
  const key = getHourWindowKey(senderId);
  const count = await redis.get(key);
  const currentCount = count ? parseInt(count, 10) : 0;
  
  return currentCount >= config.rateLimiting.maxEmailsPerHour;
}

/**
 * Increments the rate limit counter for a sender
 */
export async function incrementRateLimit(senderId: string): Promise<number> {
  const key = getHourWindowKey(senderId);
  const count = await redis.incr(key);
  
  // Set expiration to 2 hours (to cover current hour + next hour)
  await redis.expire(key, 7200);
  
  return count;
}

/**
 * Gets the current count for a sender in the current hour
 */
export async function getCurrentCount(senderId: string): Promise<number> {
  const key = getHourWindowKey(senderId);
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Calculates delay until the next available hour window
 */
export async function getDelayUntilNextWindow(senderId: string): Promise<number> {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1);
  nextHour.setUTCMinutes(0);
  nextHour.setUTCSeconds(0);
  nextHour.setUTCMilliseconds(0);
  
  return nextHour.getTime() - now.getTime();
}

/**
 * Gets the next available hour window timestamp
 */
export function getNextAvailableWindow(): Date {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1);
  nextHour.setUTCMinutes(0);
  nextHour.setUTCSeconds(0);
  nextHour.setUTCMilliseconds(0);
  return nextHour;
}
