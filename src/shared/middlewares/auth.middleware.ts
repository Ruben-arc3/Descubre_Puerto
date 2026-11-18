import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../../generated/prisma';
import { z } from 'zod';
import { env } from '../../config/env';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';

export interface AuthUser {
  id: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const tokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(Object.values(UserRole) as [UserRole, ...UserRole[]]),
});

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function resolveUser(token: string): AuthUser {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  const parsed = tokenPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new UnauthorizedError('Token inválido');
  }
  return { id: parsed.data.sub, role: parsed.data.role };
}

/** Exige un JWT válido. Adjunta `req.user`. */
export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req);
  if (!token) {
    throw new UnauthorizedError('Token de autenticación requerido');
  }
  try {
    req.user = resolveUser(token);
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('El token ha expirado');
    }
    throw new UnauthorizedError('Token inválido');
  }
  next();
};

/**
 * Si hay un JWT válido adjunta `req.user`; si no hay token o es inválido/expirado,
 * la petición continúa como anónima (ideal para inquiries).
 */
export const optionalAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req);
  if (token) {
    try {
      req.user = resolveUser(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
};

/** Restringe el acceso a los roles indicados. Debe ir después de `requireAuth`. */
export const requireRole = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Token de autenticación requerido');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
};
