import { Router } from 'express';
import { matchController } from '../controllers/matchController';
import { scoringController } from '../controllers/scoringController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// Match CRUD
router.post('/', authenticate, (req, res, next) => matchController.createMatch(req, res, next));
router.get('/nearby', (req, res, next) => matchController.getNearbyMatches(req, res, next));
router.get('/feed', authenticate, (req, res, next) => matchController.getFeed(req, res, next));
router.get('/', optionalAuth, (req, res, next) => matchController.listMatches(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => matchController.getMatch(req, res, next));
router.patch('/:id', authenticate, (req, res, next) => matchController.updateMatch(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => matchController.deleteMatch(req, res, next));

// Match setup
router.post('/:id/toss', authenticate, (req, res, next) => matchController.recordToss(req, res, next));
router.post('/:id/playing-xi', authenticate, (req, res, next) => matchController.setPlayingXI(req, res, next));
router.post('/:id/start-innings', authenticate, (req, res, next) => matchController.startInnings(req, res, next));
router.post('/:id/complete', authenticate, (req, res, next) => matchController.completeMatch(req, res, next));

// Scoring (uses matchId or inningsId depending on endpoint)
router.get('/:matchId/scorecard', optionalAuth, (req, res, next) => scoringController.getLiveScorecard(req, res, next));
router.get('/:matchId/manhattan', optionalAuth, (req, res, next) => scoringController.getManhattan(req, res, next));
router.get('/:matchId/win-probability', optionalAuth, (req, res, next) => scoringController.getWinProbability(req, res, next));

// Social
router.post('/:id/like', authenticate, (req, res, next) => matchController.likeMatch(req, res, next));
router.delete('/:id/like', authenticate, (req, res, next) => matchController.unlikeMatch(req, res, next));
router.post('/:id/comments', authenticate, (req, res, next) => matchController.addComment(req, res, next));
router.get('/:id/comments', optionalAuth, (req, res, next) => matchController.getComments(req, res, next));

export default router;
