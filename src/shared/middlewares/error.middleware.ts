import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '../../../generated/prisma';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorBody = {
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  };
  res.status(404).json(body);
};

function normalize(err: unknown): { status: number; code: string; message: string; details?: unknown } {
  if (err instanceof AppError) {
    return { status: err.statusCode, code: err.code, message: err.message, details: err.details };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Datos de entrada inválidos',
      details: err.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return {
          status: 409,
          code: 'UNIQUE_CONSTRAINT',
          message: 'Ya existe un registro con esos datos únicos',
          details: err.meta?.target,
        };
      case 'P2003':
        return { status: 409, code: 'FOREIGN_KEY_CONSTRAINT', message: 'Operación inválida por relaciones existentes' };
      case 'P2025':
        return { status: 404, code: 'NOT_FOUND', message: 'Recurso no encontrado' };
      default:
        break;
    }
  }

  if (err instanceof jwt.TokenExpiredError) {
    return { status: 401, code: 'TOKEN_EXPIRED', message: 'El token ha expirado' };
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return { status: 401, code: 'INVALID_TOKEN', message: 'Token inválido' };
  }

  // JSON malformado (body-parser)
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    return { status: 400, code: 'INVALID_JSON', message: 'El cuerpo de la petición no es un JSON válido' };
  }

  return { status: 500, code: 'INTERNAL_ERROR', message: 'Error interno del servidor' };
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  const { status, code, message, details } = normalize(err);

  if (status >= 500) {
    console.error('💥 Error no controlado:', err);
  }

  const body: ErrorBody = { success: false, error: { code, message } };
  if (details !== undefined) body.error.details = details;
  if (env.NODE_ENV !== 'production' && status >= 500 && err instanceof Error) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
};
