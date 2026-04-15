/**
 * WebSocket service — live match scoring via Socket.IO
 * created_by: MyCricketScoreEngine_v1
 */

import { io, Socket } from 'socket.io-client';
import { getItem } from './storage';

const WS_URL = __DEV__
  ? 'http://localhost:3000'
  : 'wss://api.myscoreapp.com';

const EVENTS = {
  JOIN_MATCH: 'join_match',
  LEAVE_MATCH: 'leave_match',
  BALL_SCORED: 'ball_scored',
  INNINGS_UPDATE: 'innings_update',
  OVER_COMPLETE: 'over_complete',
  INNINGS_COMPLETE: 'innings_complete',
  MATCH_COMPLETE: 'match_complete',
  SCORECARD_UPDATE: 'scorecard_update',
  WIN_PROBABILITY_UPDATE: 'win_probability_update',
  COMMENTARY: 'commentary',
  MILESTONE: 'milestone',
} as const;

type EventName = (typeof EVENTS)[keyof typeof EVENTS];

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private activeMatchId: string | null = null;

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const token = await getItem('access_token');

    this.socket = io(WS_URL, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected:', this.socket?.id);
      // Rejoin active match room after reconnect
      if (this.activeMatchId) {
        this.joinMatch(this.activeMatchId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    this.socket.on('error', (err) => {
      console.error('[WS] Error:', err);
    });
  }

  disconnect(): void {
    this.activeMatchId = null;
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }

  joinMatch(matchId: string): void {
    this.activeMatchId = matchId;
    this.socket?.emit(EVENTS.JOIN_MATCH, matchId);
  }

  leaveMatch(matchId: string): void {
    if (this.activeMatchId === matchId) this.activeMatchId = null;
    this.socket?.emit(EVENTS.LEAVE_MATCH, matchId);
  }

  on(event: EventName, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      this.socket?.on(event, (...args: any[]) => {
        this.listeners.get(event)?.forEach((cb) => cb(...args));
      });
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: EventName, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsService = new WebSocketService();
export { EVENTS };
export default wsService;
