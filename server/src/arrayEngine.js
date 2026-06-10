const gameState = require('./gameState');
const { ELEMENTS, RARITY, RESONANCE_PAIRS } = require('./constants');

const ELEMENT_COUNTER = {
  'fire': 'water',
  'water': 'fire',
  'earth': 'wind',
  'wind': 'earth',
  'thunder': 'ice',
  'ice': 'thunder',
  'light': 'dark',
  'dark': 'light'
};

function calculateArray(runeIds, playerId = null) {
  const runes = runeIds.map(id => gameState.getRune(id)).filter(Boolean);
  if (runes.length < 2) {
    return {
      error: '至少需要2个符文才能构成阵法',
      power: 0,
      range: 0,
      duration: 0,
      triggerChance: 0,
      resonance: null,
      backlash: null,
      elementDistribution: {}
    };
  }

  const elementCount = {};
  let totalPower = 0;
  let rarityMultiplier = 1;
  let sequenceBonus = 1;

  runes.forEach((rune, idx) => {
    const rarity = RARITY[rune.rarity];
    totalPower += rune.power * rarity.multiplier;
    rarityMultiplier *= (1 + (rarity.multiplier - 1) * 0.1);
    elementCount[rune.element] = (elementCount[rune.element] || 0) + 1;
  });

  const uniqueElements = Object.keys(elementCount).length;
  const diversityBonus = 1 + (uniqueElements - 1) * 0.05;

  for (let i = 0; i < runes.length - 1; i++) {
    const pair1 = `${runes[i].element}-${runes[i + 1].element}`;
    const pair2 = `${runes[i + 1].element}-${runes[i].element}`;
    if (RESONANCE_PAIRS[pair1] || RESONANCE_PAIRS[pair2]) {
      sequenceBonus *= 1.15;
    }
  }

  let power = Math.floor(totalPower * rarityMultiplier * diversityBonus * sequenceBonus);
  let range = 5 + runes.length * 3 + Object.keys(elementCount).length * 2;
  let duration = 30000 + runes.length * 10000;
  let triggerChance = 0.5 + runes.length * 0.05;

  const resonance = detectResonance(runes);
  if (resonance) {
    power = Math.floor(power * resonance.powerBoost);
    triggerChance += resonance.triggerChance * 0.3;
  }

  const backlash = detectBacklash(runes);
  if (backlash) {
    power = Math.floor(power * backlash.powerReduction);
    triggerChance = Math.max(0.1, triggerChance - backlash.chanceReduction);
  }

  if (playerId) {
    const player = gameState.getPlayer(playerId);
    if (player && player.craftBonus) {
      power = Math.floor(power * (1 + player.craftBonus / 100));
    }
  }

  if (gameState.runeStorm) {
    const stormElement = gameState.runeStorm.element;
    if (elementCount[stormElement]) {
      const stormRatio = elementCount[stormElement] / runes.length;
      power = Math.floor(power * (1 + (gameState.runeStorm.powerMultiplier - 1) * stormRatio));
    }
  }

  triggerChance = Math.min(0.95, Math.max(0.1, triggerChance));

  return {
    power,
    range,
    duration,
    triggerChance,
    resonance,
    backlash,
    elementDistribution: elementCount,
    totalRunes: runes.length
  };
}

function detectResonance(runes) {
  const pairs = [];
  for (let i = 0; i < runes.length - 1; i++) {
    for (let j = i + 1; j < runes.length; j++) {
      const pair1 = `${runes[i].element}-${runes[j].element}`;
      const pair2 = `${runes[j].element}-${runes[i].element}`;
      if (RESONANCE_PAIRS[pair1]) {
        pairs.push({ ...RESONANCE_PAIRS[pair1], key: pair1 });
      } else if (RESONANCE_PAIRS[pair2]) {
        pairs.push({ ...RESONANCE_PAIRS[pair2], key: pair2 });
      }
    }
  }

  if (pairs.length === 0) return null;

  const best = pairs.reduce((a, b) =>
    (a.triggerChance > b.triggerChance ? a : b)
  );

  const actualTrigger = Math.random() < best.triggerChance;
  if (!actualTrigger) return null;

  return {
    name: best.name,
    powerBoost: best.powerBoost,
    triggerChance: best.triggerChance,
    triggered: true
  };
}

function detectBacklash(runes) {
  let counterPairs = 0;
  const elements = runes.map(r => r.element);

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      if (ELEMENT_COUNTER[elements[i]] === elements[j]) {
        counterPairs++;
      }
    }
  }

  if (counterPairs === 0) return null;

  const chance = counterPairs * 0.15;
  const actualTrigger = Math.random() < chance;
  if (!actualTrigger) return null;

  return {
    name: '元素反噬',
    powerReduction: 1 - counterPairs * 0.15,
    chanceReduction: counterPairs * 0.1,
    triggered: true
  };
}

function calculateArrayScore(arrayResult) {
  if (!arrayResult || !arrayResult.power) return 0;
  return Math.floor(
    arrayResult.power * 1 +
    arrayResult.range * 10 +
    (arrayResult.duration / 1000) * 5 +
    arrayResult.triggerChance * 500
  );
}

function synthesizeRunes(runeIds, playerId) {
  const runes = runeIds.map(id => gameState.getRune(id)).filter(Boolean);
  if (runes.length < 3) return { success: false, error: '合成需要至少3个符文' };

  const player = gameState.getPlayer(playerId);
  if (!player) return { success: false, error: '玩家不存在' };

  const allOwned = runes.every(r => r.ownerId === playerId);
  if (!allOwned) return { success: false, error: '符文不属于该玩家' };

  const totalRarity = runes.reduce((sum, r) => sum + RARITY[r.rarity].multiplier, 0);
  const avgRarity = totalRarity / runes.length;
  const elementCount = {};
  runes.forEach(r => {
    elementCount[r.element] = (elementCount[r.element] || 0) + 1;
  });

  const dominantElement = Object.entries(elementCount)
    .sort((a, b) => b[1] - a[1])[0][0];

  let targetRarity;
  const baseChance = 0.3 + (player.craftBonus || 0) / 100;
  if (avgRarity >= 4 && Math.random() < baseChance * 0.1) {
    targetRarity = 'LEGENDARY';
  } else if (avgRarity >= 2.5 && Math.random() < baseChance * 0.3) {
    targetRarity = 'EPIC';
  } else if (avgRarity >= 1.5 && Math.random() < baseChance * 0.5) {
    targetRarity = 'RARE';
  } else if (Math.random() < baseChance) {
    targetRarity = 'UNCOMMON';
  } else {
    targetRarity = 'COMMON';
  }

  runes.forEach(r => {
    const owner = gameState.getPlayer(r.ownerId);
    if (owner) {
      const idx = owner.runeIds.indexOf(r.id);
      if (idx > -1) owner.runeIds.splice(idx, 1);
    }
    gameState.runes.delete(r.id);
  });

  const newRune = gameState.createRune(dominantElement.toUpperCase(), targetRarity);
  gameState.addRuneToPlayer(playerId, newRune.id);

  return { success: true, rune: newRune };
}

module.exports = {
  calculateArray,
  calculateArrayScore,
  synthesizeRunes,
  detectResonance,
  detectBacklash
};
