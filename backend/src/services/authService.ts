/**
 * Auth Service — JWT + Google OAuth
 * created_by: MyCricketScoreEngine_v1
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import redis from '../utils/redis';
import { AppError } from '../middleware/errorHandler';
import { JWTPayload } from '../middleware/auth';

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(config.google.clientId);

export interface RegisterInput {
  email: string;
  username: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function signAccess(user: { id: string; email: string; role: string; plan: string }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, plan: user.plan },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

function signRefresh(userId: string, tokenId: string): string {
  return jwt.sign(
    { sub: userId, jti: tokenId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

async function invalidatePreviousRefreshTokens(userId: string): Promise<void> {
  // Store revocation in Redis
  await redis.set(`revoke:user:${userId}`, Date.now().toString(), 'EX', 7 * 24 * 3600);
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthTokens> {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
    });
    if (existing) {
      throw new AppError(409, 'Email or username already in use');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        username: input.username.toLowerCase(),
        name: input.name,
        passwordHash,
      },
    });

    return this.issueTokens(user);
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new AppError(403, 'Account is suspended');
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await invalidatePreviousRefreshTokens(user.id);
    return this.issueTokens(user);
  }

  async googleAuth(idToken?: string, accessToken?: string): Promise<AuthTokens> {
    let email: string;
    let googleId: string;
    let name: string | undefined;
    let picture: string | undefined;

    if (idToken) {
      // Verify a Google ID token (JWT signed by Google)
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) throw new AppError(400, 'Invalid Google token');
      email = payload.email;
      googleId = payload.sub!;
      name = payload.name;
      picture = payload.picture;
    } else if (accessToken) {
      // Verify a Google access token by calling the userinfo endpoint
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new AppError(400, 'Invalid Google access token');
      const info = await res.json() as { sub?: string; email?: string; name?: string; picture?: string };
      if (!info.email || !info.sub) throw new AppError(400, 'Could not retrieve Google user info');
      email = info.email;
      googleId = info.sub;
      name = info.name;
      picture = info.picture;
    } else {
      throw new AppError(400, 'Either idToken or accessToken is required');
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email: email.toLowerCase() }] },
    });

    if (!user) {
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + uuidv4().slice(0, 4);
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          username,
          name: name || email,
          googleId,
          avatarUrl: picture,
          isVerified: true,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatarUrl: picture, isVerified: true },
      });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; jti: string };
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Check if this user's tokens have been revoked
    const revokedAt = await redis.get(`revoke:user:${payload.sub}`);
    const tokenIat = (jwt.decode(refreshToken) as any).iat * 1000;
    if (revokedAt && tokenIat < parseInt(revokedAt)) {
      throw new AppError(401, 'Refresh token has been revoked');
    }

    const dbToken = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, revokedAt: null },
      include: { user: true },
    });
    if (!dbToken) throw new AppError(401, 'Refresh token not found or already used');

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(dbToken.user);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, token: refreshToken },
      data: { revokedAt: new Date() },
    });
    await invalidatePreviousRefreshTokens(userId);
  }

  async getMe(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        role: true,
        plan: true,
        isVerified: true,
        createdAt: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          select: { plan: true, endDate: true, provider: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async updateProfile(userId: string, data: { name?: string; username?: string; avatarUrl?: string }) {
    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: { username: data.username, NOT: { id: userId } },
      });
      if (existing) throw new AppError(409, 'Username already taken');
    }
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, username: true, name: true, avatarUrl: true, role: true, plan: true },
    });
  }

  // Public alias used by googleCallback after Passport authenticates via browser redirect
  async issueTokensForUser(user: { id: string; email: string; role: string; plan: string }): Promise<AuthTokens> {
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
    return this.issueTokens(user);
  }

  private async issueTokens(user: { id: string; email: string; role: string; plan: string }): Promise<AuthTokens> {
    const tokenId = uuidv4();
    const accessToken = signAccess(user);
    const rawRefresh = signRefresh(user.id, tokenId);

    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await prisma.refreshToken.create({
      data: { id: tokenId, userId: user.id, token: rawRefresh, expiresAt },
    });

    return { accessToken, refreshToken: rawRefresh, expiresIn: 900 }; // 15 min in seconds
  }
}

export const authService = new AuthService();
export default authService;
