import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService';

export class AnalyticsController {
  async getPlayerStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await analyticsService.getPlayerStats(req.params.playerId);
      res.json(stats);
    } catch (err) { next(err); }
  }

  async getPlayerForm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const n = parseInt(req.query.n as string) || 5;
      const form = await analyticsService.getPlayerForm(req.params.playerId, n);
      res.json(form);
    } catch (err) { next(err); }
  }

  async getTeamStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await analyticsService.getTeamStats(req.params.teamId);
      res.json(stats);
    } catch (err) { next(err); }
  }

  async getInningsBattingAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getInningsBattingAnalytics(req.params.inningsId);
      res.json(data);
    } catch (err) { next(err); }
  }

  async getWagonWheel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getWagonWheel(
        req.params.inningsId,
        req.query.batsmanId as string | undefined
      );
      res.json(data);
    } catch (err) { next(err); }
  }

  async getManhattan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getManhattan(req.params.matchId);
      res.json(data);
    } catch (err) { next(err); }
  }

  async getWinProbability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getWinProbability(req.params.matchId);
      res.json(data);
    } catch (err) { next(err); }
  }
}

export const analyticsController = new AnalyticsController();
