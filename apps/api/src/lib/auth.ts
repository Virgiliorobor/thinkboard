import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyUnlockToken } from './password.js';

export async function requireEditor(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.cookies.editor;
    if (!token) throw new Error('no token');
    const payload = await request.server.jwt.verify<{ role: string }>(token);
    if (payload.role !== 'editor') throw new Error('not editor');
  } catch {
    return reply.status(401).send({ error: 'Editor login required' });
  }
}

export function isEditor(request: FastifyRequest): boolean {
  try {
    const token = request.cookies.editor;
    if (!token) return false;
    const payload = request.server.jwt.decode<{ role: string }>(token);
    return payload?.role === 'editor';
  } catch {
    return false;
  }
}

export function hasResearchAccess(
  request: FastifyRequest,
  slug: string,
  isPrivate: boolean,
  passwordHash: string | null
): boolean {
  if (!isPrivate) return true;
  if (isEditor(request)) return true;
  if (!passwordHash) return false;
  const cookie = request.cookies[`unlock_r_${slug}`];
  if (!cookie) return false;
  return verifyUnlockToken('research', slug, passwordHash, cookie);
}

export function hasTrailAccess(
  request: FastifyRequest,
  trailId: string,
  isPrivate: boolean,
  passwordHash: string | null
): boolean {
  if (!isPrivate) return true;
  if (isEditor(request)) return true;
  if (!passwordHash) return false;
  const cookie = request.cookies[`unlock_t_${trailId}`];
  if (!cookie) return false;
  return verifyUnlockToken('trail', trailId, passwordHash, cookie);
}

export function setUnlockCookie(
  reply: FastifyReply,
  name: string,
  token: string
) {
  reply.setCookie(name, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60,
  });
}
