const { v4: uuidv4 } = require('uuid');
const { ELEMENTS, RARITY } = require('./constants');

class GameState {
  constructor() {
    this.players = new Map();
    this.runes = new Map();
    this.arrays = new Map();
    this.guilds = new Map();
    this.trades = new Map();
    this.tradeHistory = [];
    this.arrayTrades = new Map();
    this.arrayTradeHistory = [];
    this.battles = new Map();
    this.battleReports = new Map();
    this.matchQueue = [];
    this.announcements = [];
    this.runeStorm = null;
    this.weeklyStats = {
      runeUsage: {},
      battleResults: [],
      priceHistory: {}
    };
    this.onlinePlayers = new Set();
    this.initSampleData();
  }

  initSampleData() {
    const elementKeys = Object.keys(ELEMENTS);
    const rarityKeys = Object.keys(RARITY);

    for (let i = 0; i < 20; i++) {
      const elementKey = elementKeys[Math.floor(Math.random() * elementKeys.length)];
      const rarityKey = rarityKeys[Math.floor(Math.random() * rarityKeys.length)];
      this.createRune(elementKey, rarityKey);
    }

    const player1 = this.createPlayer('符文大师', 'player1');
    const player2 = this.createPlayer('阵法师', 'player2');
    const player3 = this.createPlayer('魔导士', 'player3');

    [player1, player2, player3].forEach(player => {
      for (let i = 0; i < 15; i++) {
        const elementKey = elementKeys[Math.floor(Math.random() * elementKeys.length)];
        const rarityKey = rarityKeys[Math.floor(Math.random() * (Math.min(3, rarityKeys.length)))];
        const rune = this.createRune(elementKey, rarityKey);
        this.addRuneToPlayer(player.id, rune.id);
      }
      player.coins = 10000 + Math.floor(Math.random() * 50000);
    });

    const guild = this.createGuild('符文圣殿', player1.id);
    this.joinGuild(player2.id, guild.id);
  }

  createPlayer(name, socketId) {
    const id = uuidv4();
    const player = {
      id,
      name,
      socketId,
      level: 1,
      exp: 0,
      coins: 5000,
      runeIds: [],
      arrayIds: [],
      guildId: null,
      guildContribution: 0,
      battlePoints: 1000,
      battleWins: 0,
      battleLosses: 0,
      currentBattleId: null,
      researchSpeedBonus: 0,
      craftBonus: 0,
      latestReportId: null,
      recentReportIds: [],
      createdAt: Date.now()
    };
    this.players.set(id, player);
    return player;
  }

  getPlayer(id) {
    return this.players.get(id);
  }

  getPlayerByName(name) {
    for (const player of this.players.values()) {
      if (player.name === name) return player;
    }
    return null;
  }

  createRune(elementKey, rarityKey) {
    const id = uuidv4();
    const element = ELEMENTS[elementKey];
    const rarity = RARITY[rarityKey];
    const rune = {
      id,
      element: elementKey,
      rarity: rarityKey,
      name: `${rarity.name}${element.name}符文`,
      power: Math.floor(element.basePower * rarity.multiplier * (0.9 + Math.random() * 0.2)),
      cooldown: 3000 + Math.floor(Math.random() * 5000),
      skill: this.generateRuneSkill(elementKey, rarityKey),
      ownerId: null,
      listedForSale: false,
      price: 0,
      createdAt: Date.now()
    };
    this.runes.set(id, rune);
    return rune;
  }

  generateRuneSkill(elementKey, rarityKey) {
    const element = ELEMENTS[elementKey];
    const rarity = RARITY[rarityKey];
    const skills = [
      { type: 'damage', name: `${element.name}之怒`, value: Math.floor(50 * rarity.multiplier) },
      { type: 'disrupt', name: '符文干扰', value: Math.floor(rarity.multiplier * 20) },
      { type: 'shield', name: `${element.name}之盾`, value: Math.floor(30 * rarity.multiplier) },
      { type: 'energy_boost', name: '能量涌动', value: Math.floor(rarity.multiplier * 15) }
    ];
    return skills[Math.floor(Math.random() * skills.length)];
  }

  getRune(id) {
    return this.runes.get(id);
  }

  addRuneToPlayer(playerId, runeId) {
    const player = this.players.get(playerId);
    const rune = this.runes.get(runeId);
    if (player && rune && !rune.ownerId) {
      rune.ownerId = playerId;
      player.runeIds.push(runeId);
      return true;
    }
    return false;
  }

