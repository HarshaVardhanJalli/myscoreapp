/**
 * JWT Utility - Token generation and verification
 */

import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export interface DecodedToken extends TokenPayload, JwtPayload {}

/**
 * Generate a short-lived access token (15m default)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
    issuer: 'MyCricketScoreEngine_v1',
    audience: 'myscoreapp-client',
  } as SignOptions);
}

/**
 * Generate a long-lived refresh token (7d default)
 */
export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'MyCricketScoreEngine_v1',
  } as SignOptions);
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: 'MyCricketScoreEngine_v1',
    audience: 'myscoreapp-client',
  }) as DecodedToken;
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload & JwtPayload {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: 'MyCricketScoreEngine_v1',
  }) as RefreshTokenPayload & JwtPayload;
}

/**
 * Decode without verification (for reading expired tokens)
 */
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}

/**
 * Generate both access + refresh token pair
 */
export function generateTokenPair(payload: TokenPayload, tokenId: string): {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken({ userId: payload.userId, tokenId }),
    expiresIn: config.jwt.accessExpiresIn,
  };
}
