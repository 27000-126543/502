const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const gameState = require('./gameState');
const BattleManager = require('./battleManager');
const { calculateArray, synthesizeRunes } = require('./arrayEngine');
const { getWeeklyStats, getLeaderboards, getPlayerArrayRadarData, generatePDFReport } = require('./stats');
const { ELEMENTS, RARITY } = require('./constants');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8
});

app.use(cors());
app.use(express.json());

const battleManager = new BattleManager(io);

setInterval(() => {
  battleManager.processMatchQueue();
}, 2000);

app.get('/api/player/:id', (req, res) => {
  const player = gameState.getPlayer(req.params.id);
  if (!player) return res.status(404).json({ error: '玩家不存在' });
  const runes = player.runeIds.map(id => gameState.getRune(id)).filter(Boolean);
  const arrays = player.arrayIds.map(id => gameState.getArray(id)).filter(Boolean);
  const guild = player.guildId ? gameState.getGuild(player.guildId) : null;
  res.json({
    ...player,
    runes,
    arrays,
    guild: guild ? {
      id: guild.id,
      name: guild.name,
      level: guild.level,
      towerLevel: guild.towerLevel,
      workshopLevel: guild.workshopLevel
    } : null,
    radarData: getPlayerArrayRadarData(player.id)
  });
});

app.post('/api/array/save', (req, res) => {
  const { playerId, runeIds, name, result } = req.body;
  if (!playerId || !runeIds || runeIds.length < 2) {
    return res.status(400).json({ error: '参数错误，至少需要2个符文' });
  }
  const array = gameState.saveArray(playerId, runeIds, name, result);
  if (!array) return res.status(400).json({ error: '保存失败' });
  res.json({ success: true, array });
});

app.post('/api/array/delete', (req, res) => {
  const { playerId, arrayId } = req.body;
  const success = gameState.deleteArray(playerId, arrayId);
  res.json({ success });
});

app.get('/api/trades/arrays', (req, res) => {
  const trades = Array.from(gameState.arrayTrades.values()).map(t => {
    const array = gameState.getArray(t.arrayId);
    const seller = gameState.getPlayer(t.sellerId);
    return {
      ...t,
      array,
      seller: seller ? { id: seller.id, name: seller.name } : null
    };
  });
  res.json(trades);
});

app.get('/api/trades/array/price-suggestion', (req, res) => {
  const { power, totalRunes } = req.query;
  const suggestion = gameState.getArrayPriceSuggestion({
    power: parseInt(power) || 1000,
    totalRunes: parseInt(totalRunes) || 4
  });
  res.json(suggestion);
});

app.post('/api/trades/array/list', (req, res) => {
  const { playerId, arrayId, price } = req.body;
  const success = gameState.listArrayForSale(playerId, arrayId, price);
  res.json({ success });
});

app.post('/api/trades/array/cancel', (req, res) => {
  const { playerId, arrayId } = req.body;
  const success = gameState.cancelArraySale(playerId, arrayId);
  res.json({ success });
});

app.post('/api/trades/array/buy', (req, res) => {
  const { buyerId, arrayId } = req.body;
  const success = gameState.buyArray(buyerId, arrayId);
  if (success) {
    io.emit('announcement', gameState.announcements[0]);
  }
  res.json({ success });
});

app.get('/api/player/byname/:name', (req, res) => {
  const player = gameState.getPlayerByName(req.params.name);
  if (!player) return res.status(404).json({ error: '玩家不存在' });
  res.json({ id: player.id, name: player.name });
});

app.post('/api/player/login', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '名称必填' });
  let player = gameState.getPlayerByName(name);
  if (!player) {
    player = gameState.createPlayer(name, null);
    const elements = Object.keys(ELEMENTS);
    const rarities = ['COMMON', 'COMMON', 'COMMON', 'UNCOMMON', 'UNCOMMON', 'RARE'];
    for (let i = 0; i < 8; i++) {
      const element = elements[Math.floor(Math.random() * elements.length)];
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];
      const rune = gameState.createRune(element, rarity);
      gameState.addRuneToPlayer(player.id, rune.id);
    }
  }
  const runes = player.runeIds.map(id => gameState.getRune(id)).filter(Boolean);
  const arrays = player.arrayIds.map(id => gameState.getArray(id)).filter(Boolean);
  const guild = player.guildId ? gameState.getGuild(player.guildId) : null;
  res.json({
    ...player,
    runes,
    arrays,
    guild: guild ? {
      id: guild.id,
      name: guild.name,
      level: guild.level
    } : null
  });
});

app.get('/api/rune/:id', (req, res) => {
  const rune = gameState.getRune(req.params.id);
  if (!rune) return res.status(404).json({ error: '符文不存在' });
  res.json(rune);
});

app.post('/api/array/calculate', (req, res) => {
  const { runeIds, playerId } = req.body;
  const result = calculateArray(runeIds, playerId);
  res.json(result);
});

