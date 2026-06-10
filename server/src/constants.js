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
  'fire-wind': { name: '烈焰风暴', powerBoost: 1.5, triggerChance: 0.25 },
  'water-ice': { name: '极寒领域', powerBoost: 1.4, triggerChance: 0.22 },
  'thunder-light': { name: '神圣制裁', powerBoost: 1.6, triggerChance: 0.28 },
  'earth-dark': { name: '幽冥深渊', powerBoost: 1.45, triggerChance: 0.24 },
  'fire-thunder': { name: '天雷地火', powerBoost: 1.55, triggerChance: 0.26 },
  'water-wind': { name: '飓风怒涛', powerBoost: 1.35, triggerChance: 0.2 },
  'light-dark': { name: '阴阳交融', powerBoost: 2.0, triggerChance: 0.15 },
  'earth-fire': { name: '熔岩喷发', powerBoost: 1.45, triggerChance: 0.23 }
};

module.exports = { ELEMENTS, RARITY, RESONANCE_PAIRS };
