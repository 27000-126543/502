const ELEMENTS = {
  FIRE: { id: 'fire', name: '火', color: '#ff4444', basePower: 100 },
  WATER: { id: 'water', name: '水', color: '#4488ff', basePower: 90 },
  EARTH: { id: 'earth', name: '土', color: '#aa8844', basePower: 110 },
  WIND: { id: 'wind', name: '风', color: '#44ffaa', basePower: 80 },
  LIGHT: { id: 'light', name: '光', color: '#ffff88', basePower: 95 },
  DARK: { id: 'dark', name: '暗', color: '#aa44ff', basePower: 105 },
  THUNDER: { id: 'thunder', name: '雷', color: '#ffff00', basePower: 115 },
  ICE: { id: 'ice', name: '冰', color: '#88ddff', basePower: 85 }
};

const RARITY = {
  COMMON: { id: 'common', name: '普通', multiplier: 1, color: '#aaaaaa' },
  UNCOMMON: { id: 'uncommon', name: '稀有', multiplier: 1.5, color: '#44aa44' },
  RARE: { id: 'rare', name: '珍贵', multiplier: 2.5, color: '#4488ff' },
  EPIC: { id: 'epic', name: '史诗', multiplier: 4, color: '#aa44ff' },
  LEGENDARY: { id: 'legendary', name: '传说', multiplier: 7, color: '#ffaa00' }
};

const RESONANCE_PAIRS = {
  'FIRE-WIND': { name: '烈焰风暴', powerBoost: 1.5, triggerChance: 0.6 },
  'WATER-ICE': { name: '极寒领域', powerBoost: 1.4, triggerChance: 0.55 },
  'THUNDER-LIGHT': { name: '神圣制裁', powerBoost: 1.6, triggerChance: 0.5 },
  'EARTH-DARK': { name: '幽冥深渊', powerBoost: 1.45, triggerChance: 0.5 },
  'FIRE-THUNDER': { name: '天雷地火', powerBoost: 1.55, triggerChance: 0.55 },
  'WATER-WIND': { name: '飓风怒涛', powerBoost: 1.35, triggerChance: 0.5 },
  'LIGHT-DARK': { name: '阴阳交融', powerBoost: 2.0, triggerChance: 0.4 },
  'EARTH-FIRE': { name: '熔岩喷发', powerBoost: 1.45, triggerChance: 0.55 }
};

const SEASON_RANKS = [
  { id: 'BRONZE', name: '青铜', minPoints: 0, maxPoints: 799, color: '#cd7f32', protectLoss: 0.3, minDeduct: 5 },
  { id: 'SILVER', name: '白银', minPoints: 800, maxPoints: 1199, color: '#c0c0c0', protectLoss: 0.2, minDeduct: 8 },
  { id: 'GOLD', name: '黄金', minPoints: 1200, maxPoints: 1599, color: '#ffd700', protectLoss: 0.1, minDeduct: 10 },
  { id: 'PLATINUM', name: '铂金', minPoints: 1600, maxPoints: 1999, color: '#e5e4e2', protectLoss: 0.05, minDeduct: 12 },
  { id: 'DIAMOND', name: '钻石', minPoints: 2000, maxPoints: 2499, color: '#b9f2ff', protectLoss: 0, minDeduct: 15 },
  { id: 'MASTER', name: '大师', minPoints: 2500, maxPoints: 999999, color: '#ff6b6b', protectLoss: 0, minDeduct: 20 }
];

const SEASON_END_TIMESTAMP = Date.now() + 30 * 24 * 60 * 60 * 1000;

module.exports = { ELEMENTS, RARITY, RESONANCE_PAIRS, SEASON_RANKS, SEASON_END_TIMESTAMP };
