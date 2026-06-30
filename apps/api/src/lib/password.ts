import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const test = scryptSync(password, salt, 64);
  if (hashBuffer.length !== test.length) return false;
  return timingSafeEqual(hashBuffer, test);
}

/** Short-lived token for unlock cookies (slug:id:hash prefix) */
export function unlockToken(resourceType: string, id: string, passwordHash: string): string {
  return createHash('sha256')
    .update(`${resourceType}:${id}:${passwordHash}:${process.env.SESSION_SECRET ?? 'dev'}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyUnlockToken(
  resourceType: string,
  id: string,
  passwordHash: string,
  token: string
): boolean {
  return unlockToken(resourceType, id, passwordHash) === token;
}
