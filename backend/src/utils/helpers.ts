/**
 * General utility helpers for the application
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ─── Password ─────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateShareToken(): string {
  return crypto.randomBytes(8).toString('hex');
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

// ─── Cricket Math ─────────────────────────────────────────────────────────────

export function formatOvers(legalBalls: number): string {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
}

export function oversToLegalBalls(overs: number): number {
  const whole = Math.floor(overs);
  const decimal = Math.round((overs - whole) * 10);
  return whole * 6 + decimal;
}

export function calculateStrikeRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return parseFloat(((runs / balls) * 100).toFixed(2));
}

export function calculateEconomy(runs: number, legalBalls: number): number {
  if (legalBalls === 0) return 0;
  return parseFloat(((runs / legalBalls) * 6).toFixed(2));
}

export function calculateAverage(runs: number, dismissals: number): number {
  if (dismissals === 0) return runs;
  return parseFloat((runs / dismissals).toFixed(2));
}

export function calculateRunRate(runs: number, legalBalls: number): number {
  if (legalBalls === 0) return 0;
  return parseFloat(((runs / legalBalls) * 6).toFixed(2));
}

export function calculateRequiredRunRate(
  target: number,
  current: number,
  ballsRemaining: number
): number {
  const needed = target - current;
  if (ballsRemaining <= 0) return 99.99;
  if (needed <= 0) return 0;
  return parseFloat(((needed / ballsRemaining) * 6).toFixed(2));
}

/**
 * Win probability using a logistic-curve approximation.
 * Returns probability (0–1) for batting team.
 */
export function calculateWinProbability(
  target: number,
  current: number,
  wicketsDown: number,
  ballsRemaining: number,
  totalBalls: number
): number {
  if (ballsRemaining <= 0) return current >= target ? 1 : 0;
  const needed = target - current;
  if (needed <= 0) return 1;

  const wicketsRemaining = 10 - wicketsDown;
  const requiredRate = (needed / ballsRemaining) * 6;
  const resourcesRemaining = (ballsRemaining / totalBalls) * (wicketsRemaining / 10);

  // Logistic function: higher requiredRate → lower probability
  const k = 1.5;
  const x = resourcesRemaining - (needed / target) * 1.2;
  const prob = 1 / (1 + Math.exp(-k * x * 10));

  return Math.max(0.02, Math.min(0.98, parseFloat(prob.toFixed(4))));
}

// ─── String Utils ─────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateUsername(name: string): string {
  const base = slugify(name).replace(/-/g, '_');
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `${base}${suffix}`;
}

// ─── Response Builder ─────────────────────────────────────────────────────────

export function successResponse<T>(data: T, message?: string) {
  return { success: true, message: message || 'Success', data };
}

export function errorResponse(message: string, errors?: unknown) {
  return { success: false, message, errors };
}

// ─── Distance (Haversine) ─────────────────────────────────────────────────────

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
