export interface Rune {
  id: string;
  element: string;
  rarity: string;
  name: string;
  power: number;
  cooldown: number;
  skill: {
    type: string;
    name: string;
    value: number;
  };
  ownerId: string | null;
  listedForSale: boolean;
  price: number;
  createdAt: number;
}

export interface ArrayResult {
  power: number;
  range: number;
  duration: number;
  triggerChance: number;
  resonance: {
    name: string;
    powerBoost: number;
    triggerChance: number;
    triggered: boolean;
  } | null;
  backlash: {
    name: string;
    powerReduction: number;
    chanceReduction: number;
    triggered: boolean;
  } | null;
  elementDistribution: Record<string, number>;
  totalRunes: number;
  error?: string;
}

export interface Player {
  id: string;
  name: string;
  level: number;
  exp: number;
  coins: number;
  runeIds: string[];
  arrayIds: string[];
  guildId: string | null;
  guildContribution: number;
  battlePoints: number;
  battleWins: number;
  battleLosses: number;
  currentBattleId: string | null;
  researchSpeedBonus: number;
  craftBonus: number;
  runes?: Rune[];
  arrays?: ArrayData[];
  guild?: Guild | null;
  radarData?: {
    indicators: string[];
    values: number[];
  };
}

export interface ArrayData {
  id: string;
  name: string;
  playerId: string;
  runeIds: string[];
  power: number;
  range: number;
  duration: number;
  triggerChance: number;
  resonance: any;
  backlash: any;
  createdAt: number;
}

export interface Guild {
  id: string;
  name: string;
  founderId: string;
  members: any[];
  level: number;
  towerLevel: number;
  workshopLevel: number;
  materials: number;
  coins: number;
  totalContribution: number;
  researchSpeedBonus: number;
  craftBonus: number;
}

export interface BattleState {
  battleId: string;
  phase: 'preparation' | 'fighting' | 'ended';
  me: BattlePlayer;
  opponent: BattlePlayer;
  events: BattleEvent[];
  startTime: number;
}

export interface BattlePlayer {
  id: string;
  name: string;
  energy: number;
  array: ArrayData | null;
  arrayResult: ArrayResult | null;
  ready: boolean;
  cooldowns: Record<string, number>;
  disrupted: number;
}

export interface BattleEvent {
  text: string;
  timestamp: number;
}

export interface TradeItem {
  runeId: string;
  sellerId: string;
  price: number;
  listedAt: number;
  rune: Rune;
  seller: { id: string; name: string };
}
