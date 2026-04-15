/**
 * WebSocket Live Scoring — real-time match updates via Socket.IO
 * created_by: MyCricketScoreEngine_v1
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from '../utils/logger';
import { JWTPayload } from '../middleware/auth';

// ─── Event types ──────────────────────────────────────────────────────────────

export const EVENTS = {
  // Client → Server
  JOIN_MATCH: 'join_match',
  LEAVE_MATCH: 'leave_match',
  SUBSCRIBE_INNINGS: 'subscribe_innings',

  // Server → Client
  BALL_SCORED: 'ball_scored',
  INNINGS_UPDATE: 'innings_update',
  OVER_COMPLETE: 'over_complete',
  INNINGS_COMPLETE: 'innings_complete',
  MATCH_COMPLETE: 'match_complete',
  SCORECARD_UPDATE: 'scorecard_update',
  WIN_PROBABILITY_UPDATE: 'win_probability_update',
  COMMENTARY: 'commentary',
  MILESTONE: 'milestone',
  ERROR: 'error',
} as const;

// ─── Setup ────────────────────────────────────────────────────────────────────

export function setupLiveScoring(io: SocketIOServer): void {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const payload = jwt.verify(token as string, config.jwt.accessSecret) as JWTPayload;
        (socket as any).user = payload;
      } catch {
        // unauthenticated viewers allowed; scoring requires auth (checked per-event)
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).user?.sub;
    logger.debug('Socket connected', { socketId: socket.id, userId });

    // Join a match room to receive live updates
    socket.on(EVENTS.JOIN_MATCH, (matchId: string) => {
      if (!matchId || typeof matchId !== 'string') return;
      socket.join(`match:${matchId}`);
      logger.debug('Joined match room', { socketId: socket.id, matchId });
      socket.emit('joined', { matchId });
    });

    socket.on(EVENTS.LEAVE_MATCH, (matchId: string) => {
      socket.leave(`match:${matchId}`);
    });

    socket.on(EVENTS.SUBSCRIBE_INNINGS, (inningsId: string) => {
      if (!inningsId || typeof inningsId !== 'string') return;
      socket.join(`innings:${inningsId}`);
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { socketId: socket.id });
    });

    socket.on('error', (err) => {
      logger.error('Socket error', { socketId: socket.id, err });
    });
  });
}

// ─── Emitters (called from scoring engine / controllers) ─────────────────────

let _io: SocketIOServer | null = null;

export function setIO(io: SocketIOServer): void {
  _io = io;
}

export function emitBallScored(matchId: string, inningsId: string, data: object): void {
  if (!_io) return;
  _io.to(`match:${matchId}`).emit(EVENTS.BALL_SCORED, data);
  _io.to(`innings:${inningsId}`).emit(EVENTS.BALL_SCORED, data);
}

export function emitInningsUpdate(matchId: string, inningsId: string, data: object): void {
  if (!_io) return;
  _io.to(`match:${matchId}`).emit(EVENTS.INNINGS_UPDATE, data);
}

export function emitOverComplete(matchId: string, data: object): void {
  if (!_io) return;
  _io.to(`match:${matchId}`).emit(EVENTS.OVER_COMPLETE, data);
}

export function emitInningsComplete(matchId: string, data: object): void {
  if (!_io) return;
  _io.to(`match:${matchId}`).emit(EVENTS.INNINGS_COMPLETE, data);
}

export function emitMatchComplete(matchId: string, data: object): void {
  if (!_io) return;
  _io.to(`match:${matchId}`).emit(EVENTS.MATCH_COMPLETE, data);
}

export function emitScorecard(matchId: string, data: object): void {
  if (!_io) return;
  _io.to(`match:${matchId}`).emit(EVENTS.SCORECARD_UPDATE, data);
}

export function emitWinProbability(matchId: string, data: object): void {
  if (!_io) return;
  _io.to(`match:${matchId}`).emit(EVENTS.WIN_PROBABILITY_UPDATE, data);
}

export function emitCommentary(matchId: string, commentary: string): void {
  if (!_io) return;
  _io.to(`match:${matchId}`).emit(EVENTS.COMMENTARY, { commentary, timestamp: new Date() });
}

export function emitMilestone(matchId: string, milestone: object): void {
  if (!_io) return;
  _io.to(`match:${matchId}`).emit(EVENTS.MILESTONE, milestone);
}

export function getRoomSize(matchId: string): number {
  if (!_io) return 0;
  return _io.sockets.adapter.rooms.get(`match:${matchId}`)?.size ?? 0;
}
