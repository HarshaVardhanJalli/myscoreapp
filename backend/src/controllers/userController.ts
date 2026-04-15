/**
 * User Controller - Profile management, follows, notifications, subscriptions
 * created_by: MyCricketScoreEngine_v1
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { subscriptionService } from '../services/subscriptionService';
import { notificationService } from '../services/notificationService';
import { successResponse, buildPaginationMeta, parsePagination } from '../utils/helpers';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, underscores only').optional(),
  bio: z.string().max(300).optional(),
  country: z.string().max(60).optional(),
  city: z.string().max(60).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

class UserController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id || req.user!.sub;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, username: true, email: true,
          avatarUrl: true, bio: true, country: true, city: true,
          role: true, followersCount: true, followingCount: true,
          createdAt: true,
          playerProfile: {
            select: {
              id: true, role: true, battingStyle: true, bowlingStyle: true,
              careerStats: true,
            },
          },
        },
      });

      if (!user) throw new AppError(404, 'User not found');

      // Check if requesting user follows this user
      let isFollowing = false;
      if (req.user && req.user.sub !== userId) {
        const follow = await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: req.user.sub, followingId: userId } },
        });
        isFollowing = !!follow;
      }

      res.json(successResponse({ ...user, isFollowing }));
    } catch (err) { next(err); }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateProfileSchema.parse(req.body);
      const userId = req.user!.sub;

      if (data.username) {
        const existing = await prisma.user.findFirst({
          where: { username: data.username, NOT: { id: userId } },
        });
        if (existing) throw new AppError(409, 'Username already taken');
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true, name: true, username: true, avatarUrl: true,
          bio: true, country: true, city: true,
        },
      });

      res.json(successResponse(user, 'Profile updated'));
    } catch (err) { next(err); }
  }

  async updatePushToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pushToken } = z.object({ pushToken: z.string() }).parse(req.body);
      await prisma.user.update({
        where: { id: req.user!.sub },
        data: { pushToken },
      });
      res.json(successResponse(null, 'Push token updated'));
    } catch (err) { next(err); }
  }

  async follow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const followerId = req.user!.sub;
      const followingId = req.params.id;

      if (followerId === followingId) throw new AppError(400, 'Cannot follow yourself');

      const target = await prisma.user.findUnique({ where: { id: followingId } });
      if (!target) throw new AppError(404, 'User not found');

      await prisma.$transaction([
        prisma.follow.create({ data: { followerId, followingId } }),
        prisma.user.update({ where: { id: followerId }, data: { followingCount: { increment: 1 } } }),
        prisma.user.update({ where: { id: followingId }, data: { followersCount: { increment: 1 } } }),
      ]);

      // Notify
      const follower = await prisma.user.findUnique({ where: { id: followerId }, select: { name: true } });
      await notificationService.sendToUser(followingId, 'FOLLOW', {
        title: 'New Follower',
        body: `${follower?.name} started following you`,
        data: { userId: followerId, type: 'FOLLOW' },
      });

      res.json(successResponse(null, 'Following'));
    } catch (err) { next(err); }
  }

  async unfollow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const followerId = req.user!.sub;
      const followingId = req.params.id;

      await prisma.$transaction([
        prisma.follow.delete({
          where: { followerId_followingId: { followerId, followingId } },
        }),
        prisma.user.update({ where: { id: followerId }, data: { followingCount: { decrement: 1 } } }),
        prisma.user.update({ where: { id: followingId }, data: { followersCount: { decrement: 1 } } }),
      ]);

      res.json(successResponse(null, 'Unfollowed'));
    } catch (err) { next(err); }
  }

  async getFollowers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
      const userId = req.params.id;

      const [follows, total] = await Promise.all([
        prisma.follow.findMany({
          where: { followingId: userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            follower: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        }),
        prisma.follow.count({ where: { followingId: userId } }),
      ]);

      res.json(successResponse({
        items: follows.map((f) => f.follower),
        pagination: buildPaginationMeta(total, page, limit),
      }));
    } catch (err) { next(err); }
  }

  async getFollowing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
      const userId = req.params.id;

      const [follows, total] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            following: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        }),
        prisma.follow.count({ where: { followerId: userId } }),
      ]);

      res.json(successResponse({
        items: follows.map((f) => f.following),
        pagination: buildPaginationMeta(total, page, limit),
      }));
    } catch (err) { next(err); }
  }

  async getSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const info = await subscriptionService.getSubscriptionInfo(req.user!.sub);
      res.json(successResponse(info));
    } catch (err) { next(err); }
  }

  async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { plan, transactionId, provider, durationDays } = z.object({
        plan: z.enum(['PRO', 'ELITE']),
        transactionId: z.string(),
        provider: z.string().default('razorpay'),
        durationDays: z.number().optional(),
      }).parse(req.body);

      const subscription = await subscriptionService.createSubscription(
        req.user!.sub, plan, provider, transactionId, durationDays
      );

      res.json(successResponse(subscription, `Subscribed to ${plan} plan`));
    } catch (err) { next(err); }
  }

  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query as Record<string, unknown>);
      const result = await notificationService.getAll(req.user!.sub, page, limit);
      res.json(successResponse(result));
    } catch (err) { next(err); }
  }

  async markNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notificationId } = req.params;
      if (notificationId) {
        await notificationService.markRead(notificationId, req.user!.sub);
      } else {
        await notificationService.markAllRead(req.user!.sub);
      }
      res.json(successResponse(null, 'Marked as read'));
    } catch (err) { next(err); }
  }

  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = String(req.query.q || '').trim();
      if (!q || q.length < 2) {
        res.json(successResponse([]));
        return;
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 20,
        select: { id: true, name: true, username: true, avatarUrl: true },
      });

      res.json(successResponse(users));
    } catch (err) { next(err); }
  }
}

export const userController = new UserController();
export default userController;
