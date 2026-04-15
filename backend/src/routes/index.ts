import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import matchRoutes from './matches';
import inningsRoutes from './innings';
import teamRoutes from './teams';
import playerRoutes from './players';
import tournamentRoutes from './tournaments';
import analyticsRoutes from './analytics';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', tag: 'MyCricketScoreEngine_v1' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/matches', matchRoutes);
router.use('/innings', inningsRoutes);
router.use('/teams', teamRoutes);
router.use('/players', playerRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