  createArray(playerId, runeIds, name) {
    const player = this.players.get(playerId);
    if (!player) return null;
    const id = uuidv4();
    const array = {
      id,
      name: name || `阵法_${Date.now()}`,
      playerId,
      runeIds: [...runeIds],
      power: 0,
      range: 0,
      duration: 0,
      triggerChance: 0,
      resonance: null,
      backlash: null,
      createdAt: Date.now()
    };
    this.arrays.set(id, array);
    player.arrayIds.push(id);
    return array;
  }

  getArray(id) {
    return this.arrays.get(id);
  }

  saveArray(playerId, runeIds, name, result) {
    const player = this.players.get(playerId);
    if (!player) return null;
    const id = uuidv4();
    const runes = runeIds.map(rid => {
      const r = this.runes.get(rid);
      if (!r) return null;
      return {
        id: r.id,
        name: r.name,
        element: r.element,
        power: r.power,
        rarity: r.rarity
      };
    }).filter(Boolean);
    const array = {
      id,
      name: name || `阵法_${Date.now()}`,
      playerId,
      runeIds: [...runeIds],
      runes,
      power: result.power || 0,
      range: result.range || 0,
      duration: result.duration || 0,
      triggerChance: result.triggerChance || 0,
      resonance: result.resonance || null,
      backlash: result.backlash || null,
      elementDistribution: result.elementDistribution || {},
      totalRunes: runeIds.length,
      listedForSale: false,
      price: 0,
      source: 'created',
      originalOwnerId: playerId,
      createdAt: Date.now()
    };
    this.arrays.set(id, array);
    player.arrayIds.push(id);
    return array;
  }

  deleteArray(playerId, arrayId) {
    const player = this.players.get(playerId);
    const array = this.arrays.get(arrayId);
    if (!player || !array || array.playerId !== playerId) return false;
    if (array.listedForSale) {
      this.arrayTrades.delete(arrayId);
    }
    const idx = player.arrayIds.indexOf(arrayId);
    if (idx > -1) player.arrayIds.splice(idx, 1);
    this.arrays.delete(arrayId);
    return true;
  }

  listArrayForSale(playerId, arrayId, price) {
    const player = this.players.get(playerId);
    const array = this.arrays.get(arrayId);
    if (!player || !array || array.playerId !== playerId || price <= 0) return false;
    array.listedForSale = true;
    array.price = price;
    this.arrayTrades.set(arrayId, { arrayId, sellerId: playerId, price, listedAt: Date.now() });
    return true;
  }

  cancelArraySale(playerId, arrayId) {
    const player = this.players.get(playerId);
    const array = this.arrays.get(arrayId);
    if (!player || !array || array.playerId !== playerId) return false;
    array.listedForSale = false;
    array.price = 0;
    this.arrayTrades.delete(arrayId);
    return true;
  }

  buyArray(buyerId, arrayId) {
    const buyer = this.players.get(buyerId);
    const trade = this.arrayTrades.get(arrayId);
    const array = this.arrays.get(arrayId);
    if (!buyer || !trade || !array || buyer.coins < trade.price) return false;

    const seller = this.players.get(trade.sellerId);
    if (!seller) return false;

    buyer.coins -= trade.price;
    seller.coins += Math.floor(trade.price * 0.95);

    if (seller) {
      const idx = seller.arrayIds.indexOf(arrayId);
      if (idx > -1) seller.arrayIds.splice(idx, 1);
    }

    const newArrayId = uuidv4();
    const newArray = {
      ...array,
      id: newArrayId,
      playerId: buyerId,
      listedForSale: false,
      price: 0,
      source: 'purchased',
      originalOwnerId: array.originalOwnerId || array.playerId,
      createdAt: Date.now()
    };
    this.arrays.set(newArrayId, newArray);
    buyer.arrayIds.push(newArrayId);

    this.arrayTradeHistory.push({
      arrayId,
      totalRunes: array.totalRunes,
      power: array.power,
      price: trade.price,
      timestamp: Date.now()
    });

    this.arrayTrades.delete(arrayId);

    this.addAnnouncement(`🎉 ${buyer.name} 从 ${seller.name} 手中购买了阵法 ${array.name}！`);

    return true;
  }

