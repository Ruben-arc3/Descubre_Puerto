import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export const SESSION_COOKIE_NAME = 'puerto_session';
export const SESSION_IDLE_TIMEOUT_MS = env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000;

type SessionUser = { id: string; role: string };

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'none' as const,
  path: '/',
};

export function createSessionToken(user: SessionUser): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: Math.floor(SESSION_IDLE_TIMEOUT_MS / 1000),
    algorithm: 'HS256',
  });
}

export function setSessionCookie(res: Response, user: SessionUser): void {
  res.cookie(SESSION_COOKIE_NAME, createSessionToken(user), {
    ...cookieOptions,
    maxAge: SESSION_IDLE_TIMEOUT_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
}
