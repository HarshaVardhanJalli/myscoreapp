import { Router } from 'express';
import passport from 'passport';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', strictRateLimiter, (req, res, next) => authController.register(req, res, next));
router.post('/login', strictRateLimiter, (req, res, next) => authController.login(req, res, next));

// POST /auth/google — for id_token / access_token verification (existing mobile flow)
router.post('/google', (req, res, next) => authController.googleAuth(req, res, next));

// GET /auth/google/start — opens Google consent screen in the browser
// Mobile calls this via WebBrowser.openAuthSessionAsync()
router.get('/google/start', (req, res, next) =>
  passport.authenticate('google', { scope: ['email', 'profile'], session: false, prompt: 'select_account' } as any)(req, res, next)
);

// GET /auth/google/callback — Google redirects here after consent
// Issues JWT and deep-links back to the app
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: 'myscoreapp://auth?error=google_failed' }),
  (req, res, next) => authController.googleCallback(req, res, next)
);

router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
router.patch('/me', authenticate, (req, res, next) => authController.updateProfile(req, res, next));

export default router;
