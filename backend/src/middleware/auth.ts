import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JWTPayload {
  sub: string;
  email: string;
  role: 'USER' | 'SCORER' | 'ADMIN';
  plan: 'FREE' | 'PRO' | 'ELITE';
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface User extends JWTPayload {}
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), config.jwt.accessSecret) as JWTPayload;
    } catch {
      // ignore
    }
  }
  next();
}

export function requireRole(...roles: Array<'USER' | 'SCORER' | 'ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requirePlan(...plans: Array<'FREE' | 'PRO' | 'ELITE'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!plans.includes(req.user.plan)) {
      res.status(403).json({ error: 'Upgrade your plan to access this feature' });
      return;
    }
    next();
  };
}
