/**
 * Socket.IO handler setup — delegates to liveScoring module
 * created_by: MyCricketScoreEngine_v1
 */

import { Server as SocketIOServer } from 'socket.io';
import { setupLiveScoring, setIO } from './liveScoring';

export function setupSocketHandlers(io: SocketIOServer): void {
  setIO(io);
  setupLiveScoring(io);
}

export * from './liveScoring';
