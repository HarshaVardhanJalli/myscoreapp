import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const createTeamSchema = z.object({
  name: z.string().min(1).max(80),
  shortName: z.string().min(2).max(5),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export class TeamController {
  async createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createTeamSchema.parse(req.body);
      const team = await prisma.team.create({
        data: { ...data, ownerId: req.user!.sub },
      });
      res.status(201).json(team);
    } catch (err) { next(err); }
  }

  async getTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const team = await prisma.team.findUniqueOrThrow({
        where: { id: req.params.id },
        include: {
          players: {
            include: { player: true },
            where: { leftAt: null },
          },
          _count: { select: { matchesAsTeam1: true, matchesAsTeam2: true } },
        },
      });
      res.json(team);
    } catch (err) { next(err); }
  }

  async listTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const where: any = { deletedAt: null };
      if (req.user?.sub) where.ownerId = req.user.sub;
      if (search) where.name = { contains: search as string, mode: 'insensitive' };

      const [teams, total] = await Promise.all([
        prisma.team.findMany({
          where,
          skip,
          take: parseInt(limit as string),
          orderBy: { name: 'asc' },
          include: { _count: { select: { players: true } } },
        }),
        prisma.team.count({ where }),
      ]);
      res.json({ teams, pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string) } });
    } catch (err) { next(err); }
  }

  async updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const team = await prisma.team.findUniqueOrThrow({ where: { id: req.params.id } });
      if (team.ownerId !== req.user!.sub && req.user!.role !== 'ADMIN') {
        throw new AppError(403, 'Not authorized to update this team');
      }
      const data = createTeamSchema.partial().parse(req.body);
      const updated = await prisma.team.update({ where: { id: req.params.id }, data });
      res.json(updated);
    } catch (err) { next(err); }
  }

  async addPlayer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { playerId, isCaptain, isViceCaptain } = z.object({
        playerId: z.string().min(1),
        isCaptain: z.boolean().default(false),
        isViceCaptain: z.boolean().default(false),
      }).parse(req.body);

      if (isCaptain) await prisma.teamPlayer.updateMany({ where: { teamId: req.params.id }, data: { isCaptain: false } });
      if (isViceCaptain) await prisma.teamPlayer.updateMany({ where: { teamId: req.params.id }, data: { isViceCaptain: false } });

      const tp = await prisma.teamPlayer.upsert({
        where: { teamId_playerId: { teamId: req.params.id, playerId } },
        update: { isCaptain, isViceCaptain, leftAt: null },
        create: { teamId: req.params.id, playerId, isCaptain, isViceCaptain },
        include: { player: true },
      });
      res.json(tp);
    } catch (err) { next(err); }
  }

  async removePlayer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prisma.teamPlayer.update({
        where: { teamId_playerId: { teamId: req.params.id, playerId: req.params.playerId } },
        data: { leftAt: new Date() },
      });
      res.json({ success: true });
    } catch (err) { next(err); }
  }
}

export const teamController = new TeamController();
