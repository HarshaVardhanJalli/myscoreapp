import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  name: z.string().min(1).max(80),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const tokens = await authService.register(input);
      res.status(201).json(tokens);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const tokens = await authService.login(input);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  }

  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken, accessToken } = z.object({
        idToken: z.string().optional(),
        accessToken: z.string().optional(),
      }).parse(req.body);
      if (!idToken && !accessToken) {
        res.status(400).json({ error: 'idToken or accessToken required' });
        return;
      }
      const tokens = await authService.googleAuth(idToken, accessToken);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  }

  // Called after passport.authenticate('google') succeeds via browser redirect flow.
  // Passport has already found/created the user (req.user).
  // Issues JWT tokens and deep-links back to the mobile app.
  async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.redirect('myscoreapp://auth?error=no_user');
        return;
      }
      const tokens = await authService.issueTokensForUser(req.user as any);
      const url = `myscoreapp://auth?accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: 'refreshToken required' });
        return;
      }
      const tokens = await authService.refreshTokens(refreshToken);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (req.user && refreshToken) {
        await authService.logout(req.user.sub, refreshToken);
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.sub);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = z.object({
        name: z.string().min(1).max(80).optional(),
        username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
      }).parse(req.body);
      const user = await authService.updateProfile(req.user!.sub, data);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
