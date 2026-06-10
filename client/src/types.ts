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
  latestReportId: string | null;
  recentReportIds: string[];
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
  runes?: Array<{ id: string; name: string; element: string; power: number; rarity: string }>;
  power: number;
  range: number;
  duration: number;
  triggerChance: number;
  resonance: any;
  backlash: any;
  elementDistribution?: Record<string, number>;
  totalRunes?: number;
  listedForSale?: boolean;
  price?: number;
  source?: 'created' | 'purchased';
  originalOwnerId?: string;
  createdAt: number;
}

export interface ArrayTradeItem {
  arrayId: string;
  sellerId: string;
  price: number;
  listedAt: number;
  array: ArrayData;
  seller: { id: string; name: string };
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

export interface SeasonRank {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  protectLoss: number;
  minDeduct: number;
}

export interface SeasonInfo {
  ranks: SeasonRank[];
  seasonEndTimestamp: number;
  now: number;
}

export interface BattleReport {
  id: string;
  battleId: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  winnerId: string;
  player1Array: ArrayData | null;
  player2Array: ArrayData | null;
  player1ArrayResult: ArrayResult | null;
  player2ArrayResult: ArrayResult | null;
  events: BattleEvent[];
  energySnapshots: {
    t: number;
    p1: number;
    p2: number;
  }[];
  skillLogs: {
    timestamp: number;
    casterId: string;
    casterName: string;
    targetId: string;
    targetName: string;
    skillName: string;
    detail: string;
  }[];
  pointChange: {
    winAdd: number;
    loseDeduct: number;
  };
  rewards: {
    coins: number;
    rune?: Rune;
  };
  duration: number;
  timestamp: number;
  createdAt: number;
}

export interface RecentReportSummary {
  id: string;
  isWinner: boolean;
  opponentName: string;
  pointChange: number;
  duration: number;
  createdAt: number;
}

export interface ArrayPriceHistory {
  recent: any[];
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalSales: number;
}
