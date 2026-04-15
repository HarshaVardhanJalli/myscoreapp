/**
 * Subscription Service - Plan management and feature gating
 * created_by: MyCricketScoreEngine_v1
 */

import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export type Plan = 'FREE' | 'PRO' | 'ELITE';

interface PlanLimits {
  matchesPerMonth: number;    // -1 = unlimited
  teamsCount: number;
  playersPerTeam: number;
  tournamentAccess: boolean;
  advancedAnalytics: boolean;
  pdfExport: boolean;
  liveSharing: boolean;
  adsEnabled: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    matchesPerMonth: 5,
    teamsCount: 2,
    playersPerTeam: 15,
    tournamentAccess: false,
    advancedAnalytics: false,
    pdfExport: false,
    liveSharing: false,
    adsEnabled: true,
    apiAccess: false,
  },
  PRO: {
    matchesPerMonth: -1,
    teamsCount: -1,
    playersPerTeam: -1,
    tournamentAccess: true,
    advancedAnalytics: true,
    pdfExport: true,
    liveSharing: true,
    adsEnabled: false,
    apiAccess: false,
  },
  ELITE: {
    matchesPerMonth: -1,
    teamsCount: -1,
    playersPerTeam: -1,
    tournamentAccess: true,
    advancedAnalytics: true,
    pdfExport: true,
    liveSharing: true,
    adsEnabled: false,
    apiAccess: true,
  },
};

export const PLAN_PRICES = {
  FREE: 0,
  PRO: 149,     // ₹149/month
  ELITE: 999,   // ₹999/year
};

class SubscriptionService {
  /**
   * Get the active subscription plan for a user
   */
  async getUserPlan(userId: string): Promise<Plan> {
    const sub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) return 'FREE';
    return sub.plan as Plan;
  }

  /**
   * Get plan limits for a user
   */
  async getUserLimits(userId: string): Promise<PlanLimits> {
    const plan = await this.getUserPlan(userId);
    return PLAN_LIMITS[plan];
  }

  /**
   * Check if a user can create a new match this month
   */
  async canCreateMatch(userId: string): Promise<boolean> {
    const limits = await this.getUserLimits(userId);
    if (limits.matchesPerMonth === -1) return true;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await prisma.match.count({
      where: {
        createdById: userId,
        createdAt: { gte: startOfMonth },
      },
    });

    return count < limits.matchesPerMonth;
  }

  /**
   * Check if a user can create a new team
   */
  async canCreateTeam(userId: string): Promise<boolean> {
    const limits = await this.getUserLimits(userId);
    if (limits.teamsCount === -1) return true;

    const count = await prisma.team.count({ where: { ownerId: userId } });
    return count < limits.teamsCount;
  }

  /**
   * Check feature access with error throwing
   */
  async requireFeature(userId: string, feature: keyof PlanLimits): Promise<void> {
    const limits = await this.getUserLimits(userId);
    const value = limits[feature];
    if (value === false || value === 0) {
      throw new AppError(403, 'This feature requires a Pro or Elite subscription. Upgrade to unlock.');
    }
  }

  /**
   * Create or upgrade a subscription
   */
  async createSubscription(
    userId: string,
    plan: Plan,
    provider: string,
    transactionId: string,
    durationDays?: number
  ) {
    // Expire any existing active subscriptions
    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    const endDate = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    return prisma.subscription.create({
      data: {
        userId,
        plan,
        status: 'ACTIVE',
        provider,
        transactionId,
        endDate,
        metadata: { activatedAt: new Date().toISOString() },
      },
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
    logger.info(`Subscription cancelled for user ${userId}`);
  }

  /**
   * Get full subscription info for a user
   */
  async getSubscriptionInfo(userId: string) {
    const plan = await this.getUserPlan(userId);
    const limits = PLAN_LIMITS[plan];
    const sub = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      plan,
      limits,
      subscription: sub,
      plans: Object.entries(PLAN_LIMITS).map(([key, l]) => ({
        id: key as Plan,
        name: key,
        price: PLAN_PRICES[key as Plan],
        limits: l,
        current: key === plan,
      })),
    };
  }

  /**
   * Check expiring subscriptions (run daily via cron)
   */
  async checkExpiringSubscriptions(): Promise<void> {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const expiring = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: tomorrow },
      },
    });

    for (const sub of expiring) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      logger.info(`Subscription expired for user ${sub.userId}`);
    }
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
