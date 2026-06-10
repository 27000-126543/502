import axios from 'axios';
import type { Player, ArrayResult, Rune, TradeItem, Guild } from './types';

const api = axios.create({ baseURL: '/api' });

export const playerApi = {
  login: (name: string) => api.post<Player>('/player/login', { name }).then(r => r.data),
  get: (id: string) => api.get<Player>(`/player/${id}`).then(r => r.data),
  getByName: (name: string) => api.get<Player>(`/player/byname/${name}`).then(r => r.data)
};

export const runeApi = {
  get: (id: string) => api.get<Rune>(`/rune/${id}`).then(r => r.data)
};

export const arrayApi = {
  calculate: (runeIds: string[], playerId?: string) =>
    api.post<ArrayResult>('/array/calculate', { runeIds, playerId }).then(r => r.data),
  synthesize: (runeIds: string[], playerId: string) =>
    api.post<{ success: boolean; error?: string; rune?: Rune }>('/array/synthesize', { runeIds, playerId }).then(r => r.data),
  save: (playerId: string, runeIds: string[], name: string, result: ArrayResult) =>
    api.post<{ success: boolean; array: ArrayData }>('/array/save', { playerId, runeIds, name, result }).then(r => r.data),
  delete: (playerId: string, arrayId: string) =>
    api.post<{ success: boolean }>('/array/delete', { playerId, arrayId }).then(r => r.data)
};

export const tradeApi = {
  list: () => api.get<TradeItem[]>('/trades').then(r => r.data),
  getSuggestion: (element: string, rarity: string) =>
    api.get<{ min: number; max: number; avg: number }>(`/trades/price-suggestion?element=${element}&rarity=${rarity}`).then(r => r.data),
  listRune: (playerId: string, runeId: string, price: number) =>
    api.post<{ success: boolean }>('/trades/list', { playerId, runeId, price }).then(r => r.data),
  cancel: (playerId: string, runeId: string) =>
    api.post<{ success: boolean }>('/trades/cancel', { playerId, runeId }).then(r => r.data),
  buy: (buyerId: string, runeId: string) =>
    api.post<{ success: boolean }>('/trades/buy', { buyerId, runeId }).then(r => r.data),
  listArrays: () => api.get<any[]>('/trades/arrays').then(r => r.data),
  getArraySuggestion: (power: number, totalRunes: number) =>
    api.get<{ min: number; max: number; avg: number }>(`/trades/array/price-suggestion?power=${power}&totalRunes=${totalRunes}`).then(r => r.data),
  listArray: (playerId: string, arrayId: string, price: number) =>
    api.post<{ success: boolean }>('/trades/array/list', { playerId, arrayId, price }).then(r => r.data),
  cancelArray: (playerId: string, arrayId: string) =>
    api.post<{ success: boolean }>('/trades/array/cancel', { playerId, arrayId }).then(r => r.data),
  buyArray: (buyerId: string, arrayId: string) =>
    api.post<{ success: boolean }>('/trades/array/buy', { buyerId, arrayId }).then(r => r.data)
};

export const guildApi = {
  get: (id: string) => api.get<Guild>(`/guild/${id}`).then(r => r.data),
  create: (name: string, founderId: string) =>
    api.post<Guild>('/guild/create', { name, founderId }).then(r => r.data),
  join: (playerId: string, guildId: string) =>
    api.post<{ success: boolean }>('/guild/join', { playerId, guildId }).then(r => r.data),
  contribute: (playerId: string, materials: number, coins: number) =>
    api.post<{ success: boolean }>('/guild/contribute', { playerId, materials, coins }).then(r => r.data),
  upgrade: (playerId: string, building: 'tower' | 'workshop') =>
    api.post<{ success: boolean }>('/guild/upgrade', { playerId, building }).then(r => r.data)
};

export const statsApi = {
  weekly: () => api.get('/stats/weekly').then(r => r.data),
  leaderboard: () => api.get('/stats/leaderboard').then(r => r.data),
  report: () => api.get('/stats/report').then(r => r.data)
};

export const systemApi = {
  announcements: () => api.get<any[]>('/announcements').then(r => r.data),
  constants: () => api.get<{ ELEMENTS: any; RARITY: any; runeStorm: any }>('/constants').then(r => r.data)
};

export default api;
