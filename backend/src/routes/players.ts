import { Router } from 'express';
import { playerController } from '../controllers/playerController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, (req, res, next) => playerController.createPlayer(req, res, next));
router.get('/', (req, res, next) => playerController.listPlayers(req, res, next));
router.get('/:id', (req, res, next) => playerController.getPlayer(req, res, next));
router.patch('/:id', authenticate, (req, res, next) => playerController.updatePlayer(req, res, next));
router.get('/:id/history', (req, res, next) => playerController.getPlayerMatchHistory(req, res, next));

export default router;
