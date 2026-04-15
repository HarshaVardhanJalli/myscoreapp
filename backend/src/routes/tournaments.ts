import { Router } from 'express';
import { tournamentController } from '../controllers/tournamentController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, (req, res, next) => tournamentController.createTournament(req, res, next));
router.get('/', optionalAuth, (req, res, next) => tournamentController.listTournaments(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => tournamentController.getTournament(req, res, next));
router.post('/:id/teams', authenticate, (req, res, next) => tournamentController.addTeam(req, res, next));
router.delete('/:id/teams/:teamId', authenticate, (req, res, next) => tournamentController.removeTeam(req, res, next));
router.get('/:id/leaderboard', optionalAuth, (req, res, next) => tournamentController.getLeaderboard(req, res, next));
router.get('/:id/matches', optionalAuth, (req, res, next) => tournamentController.getTournamentMatches(req, res, next));

export default router;