app.post('/api/array/synthesize', (req, res) => {
  const { runeIds, playerId } = req.body;
  const result = synthesizeRunes(runeIds, playerId);
  res.json(result);
});

app.get('/api/trades', (req, res) => {
  const trades = Array.from(gameState.trades.values()).map(t => {
    const rune = gameState.getRune(t.runeId);
    const seller = gameState.getPlayer(t.sellerId);
    return {
      ...t,
      rune,
      seller: seller ? { id: seller.id, name: seller.name } : null
    };
  });
  res.json(trades);
});

app.get('/api/trades/price-suggestion', (req, res) => {
  const { element, rarity } = req.query;
  const suggestion = gameState.getPriceSuggestion(element.toUpperCase(), rarity.toUpperCase());
  res.json(suggestion);
});

app.post('/api/trades/list', (req, res) => {
  const { playerId, runeId, price } = req.body;
  const success = gameState.listRuneForSale(playerId, runeId, price);
  res.json({ success });
});

app.post('/api/trades/cancel', (req, res) => {
  const { playerId, runeId } = req.body;
  const success = gameState.cancelRuneSale(playerId, runeId);
  res.json({ success });
});

app.post('/api/trades/buy', (req, res) => {
  const { buyerId, runeId } = req.body;
  const success = gameState.buyRune(buyerId, runeId);
  if (success) {
    io.emit('announcement', gameState.announcements[0]);
  }
  res.json({ success });
});

app.get('/api/guild/:id', (req, res) => {
  const guild = gameState.getGuild(req.params.id);
  if (!guild) return res.status(404).json({ error: '公会不存在' });
  const members = guild.members.map(mid => {
    const p = gameState.getPlayer(mid);
    return p ? { id: p.id, name: p.name, contribution: p.guildContribution, level: p.level } : null;
  }).filter(Boolean);
  res.json({ ...guild, members });
});

app.post('/api/guild/create', (req, res) => {
  const { name, founderId } = req.body;
  const guild = gameState.createGuild(name, founderId);
  if (!guild) return res.status(400).json({ error: '创建失败' });
  res.json(guild);
});

app.post('/api/guild/join', (req, res) => {
  const { playerId, guildId } = req.body;
  const success = gameState.joinGuild(playerId, guildId);
  res.json({ success });
});

app.post('/api/guild/contribute', (req, res) => {
  const { playerId, materials, coins } = req.body;
  const success = gameState.contributeToGuild(playerId, materials, coins);
  res.json({ success });
});

app.post('/api/guild/upgrade', (req, res) => {
  const { playerId, building } = req.body;
  const success = gameState.upgradeGuildBuilding(playerId, building);
  res.json({ success });
});

app.get('/api/stats/weekly', (req, res) => {
  res.json(getWeeklyStats());
});

app.get('/api/stats/leaderboard', (req, res) => {
  res.json(getLeaderboards());
});

app.get('/api/stats/report', (req, res) => {
  res.json(generatePDFReport());
});

app.get('/api/announcements', (req, res) => {
  res.json(gameState.announcements);
});

app.get('/api/constants', (req, res) => {
  res.json({ ELEMENTS, RARITY, runeStorm: gameState.runeStorm });
});

io.on('connection', (socket) => {
  let currentPlayerId = null;

  socket.on('register_player', (playerId) => {
    const player = gameState.getPlayer(playerId);
    if (player) {
      currentPlayerId = playerId;
      gameState.setPlayerOnline(playerId, socket.id);
      socket.emit('registered', { success: true });
    }
  });

  socket.on('join_match_queue', (playerId) => {
    const success = gameState.addToMatchQueue(playerId);
    socket.emit('match_queue_status', { success, queuePosition: gameState.matchQueue.indexOf(playerId) + 1 });
  });

  socket.on('leave_match_queue', (playerId) => {
    gameState.removeFromMatchQueue(playerId);
    socket.emit('match_queue_status', { success: true, queuePosition: -1 });
  });

  socket.on('set_array', ({ playerId, runeIds, name }) => {
    const result = battleManager.setArray(playerId, runeIds, name);
    socket.emit('array_set_result', result);
  });

  socket.on('set_ready', ({ playerId, ready }) => {
    const result = battleManager.setReady(playerId, ready);
    socket.emit('ready_result', { success: result });
  });

  socket.on('activate_skill', ({ playerId, runeId, targetId }) => {
    const result = battleManager.activateRuneSkill(playerId, runeId, targetId);
    socket.emit('skill_result', result);
  });

  socket.on('chat', ({ playerId, message }) => {
    const player = gameState.getPlayer(playerId);
    if (player) {
      io.emit('chat_message', {
        id: Date.now(),
        playerId,
        playerName: player.name,
        message,
        timestamp: Date.now()
      });
    }
  });

  socket.on('disconnect', () => {
    if (currentPlayerId) {
      battleManager.playerDisconnect(currentPlayerId);
    }
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`符文阵法系统服务已启动，端口: ${PORT}`);
});
