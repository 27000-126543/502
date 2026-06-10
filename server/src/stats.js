const gameState = require('./gameState');
const { ELEMENTS, RARITY } = require('./constants');

function getWeeklyStats() {
  const runeUsage = {};
  Object.keys(ELEMENTS).forEach(k => {
    runeUsage[k.toLowerCase()] = gameState.weeklyStats.runeUsage[k] || 0;
  });

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const battleResults = gameState.weeklyStats.battleResults.filter(b => b.timestamp > sevenDaysAgo);

  const dailyWins = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyWins[key] = { wins: 0, total: 0 };
  }

  battleResults.forEach(b => {
    const d = new Date(b.timestamp);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    if (dailyWins[key]) {
      dailyWins[key].total++;
      if (b.winnerId) dailyWins[key].wins++;
    }
  });

  const winRateCurve = Object.entries(dailyWins).map(([date, data]) => ({
    date,
    winRate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 50,
    total: data.total
  }));

  const priceTrends = {};
  Object.keys(ELEMENTS).forEach(k => {
    const key = k.toLowerCase();
    const history = gameState.weeklyStats.priceHistory[k] || [];
    const dailyPrices = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = `${d.getMonth() + 1}/${d.getDate()}`;
      dailyPrices[dateKey] = [];
    }
    history.forEach(p => {
      const d = new Date(p.timestamp);
      const dateKey = `${d.getMonth() + 1}/${d.getDate()}`;
      if (dailyPrices[dateKey]) dailyPrices[dateKey].push(p.price);
    });
    priceTrends[key] = Object.entries(dailyPrices).map(([date, prices]) => ({
      date,
      avg: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
    }));
  });

  return {
    runeUsage,
    winRateCurve,
    priceTrends,
    totalBattles: battleResults.length,
    generatedAt: Date.now()
  };
}

function getLeaderboards() {
  const players = Array.from(gameState.players.values());

  const byCollection = [...players]
    .map(p => ({
      id: p.id,
      name: p.name,
      value: p.runeIds.length,
      uniqueCount: new Set(p.runeIds.map(id => {
        const r = gameState.getRune(id);
        return r ? `${r.element}_${r.rarity}` : '';
      }).filter(Boolean)).size
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  const byBattlePoints = [...players]
    .map(p => ({
      id: p.id,
      name: p.name,
      value: p.battlePoints,
      wins: p.battleWins,
      losses: p.battleLosses
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  const guilds = Array.from(gameState.guilds.values());
  const byGuildContribution = guilds
    .map(g => ({
      id: g.id,
      name: g.name,
      value: Math.floor(g.totalContribution),
      members: g.members.length,
      level: g.level
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  return {
    runeCollection: byCollection,
    battlePoints: byBattlePoints,
    guildContribution: byGuildContribution
  };
}

function getPlayerArrayRadarData(playerId) {
  const player = gameState.getPlayer(playerId);
  if (!player) return null;

  const arrays = player.arrayIds.map(id => gameState.getArray(id)).filter(Boolean);
  if (arrays.length === 0) {
    return {
      indicators: ['威力', '范围', '持续', '触发率', '共鸣', '稳定性'],
      values: [0, 0, 0, 0, 0, 0]
    };
  }

  const sum = arrays.reduce((acc, a) => {
    acc.power += a.power || 0;
    acc.range += a.range || 0;
    acc.duration += (a.duration || 0) / 1000;
    acc.trigger += a.triggerChance || 0;
    acc.resonance += a.resonance ? 100 : 0;
    acc.stability += a.backlash ? 50 : 100;
    return acc;
  }, { power: 0, range: 0, duration: 0, trigger: 0, resonance: 0, stability: 0 });

  const count = arrays.length;
  const maxPower = 10000;
  const maxRange = 100;
  const maxDuration = 300;

  return {
    indicators: ['威力', '范围', '持续', '触发率', '共鸣', '稳定性'],
    values: [
      Math.min(100, Math.round((sum.power / count) / maxPower * 100)),
      Math.min(100, Math.round((sum.range / count) / maxRange * 100)),
      Math.min(100, Math.round((sum.duration / count) / maxDuration * 100)),
      Math.min(100, Math.round((sum.trigger / count) * 100)),
      Math.round(sum.resonance / count),
      Math.round(sum.stability / count)
    ]
  };
}

function generatePDFReport() {
  const stats = getWeeklyStats();
  const leaderboards = getLeaderboards();
  return {
    title: '符文研究周报',
    generatedAt: new Date().toLocaleString('zh-CN'),
    stats,
    leaderboards,
    summary: {
      totalBattles: stats.totalBattles,
      totalRunesUsed: Object.values(stats.runeUsage).reduce((a, b) => a + b, 0),
      topElement: Object.entries(stats.runeUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || 'fire',
      averageWinRate: stats.winRateCurve.length > 0
        ? Math.round(stats.winRateCurve.reduce((a, b) => a + b.winRate, 0) / stats.winRateCurve.length)
        : 50
    }
  };
}

module.exports = {
  getWeeklyStats,
  getLeaderboards,
  getPlayerArrayRadarData,
  generatePDFReport
};
