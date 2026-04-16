/**
 * API Service — Axios client with JWT token refresh
 * created_by: MyCricketScoreEngine_v1
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getItem, setItem, removeItem } from './storage';

export const BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://api.myscoreapp.com/api';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
};

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — inject access token ────────────────────────────────

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle 401, auto-refresh ─────────────────────────

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      await storeTokens(data.accessToken, data.refreshToken);

      refreshQueue.forEach(({ resolve }) => resolve(data.accessToken));
      refreshQueue = [];

      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      await clearTokens();

      const sessionError: any = new Error('Session expired. Please log in again.');
      sessionError.response = {
        status: 401,
        data: { error: 'Session expired. Please log in again.' },
      };

      refreshQueue.forEach(({ reject }) => reject(sessionError));
      refreshQueue = [];

      return Promise.reject(sessionError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─── Token storage helpers ────────────────────────────────────────────────────

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
    setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    removeItem(STORAGE_KEYS.ACCESS_TOKEN),
    removeItem(STORAGE_KEYS.REFRESH_TOKEN),
  ]);
}

export async function getStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(STORAGE_KEYS.ACCESS_TOKEN),
    getItem(STORAGE_KEYS.REFRESH_TOKEN),
  ]);
  return { accessToken, refreshToken };
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data: { email: string; username: string; name: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  googleAuth: (token: string, type: 'idToken' | 'accessToken' = 'accessToken') =>
    api.post('/auth/google', type === 'idToken' ? { idToken: token } : { accessToken: token }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  getMe: () =>
    api.get('/auth/me'),
  updateProfile: (data: Partial<{ name: string; username: string }>) =>
    api.patch('/auth/me', data),
};

export const matchAPI = {
  create: (data: object) => api.post('/matches', data),
  list: (params?: object) => api.get('/matches', { params }),
  get: (id: string) => api.get(`/matches/${id}`),
  update: (id: string, data: object) => api.patch(`/matches/${id}`, data),
  delete: (id: string) => api.delete(`/matches/${id}`),
  recordToss: (id: string, data: object) => api.post(`/matches/${id}/toss`, data),
  setPlayingXI: (id: string, data: object) => api.post(`/matches/${id}/playing-xi`, data),
  startInnings: (id: string, data: object) => api.post(`/matches/${id}/start-innings`, data),
  complete: (id: string) => api.post(`/matches/${id}/complete`),
  scorecard: (id: string) => api.get(`/matches/${id}/scorecard`),
  nearby: (params: { lat: number; lng: number; radius?: number }) => api.get('/matches/nearby', { params }),
  feed: (params?: object) => api.get('/matches/feed', { params }),
  like: (id: string) => api.post(`/matches/${id}/like`),
  unlike: (id: string) => api.delete(`/matches/${id}/like`),
  addComment: (id: string, content: string) => api.post(`/matches/${id}/comments`, { content }),
  getComments: (id: string) => api.get(`/matches/${id}/comments`),
  manhattan: (id: string) => api.get(`/matches/${id}/manhattan`),
  winProbability: (id: string) => api.get(`/matches/${id}/win-probability`),
};

export const inningsAPI = {
  processBall: (inningsId: string, data: object) => api.post(`/innings/${inningsId}/ball`, data),
  undoBall: (inningsId: string) => api.delete(`/innings/${inningsId}/ball`),
  endOver: (inningsId: string) => api.post(`/innings/${inningsId}/end-over`),
  declare: (inningsId: string) => api.post(`/innings/${inningsId}/declare`),
  wagonWheel: (inningsId: string, batsmanId?: string) =>
    api.get(`/innings/${inningsId}/wagon-wheel`, { params: { batsmanId } }),
  partnerships: (inningsId: string) => api.get(`/innings/${inningsId}/partnerships`),
};

export const teamAPI = {
  create: (data: object) => api.post('/teams', data),
  list: (params?: object) => api.get('/teams', { params }),
  get: (id: string) => api.get(`/teams/${id}`),
  update: (id: string, data: object) => api.patch(`/teams/${id}`, data),
  addPlayer: (id: string, data: object) => api.post(`/teams/${id}/players`, data),
  removePlayer: (id: string, playerId: string) => api.delete(`/teams/${id}/players/${playerId}`),
};

export const playerAPI = {
  create: (data: object) => api.post('/players', data),
  list: (params?: object) => api.get('/players', { params }),
  get: (id: string) => api.get(`/players/${id}`),
  update: (id: string, data: object) => api.patch(`/players/${id}`, data),
  history: (id: string) => api.get(`/players/${id}/history`),
};

export const tournamentAPI = {
  create: (data: object) => api.post('/tournaments', data),
  list: (params?: object) => api.get('/tournaments', { params }),
  get: (id: string) => api.get(`/tournaments/${id}`),
  addTeam: (id: string, teamId: string) => api.post(`/tournaments/${id}/teams`, { teamId }),
  removeTeam: (id: string, teamId: string) => api.delete(`/tournaments/${id}/teams/${teamId}`),
  leaderboard: (id: string) => api.get(`/tournaments/${id}/leaderboard`),
  matches: (id: string, params?: object) => api.get(`/tournaments/${id}/matches`, { params }),
};

export const analyticsAPI = {
  playerStats: (playerId: string) => api.get(`/analytics/players/${playerId}/stats`),
  playerForm: (playerId: string, n = 5) => api.get(`/analytics/players/${playerId}/form`, { params: { n } }),
  teamStats: (teamId: string) => api.get(`/analytics/teams/${teamId}/stats`),
  inningsBatting: (inningsId: string) => api.get(`/analytics/innings/${inningsId}/batting`),
  wagonWheel: (inningsId: string, batsmanId?: string) =>
    api.get(`/analytics/innings/${inningsId}/wagon-wheel`, { params: { batsmanId } }),
  manhattan: (matchId: string) => api.get(`/analytics/matches/${matchId}/manhattan`),
  winProbability: (matchId: string) => api.get(`/analytics/matches/${matchId}/win-probability`),
};

export default api;
