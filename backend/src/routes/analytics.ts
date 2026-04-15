import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authenticate, requirePlan } from '../middleware/auth';

const router = Router();

// Free
router.get('/players/:playerId/stats', (req, res, next) => analyticsController.getPlayerStats(req, res, next));
router.get('/players/:playerId/form', (req, res, next) => analyticsController.getPlayerForm(req, res, next));
router.get('/teams/:teamId/stats', (req, res, next) => analyticsController.getTeamStats(req, res, next));

// Pro/Elite — advanced analytics
router.get('/innings/:inningsId/batting', authenticate, requirePlan('PRO', 'ELITE'), (req, res, next) =>
  analyticsController.getInningsBattingAnalytics(req, res, next));
router.get('/innings/:inningsId/wagon-wheel', authenticate, requirePlan('PRO', 'ELITE'), (req, res, next) =>
  analyticsController.getWagonWheel(req, res, next));
router.get('/matches/:matchId/manhattan', authenticate, requirePlan('PRO', 'ELITE'), (req, res, next) =>
  analyticsController.getManhattan(req, res, next));
router.get('/matches/:matchId/win-probability', (req, res, next) =>
  analyticsController.getWinProbability(req, res, next));

export default router;
