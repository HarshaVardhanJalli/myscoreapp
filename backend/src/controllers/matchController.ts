import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { matchService } from '../services/matchService';
import { AppError } from '../middleware/errorHandler';

const createMatchSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  matchType: z.enum(['T20', 'ODI', 'TEST', 'T10', 'CUSTOM']),
  oversPerInnings: z.number().int().min(0).max(100),
  team1Id: z.string().min(1),
  team2Id: z.string().min(1),
  venueId: z.string().min(1).optional(),
  venueName: z.string().max(120).optional(),
  scheduledAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  tournamentId: z.string().min(1).optional(),
  isPublic: z.boolean().default(true),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export class MatchController {
  async createMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createMatchSchema.parse(req.body);
      const match = await matchService.createMatch({ ...input, createdBy: req.user!.sub });
      res.status(201).json(match);
    } catch (err) { next(err); }
  }

  async getMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const match = await matchService.getMatch(req.params.id);
      res.json(match);
    } catch (err) { next(err); }
  }

  async listMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = z.object({
        status: z.string().optional(),
        teamId: z.string().min(1).optional(),
        tournamentId: z.string().min(1).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      }).parse(req.query);

      const result = await matchService.listMatches({
        ...query,
        userId: req.query.mine === 'true' ? req.user?.sub : undefined,
      } as any);
      res.json(result);
    } catch (err) { next(err); }
  }

  async updateMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = z.object({
        title: z.string().max(120).optional(),
        description: z.string().max(500).optional(),
        venueName: z.string().max(120).optional(),
        scheduledAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
        dlsTarget: z.number().int().optional(),
        isPublic: z.boolean().optional(),
      }).parse(req.body);
      const match = await matchService.updateMatch(req.params.id, data);
      res.json(match);
    } catch (err) { next(err); }
  }

  async deleteMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await matchService.deleteMatch(req.params.id);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  async recordToss(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = z.object({
        winnerTeamId: z.string().min(1),
        decision: z.enum(['BAT', 'BOWL']),
      }).parse(req.body);
      const toss = await matchService.recordToss(req.params.id, input);
      res.json(toss);
    } catch (err) { next(err); }
  }

  async setPlayingXI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = z.object({
        teamId: z.string().min(1),
        playerIds: z.array(z.string().min(1)).min(2).max(11),
      }).parse(req.body);
      const result = await matchService.setPlayingXI(req.params.id, input);
      res.json(result);
    } catch (err) { next(err); }
  }

  async startInnings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = z.object({
        battingTeamId: z.string().min(1),
        bowlingTeamId: z.string().min(1),
        openingBatsmanIds: z.tuple([z.string().min(1), z.string().min(1)]),
        openingBowlerId: z.string().min(1),
      }).parse(req.body);
      const innings = await matchService.startInnings(req.params.id, input);
      res.json(innings);
    } catch (err) { next(err); }
  }

  async completeMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchService.completeMatch(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getNearbyMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = z.object({
        lat: z.coerce.number(),
        lng: z.coerce.number(),
        radius: z.coerce.number().default(50),
        status: z.string().optional(),
      }).parse(req.query);
      const matches = await matchService.getNearbyMatches({
        latitude: query.lat,
        longitude: query.lng,
        radiusKm: query.radius,
        status: query.status as any,
      });
      res.json(matches);
    } catch (err) { next(err); }
  }

  async getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '20' } = req.query;
      const result = await matchService.getMatchFeed(
        req.user!.sub,
        parseInt(page as string),
        parseInt(limit as string)
      );
      res.json(result);
    } catch (err) { next(err); }
  }

  async likeMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchService.likeMatch(req.params.id, req.user!.sub);
      res.json(result);
    } catch (err) { next(err); }
  }

  async unlikeMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchService.unlikeMatch(req.params.id, req.user!.sub);
      res.json(result);
    } catch (err) { next(err); }
  }

  async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { content } = z.object({ content: z.string().min(1).max(500) }).parse(req.body);
      const comment = await matchService.addComment(req.params.id, req.user!.sub, content);
      res.status(201).json(comment);
    } catch (err) { next(err); }
  }

  async getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '20' } = req.query;
      const result = await matchService.getComments(req.params.id, parseInt(page as string), parseInt(limit as string));
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const matchController = new MatchController();
