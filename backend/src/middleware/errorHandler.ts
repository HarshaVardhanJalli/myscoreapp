import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Zod validation errors → 400
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    res.status(400).json({
      error: 'Validation failed',
      details: messages,
    });
    return;
  }

  // Prisma not found
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const pe = err as any;
    if (pe.code === 'P2025') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (pe.code === 'P2002') {
      res.status(409).json({ error: 'Resource already exists' });
      return;
    }
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({ error: isDev ? err.message || 'Internal server error' : 'Internal server error' });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}
