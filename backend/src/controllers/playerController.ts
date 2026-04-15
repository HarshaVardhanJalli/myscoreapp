import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createPlayerSchema = z.object({
  name: z.string().min(1).max(80),
  shortName: z.string().max(20).optional(),
  dateOfBirth: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  nationality: z.string().max(50).optional(),
  role: z.enum(['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER']).default('ALL_ROUNDER'),
  battingStyle: z.enum(['RIGHT_HAND', 'LEFT_HAND']).optional(),
  bowlingStyle: z.enum([
    'RIGHT_ARM_FAST', 'RIGHT_ARM_MEDIUM', 'RIGHT_ARM_OFFBREAK', 'RIGHT_ARM_LEGBREAK',
    'LEFT_ARM_FAST', 'LEFT_ARM_MEDIUM', 'LEFT_ARM_ORTHODOX', 'LEFT_ARM_WRIST_SPIN',
  ]).optional(),
  jerseyNumber: z.number().int().min(0).max(999).optional(),
});

export class PlayerController {
  async createPlayer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createPlayerSchema.parse(req.body);
      const player = await prisma.player.create({ data });
      res.status(201).json(player);
    } catch (err) { next(err); }
  }

  async getPlayer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const player = await prisma.player.findUniqueOrThrow({
        where: { id: req.params.id },
        include: {
          teamPlayers: {
            where: { leftAt: null },
            include: { team: { select: { id: true, name: true, shortName: true } } },
          },
        },
      });
      res.json(player);
    } catch (err) { next(err); }
  }

  async listPlayers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, role, page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const where: any = {};
      if (search) where.name = { contains: search as string, mode: 'insensitive' };
      if (role) where.role = role;

      const [players, total] = await Promise.all([
        prisma.player.findMany({ where, skip, take: parseInt(limit as string), orderBy: { name: 'asc' } }),
        prisma.player.count({ where }),
      ]);
      res.json({ players, pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string) } });
    } catch (err) { next(err); }
  }

  async updatePlayer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createPlayerSchema.partial().parse(req.body);
      const player = await prisma.player.update({ where: { id: req.params.id }, data });
      res.json(player);
    } catch (err) { next(err); }
  }

  async getPlayerMatchHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '10' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [rows, total] = await Promise.all([
        prisma.inningsPlayer.findMany({
          where: { playerId: req.params.id },
          skip,
          take: parseInt(limit as string),
          orderBy: { innings: { createdAt: 'desc' } },
          include: {
            innings: {
              include: {
                match: {
                  select: {
                    id: true, title: true, matchType: true, status: true,
                    team1: { select: { name: true, shortName: true } },
                    team2: { select: { name: true, shortName: true } },
                  },
                },
              },
            },
          },
        }),
        prisma.inningsPlayer.count({ where: { playerId: req.params.id } }),
      ]);

      res.json({ history: rows, pagination: { total, page: parseInt(page as string), limit: parseInt(limit as string) } });
    } catch (err) { next(err); }
  }
}

export const playerController = new PlayerController();
