import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { scoringEngine, WicketType } from '../services/scoringEngine';

const ballSchema = z.object({
  batsmanId: z.string().min(1),
  bowlerId: z.string().min(1),
  runs: z.number().int().min(0).max(6),
  isWide: z.boolean().default(false),
  isNoBall: z.boolean().default(false),
  isBye: z.boolean().default(false),
  isLegBye: z.boolean().default(false),
  isPenalty: z.boolean().default(false),
  isWicket: z.boolean().default(false),
  wicketType: z.nativeEnum(WicketType).optional(),
  dismissedPlayerId: z.string().min(1).optional(),
  fielderIds: z.array(z.string().min(1)).optional(),
  extraRuns: z.number().int().min(0).optional(),
  wagonWheelAngle: z.number().min(0).max(360).optional(),
  wagonWheelLength: z.number().min(0).max(1).optional(),
  commentary: z.string().max(300).optional(),
});

export class ScoringController {
  async processBall(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = ballSchema.parse(req.body);
      const result = await scoringEngine.processBall(req.params.inningsId, input);
      res.json(result);
    } catch (err) { next(err); }
  }

  async undoLastBall(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scoringEngine.undoLastBall(req.params.inningsId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async endOver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scoringEngine.endOver(req.params.inningsId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async declareInnings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await scoringEngine.declareInnings(req.params.inningsId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getLiveScorecard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const scorecard = await scoringEngine.getLiveScorecard(req.params.matchId);
      res.json(scorecard);
    } catch (err) { next(err); }
  }

  async getWagonWheel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await scoringEngine.getWagonWheel(req.params.inningsId, req.query.batsmanId as string);
      res.json(data);
    } catch (err) { next(err); }
  }

  async getManhattan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await scoringEngine.getManhattan(req.params.matchId);
      res.json(data);
    } catch (err) { next(err); }
  }

  async getPartnerships(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await scoringEngine.getPartnerships(req.params.inningsId);
      res.json(data);
    } catch (err) { next(err); }
  }

  async getWinProbability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await scoringEngine.getWinProbability(req.params.matchId);
      res.json(data);
    } catch (err) { next(err); }
  }
}

export const scoringController = new ScoringController();
