import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { analyticsService } from '../services/analyticsService';

const prisma = new PrismaClient();

const createTournamentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  format: z.enum(['LEAGUE', 'KNOCKOUT', 'ROUND_ROBIN', 'DOUBLE_ELIMINATION']).default('ROUND_ROBIN'),
  matchType: z.enum(['T10', 'T20', 'ODI', 'TEST', 'CUSTOM']).default('T20'),
  oversPerInnings: z.number().int().min(1).max(100).default(20),
  startDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  endDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  isPublic: z.boolean().default(true),
});

export class TournamentController {
  async createTournament(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createTournamentSchema.parse(req.body);
      const tournament = await prisma.tournament.create({
        data: { ...data, createdBy: req.user!.sub },
      });
      res.status(201).json(tournament);
    } catch (err) { next(err); }
  }

  async getTournament(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tournament = await prisma.tournament.findUniqueOrThrow({
        where: { id: req.params.id },
        include: {
          teams: {
            include: { team: { select: { id: true, name: true, shortName: true, logoUrl: true } } },
            orderBy: [{ points: 'desc' }, { nrr: 'desc' }],
          },
          _count: { select: { matches: true } },
        },
      });
      res.json(tournament);
    } catch (err) { next(err); }
  }

  async listTournaments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const where: any = { deletedAt: null, isPublic: true };
      if (status) where.status = status;

      const [tournaments, total] = await Promise.all([
        prisma.tournament.findMany({
          where,
          skip,
          take: parseInt(limit as string),
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { teams: true, matches: true } } },
        }),
        prisma.tournament.count({ where }),
      ]);
      res.json({ tournaments, pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string) } });
    } catch (err) { next(err); }
  }

  async addTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { teamId } = z.object({ teamId: z.string().min(1) }).parse(req.body);
      const tournament = await prisma.tournament.findUniqueOrThrow({ where: { id: req.params.id } });
      if (tournament.createdBy !== req.user!.sub && req.user!.role !== 'ADMIN') {
        throw new AppError(403, 'Not authorized');
      }
      const tt = await prisma.tournamentTeam.create({
        data: { tournamentId: req.params.id, teamId },
        include: { team: true },
      });
      res.status(201).json(tt);
    } catch (err) { next(err); }
  }

  async removeTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prisma.tournamentTeam.delete({
        where: { tournamentId_teamId: { tournamentId: req.params.id, teamId: req.params.teamId } },
      });
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaderboard = await analyticsService.getTournamentLeaderboard(req.params.id);
      res.json(leaderboard);
    } catch (err) { next(err); }
  }

  async getTournamentMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const [matches, total] = await Promise.all([
        prisma.match.findMany({
          where: { tournamentId: req.params.id },
          skip,
          take: parseInt(limit as string),
          orderBy: { scheduledAt: 'asc' },
          include: {
            team1: { select: { id: true, name: true, shortName: true } },
            team2: { select: { id: true, name: true, shortName: true } },
            innings: { select: { inningsNumber: true, totalRuns: true, wickets: true, state: true } },
          },
        }),
        prisma.match.count({ where: { tournamentId: req.params.id } }),
      ]);
      res.json({ matches, pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string) } });
    } catch (err) { next(err); }
  }
}

export const tournamentController = new TournamentController();
