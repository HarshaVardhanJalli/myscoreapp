import { Router } from 'express';
import { scoringController } from '../controllers/scoringController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/:inningsId/ball', authenticate, (req, res, next) => scoringController.processBall(req, res, next));
router.delete('/:inningsId/ball', authenticate, (req, res, next) => scoringController.undoLastBall(req, res, next));
router.post('/:inningsId/end-over', authenticate, (req, res, next) => scoringController.endOver(req, res, next));
router.post('/:inningsId/declare', authenticate, (req, res, next) => scoringController.declareInnings(req, res, next));
router.get('/:inningsId/wagon-wheel', (req, res, next) => scoringController.getWagonWheel(req, res, next));
router.get('/:inningsId/partnerships', (req, res, next) => scoringController.getPartnerships(req, res, next));

export default router;
