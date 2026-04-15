/**
 * Passport.js config — Google OAuth2 strategy
 * created_by: MyCricketScoreEngine_v1
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

export function setupPassport(): void {
  // JWT Strategy for API auth
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.jwt.accessSecret,
      },
      async (payload, done) => {
        try {
          const user = await prisma.user.findUnique({ where: { id: payload.sub } });
          if (!user || !user.isActive) return done(null, false);
          return done(null, { ...user, sub: user.id, iat: payload.iat, exp: payload.exp });
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  // Google OAuth2 Strategy
  if (config.google.clientId) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: config.google.callbackUrl,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email from Google'), false as any);

            let user = await prisma.user.findFirst({
              where: { OR: [{ googleId: profile.id }, { email }] },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email,
                  username: `${profile.displayName?.toLowerCase().replace(/\s+/g, '_') ?? 'user'}_${Date.now().toString(36)}`,
                  name: profile.displayName ?? email,
                  googleId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value,
                  isVerified: true,
                },
              });
            } else if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id, isVerified: true },
              });
            }

            return done(null, { ...user, sub: user.id, iat: 0, exp: 0 });
          } catch (err) {
            return done(err, false as any);
          }
        }
      )
    );
  }

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user ? { ...user, sub: user.id, iat: 0, exp: 0 } : null);
    } catch (err) {
      done(err, null);
    }
  });
}
