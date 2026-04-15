import { Router } from 'express';
import { teamController } from '../controllers/teamController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, (req, res, next) => teamController.createTeam(req, res, next));
router.get('/', (req, res, next) => teamController.listTeams(req, res, next));
router.get('/:id', (req, res, next) => teamController.getTeam(req, res, next));
router.patch('/:id', authenticate, (req, res, next) => teamController.updateTeam(req, res, next));
router.post('/:id/players', authenticate, (req, res, next) => teamController.addPlayer(req, res, next));
router.delete('/:id/players/:playerId', authenticate, (req, res, next) => teamController.removePlayer(req, res, next));

export default router;