  getArrayPriceSuggestion(array) {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const relevant = this.arrayTradeHistory.filter(t =>
      t.timestamp > sevenDaysAgo &&
      Math.abs(t.totalRunes - array.totalRunes) <= 2 &&
      Math.abs(t.power - array.power) < array.power * 0.5
    );
    if (relevant.length === 0) {
      const basePrice = Math.max(500, array.power * 2);
      return { min: Math.floor(basePrice * 0.8), max: Math.floor(basePrice * 1.2), avg: basePrice };
    }
    const prices = relevant.map(t => t.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { min: Math.floor(avg * 0.8), max: Math.floor(avg * 1.2), avg: Math.floor(avg) };
  }

  createGuild(name, founderId) {
    const founder = this.players.get(founderId);
    if (!founder || founder.guildId) return null;
    const id = uuidv4();
    const guild = {
      id,
      name,
      founderId,
      members: [founderId],
      level: 1,
      towerLevel: 1,
      workshopLevel: 1,
      materials: 0,
      coins: 0,
      totalContribution: 0,
      researchSpeedBonus: 5,
      craftBonus: 3,
      announcements: [],
      createdAt: Date.now()
    };
    this.guilds.set(id, guild);
    founder.guildId = id;
    founder.guildContribution = 0;
    founder.researchSpeedBonus = guild.researchSpeedBonus;
    founder.craftBonus = guild.craftBonus;
    return guild;
  }

  getGuild(id) {
    return this.guilds.get(id);
  }

  joinGuild(playerId, guildId) {
    const player = this.players.get(playerId);
    const guild = this.guilds.get(guildId);
    if (!player || !guild || player.guildId) return false;
    guild.members.push(playerId);
    player.guildId = guildId;
    player.researchSpeedBonus = guild.researchSpeedBonus;
    player.craftBonus = guild.craftBonus;
    return true;
  }

  contributeToGuild(playerId, materials, coins) {
    const player = this.players.get(playerId);
    if (!player || !player.guildId || player.coins < coins) return false;
    const guild = this.guilds.get(player.guildId);
    if (!guild) return false;
    player.coins -= coins;
    guild.coins += coins;
    guild.materials += materials;
    const contribution = materials + coins / 10;
    player.guildContribution += contribution;
    guild.totalContribution += contribution;
    return true;
  }

  upgradeGuildBuilding(playerId, building) {
    const player = this.players.get(playerId);
    if (!player || !player.guildId) return false;
    const guild = this.guilds.get(player.guildId);
    if (!guild) return false;

    const level = building === 'tower' ? guild.towerLevel : guild.workshopLevel;
    const matCost = level * 500;
    const coinCost = level * 10000;

    if (guild.materials < matCost || guild.coins < coinCost) return false;

    guild.materials -= matCost;
    guild.coins -= coinCost;

    if (building === 'tower') {
      guild.towerLevel++;
      guild.researchSpeedBonus += 3;
    } else {
      guild.workshopLevel++;
      guild.craftBonus += 2;
    }

    guild.members.forEach(mid => {
      const m = this.players.get(mid);
      if (m) {
        m.researchSpeedBonus = guild.researchSpeedBonus;
        m.craftBonus = guild.craftBonus;
      }
    });

    return true;
  }

  listRuneForSale(playerId, runeId, price) {
    const player = this.players.get(playerId);
    const rune = this.runes.get(runeId);
    if (!player || !rune || rune.ownerId !== playerId || price <= 0) return false;
    rune.listedForSale = true;
    rune.price = price;
    this.trades.set(runeId, { runeId, sellerId: playerId, price, listedAt: Date.now() });
    return true;
  }

  cancelRuneSale(playerId, runeId) {
    const player = this.players.get(playerId);
    const rune = this.runes.get(runeId);
    if (!player || !rune || rune.ownerId !== playerId) return false;
    rune.listedForSale = false;
    rune.price = 0;
    this.trades.delete(runeId);
    return true;
  }

  buyRune(buyerId, runeId) {
    const buyer = this.players.get(buyerId);
    const trade = this.trades.get(runeId);
    const rune = this.runes.get(runeId);
    if (!buyer || !trade || !rune || buyer.coins < trade.price) return false;

    const seller = this.players.get(trade.sellerId);
    if (!seller) return false;

    buyer.coins -= trade.price;
    seller.coins += Math.floor(trade.price * 0.95);

    if (seller) {
      const idx = seller.runeIds.indexOf(runeId);
      if (idx > -1) seller.runeIds.splice(idx, 1);
    }

    rune.ownerId = buyerId;
    rune.listedForSale = false;
    rune.price = 0;
    buyer.runeIds.push(runeId);

    this.tradeHistory.push({
      runeId,
      element: rune.element,
      rarity: rune.rarity,
      price: trade.price,
      timestamp: Date.now()
    });

    if (!this.weeklyStats.priceHistory[rune.element]) {
      this.weeklyStats.priceHistory[rune.element] = [];
    }
    this.weeklyStats.priceHistory[rune.element].push({ price: trade.price, timestamp: Date.now() });

    this.trades.delete(runeId);

    this.addAnnouncement(`🎉 ${buyer.name} 从 ${seller.name} 手中购买了 ${rune.name}！`);

    if (Math.random() < 0.15) {
      this.triggerRuneStorm(rune.element);
    }

    return true;
  }

  getPriceSuggestion(element, rarity) {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const rarityLow = rarity.toLowerCase();
    const elementLow = element.toLowerCase();
    const relevant = this.tradeHistory.filter(t =>
      t.element.toLowerCase() === elementLow && t.rarity.toLowerCase() === rarityLow && t.timestamp > sevenDaysAgo
    );
    if (relevant.length === 0) {
      const base = { common: 100, uncommon: 300, rare: 1000, epic: 5000, legendary: 25000 };
      const basePrice = base[rarityLow] || 100;
      return { min: Math.floor(basePrice * 0.8), max: Math.floor(basePrice * 1.2), avg: basePrice };
    }
    const prices = relevant.map(t => t.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { min: Math.floor(avg * 0.8), max: Math.floor(avg * 1.2), avg: Math.floor(avg) };
  }

  triggerRuneStorm(element) {
    const storm = {
      element,
      startTime: Date.now(),
      duration: 30 * 60 * 1000,
      powerMultiplier: 1.5
    };
    this.runeStorm = storm;
    this.addAnnouncement(`⚡ 符文风暴来袭！未来30分钟内 ${ELEMENTS[element].name}系阵法威力提升50%！`);
    setTimeout(() => {
      this.runeStorm = null;
      this.addAnnouncement('符文风暴已结束。');
    }, storm.duration);
  }

  addAnnouncement(text) {
    this.announcements.unshift({ text, timestamp: Date.now(), id: uuidv4() });
    if (this.announcements.length > 50) this.announcements.pop();
  }

  addToMatchQueue(playerId) {
    if (this.matchQueue.includes(playerId)) return false;
    if (this.players.get(playerId)?.currentBattleId) return false;
    this.matchQueue.push(playerId);
    return true;
  }

  removeFromMatchQueue(playerId) {
    const idx = this.matchQueue.indexOf(playerId);
    if (idx > -1) this.matchQueue.splice(idx, 1);
  }

  setPlayerOnline(playerId, socketId) {
    const player = this.players.get(playerId);
    if (player) {
      player.socketId = socketId;
      this.onlinePlayers.add(playerId);
    }
  }

  setPlayerOffline(playerId) {
    this.onlinePlayers.delete(playerId);
    this.removeFromMatchQueue(playerId);
  }

  recordBattleResult(winnerId, loserId, array1, array2, pointChange) {
    const winner = this.players.get(winnerId);
    const loser = this.players.get(loserId);
    if (winner && loser) {
      winner.battleWins++;
      loser.battleLosses++;
    }
    this.weeklyStats.battleResults.push({
      winnerId,
      loserId,
      timestamp: Date.now(),
      winnerArray: array1,
      loserArray: array2
    });

    [...(array1?.runeIds || []), ...(array2?.runeIds || [])].forEach(rid => {
      const rune = this.runes.get(rid);
      if (rune) {
        if (!this.weeklyStats.runeUsage[rune.element]) {
          this.weeklyStats.runeUsage[rune.element] = 0;
        }
        this.weeklyStats.runeUsage[rune.element]++;
      }
    });
  }

  createBattleReport(data) {
    const id = uuidv4();
    const report = {
      id,
      ...data,
      createdAt: Date.now()
    };
    this.battleReports.set(id, report);
    return id;
  }

  getBattleReport(id) {
    return this.battleReports.get(id);
  }
}

module.exports = new GameState();
