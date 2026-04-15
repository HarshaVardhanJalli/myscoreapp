/**
 * Notification Service - Push notifications via Firebase Admin
 * created_by: MyCricketScoreEngine_v1
 */

import { getMessaging, Message, MulticastMessage } from 'firebase-admin/messaging';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface SendNotificationOptions {
  userId: string;
  type: string;
  payload: NotificationPayload;
}

class NotificationService {
  /**
   * Send push notification to a single user
   */
  async sendToUser(userId: string, type: string, payload: NotificationPayload): Promise<void> {
    try {
      // Save to DB regardless of push delivery
      await prisma.notification.create({
        data: {
          userId,
          type: type as any,
          title: payload.title,
          body: payload.body,
          data: payload.data ? JSON.stringify(payload.data) : null,
        },
      });

      // Get user push token
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true },
      });

      if (!user?.pushToken) return;

      const message: Message = {
        token: user.pushToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await getMessaging().send(message);
    } catch (err) {
      logger.error('Failed to send notification:', err);
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds: string[], type: string, payload: NotificationPayload): Promise<void> {
    try {
      // Save to DB for all users
      await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: type as any,
          title: payload.title,
          body: payload.body,
          data: payload.data ? JSON.stringify(payload.data) : null,
        })),
      });

      // Get all push tokens
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, pushToken: { not: null } },
        select: { pushToken: true },
      });

      const tokens = users.map((u) => u.pushToken!).filter(Boolean);
      if (tokens.length === 0) return;

      const message: MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: { priority: 'high' },
      };

      const response = await getMessaging().sendEachForMulticast(message);
      logger.info(`Multicast sent: ${response.successCount}/${tokens.length} succeeded`);
    } catch (err) {
      logger.error('Failed to send multicast notification:', err);
    }
  }

  /**
   * Notify all followers of a user about a match event
   */
  async notifyFollowers(userId: string, type: string, payload: NotificationPayload): Promise<void> {
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });
    const followerIds = followers.map((f) => f.followerId);
    if (followerIds.length > 0) {
      await this.sendToUsers(followerIds, type, payload);
    }
  }

  // ─── Cricket-specific notification helpers ────────────────────────────────

  async notifyWicket(matchId: string, playerName: string, wicketType: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { title: true, createdById: true },
    });
    if (!match) return;

    await this.sendToUser(match.createdById, 'WICKET', {
      title: '🏏 Wicket!',
      body: `${playerName} is out! (${wicketType})`,
      data: { matchId, type: 'WICKET' },
    });
  }

  async notifyMilestone(userId: string, milestone: string, detail: string): Promise<void> {
    const types: Record<string, string> = {
      FIFTY: 'FIFTY',
      HUNDRED: 'HUNDRED',
      HAT_TRICK: 'HAT_TRICK',
    };
    await this.sendToUser(userId, types[milestone] || 'MATCH_UPDATE', {
      title: `🎉 ${milestone}!`,
      body: detail,
      data: { type: milestone },
    });
  }

  async notifyMatchComplete(matchId: string, result: string): Promise<void> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { title: true, createdById: true },
    });
    if (!match) return;

    await this.sendToUser(match.createdById, 'MATCH_COMPLETE', {
      title: '🏆 Match Complete',
      body: result,
      data: { matchId, type: 'MATCH_COMPLETE' },
    });
  }

  // ─── DB notification management ──────────────────────────────────────────

  async getUnread(userId: string, limit = 20) {
    return prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async getAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
