import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', strictRateLimiter, (req, res, next) => authController.register(req, res, next));
router.post('/login', strictRateLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/google', (req, res, next) => authController.googleAuth(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
router.patch('/me', authenticate, (req, res, next) => authController.updateProfile(req, res, next));

export default router;
