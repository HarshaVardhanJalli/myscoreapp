import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';

const planLimits: Record<string, number> = {
  FREE: config.rateLimit.maxFree,
  PRO: config.rateLimit.maxPro,
  ELITE: config.rateLimit.maxElite,
};

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: (req: Request) => {
    if (!req.user) return config.rateLimit.maxUnauthenticated;
    return planLimits[req.user.plan] ?? config.rateLimit.maxFree;
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: 'Too many requests, please slow down.' });
  },
});

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: 'Too many attempts, try again later.' });
  },
});
