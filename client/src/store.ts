import { create } from 'zustand';
import type { Player, BattleState } from './types';

interface AppState {
  player: Player | null;
  socket: any;
  battle: BattleState | null;
  currentView: string;
  setPlayer: (p: Player | null) => void;
  setSocket: (s: any) => void;
  setBattle: (b: BattleState | null) => void;
  setCurrentView: (v: string) => void;
  refreshPlayer: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  player: null,
  socket: null,
  battle: null,
  currentView: 'home',
  setPlayer: (p) => set({ player: p }),
  setSocket: (s) => set({ socket: s }),
  setBattle: (b) => set({ battle: b }),
  setCurrentView: (v) => set({ currentView: v }),
  refreshPlayer: async () => {
    const p = get().player;
    if (!p) return;
    const { playerApi } = await import('./api');
    const updated = await playerApi.get(p.id);
    set({ player: updated });
  }
}));
