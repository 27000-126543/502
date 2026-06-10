const gameState = require('./server/src/gameState');
const { RARITY, SEASON_RANKS } = require('./server/src/constants');
const { calculateArray } = require('./server/src/arrayEngine');

console.log('创建模拟数据开始...');

// 1. 创建几个玩家用于排行榜
const playerNames = ['符文大师', '魔导士阿明', '星辰法师', '烈焰使者', '冰霜女王'];
const ranksWithPoints = [
  ['BRONZE', 500], ['SILVER', 900], ['GOLD', 1400], 
  ['PLATINUM', 1700], ['DIAMOND', 2100], ['MASTER', 2600]
];
const players = [];
for (let i = 0; i < playerNames.length; i++) {
  const p = gameState.createPlayer(playerNames[i], null);
  const [rank, pts] = ranksWithPoints[i % ranksWithPoints.length];
  p.battlePoints = pts;
  p.wins = Math.floor(Math.random() * 50) + 10;
  p.losses = Math.floor(Math.random() * 40) + 5;
  p.coins = 10000 + Math.floor(Math.random() * 50000);
  // 每个玩家给8个符文
  for (let j = 0; j < 8; j++) {
    const els = ['FIRE','WATER','EARTH','WIND','THUNDER','ICE','LIGHT','DARK'];
    const rars = ['COMMON','COMMON','UNCOMMON','UNCOMMON','RARE','EPIC'];
    const rune = gameState.createRune(els[j % 8], rars[Math.floor(Math.random() * rars.length)]);
    gameState.addRuneToPlayer(p.id, rune.id);
  }
  players.push(p);
}
console.log('✓ 创建了', players.length, '个排行榜玩家');

// 2. 给测试玩家A创建并保存一个自建阵法 (source='created')，再创建一个"买来的"阵法 (source='purchased')
const buyer = gameState.createPlayer('阵法收藏家', null);
for (let j = 0; j < 12; j++) {
  const els = ['FIRE','WATER','EARTH','WIND','THUNDER','ICE','LIGHT','DARK'];
  const rune = gameState.createRune(els[j % 8], ['COMMON','UNCOMMON','RARE','EPIC'][j%4]);
  gameState.addRuneToPlayer(buyer.id, rune.id);
}

// 3. 自建阵法：光+暗=LIGHT-DARK阴阳交融
const selfIds = buyer.runeIds.filter(id => {
  const r = gameState.getRune(id); return r.element === 'LIGHT' || r.element === 'DARK';
}).slice(0, 3);
if (selfIds.length >= 2) {
  const selfResult = calculateArray(selfIds, buyer.id);
  gameState.saveArray(buyer.id, selfIds, '自建阴阳阵');
  console.log('✓ 自建阵法创建 (LIGHT+DARK, source=created)');
}

// 4. 买来的阵法：火+风=FIRE-WIND烈焰风暴（模拟购买场景）
const seller = gameState.createPlayer('原作者·烈焰', null);
const fireWindRunes = [];
for (let k = 0; k < 3; k++) {
  const rFire = gameState.createRune('FIRE', ['COMMON','RARE','EPIC'][k]);
  const rWind = gameState.createRune('WIND', ['COMMON','UNCOMMON','RARE'][k]);
  fireWindRunes.push(rFire.id, rWind.id);
  gameState.addRuneToPlayer(seller.id, rFire.id);
  gameState.addRuneToPlayer(seller.id, rWind.id);
}
// 卖家先保存
const savedArrId = gameState.saveArray(seller.id, fireWindRunes.slice(0,4), '烈焰风暴·原作');
const savedArr = gameState.getArray(savedArrId);
console.log('✓ 卖家保存的阵法:', savedArr?.name, 'source:', savedArr?.source);

// 模拟购买：buyArray
const buyResult = gameState.buyArray(savedArrId, buyer.id, 2500);
console.log('✓ buyArray 购买结果:', buyResult.success, buyResult.error || '');
const buyerArrs = (buyer.arrayIds || []).map(id => gameState.getArray(id));
console.log('✓ 买家阵法列表:');
buyerArrs.forEach(a => console.log('   -', a.name, '威力', a.power, 'source=', a.source, 'originalOwnerId exists:', !!a.originalOwnerId));

// 5. 生成阵图交易历史
const arrTradeSample = [
  { power: 500, totalRunes: 2, price: 2000 },
  { power: 520, totalRunes: 2, price: 2200 },
  { power: 480, totalRunes: 2, price: 1900 },
  { power: 550, totalRunes: 2, price: 2500 },
  { power: 530, totalRunes: 2, price: 2300 },
];
arrTradeSample.forEach(t => {
  gameState.arrayTradeHistory.push({
    id: 'hist_' + Math.random().toString(36).slice(2, 10),
    sellerId: players[Math.floor(Math.random() * players.length)].id,
    buyerId: players[Math.floor(Math.random() * players.length)].id,
    arrayId: 'arr_' + Math.random().toString(36).slice(2, 10),
    power: t.power,
    totalRunes: t.totalRunes,
    price: t.price,
    fee: Math.floor(t.price * 0.05),
    timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 3600 * 1000)
  });
});
console.log('✓ 阵图交易历史样本数:', gameState.arrayTradeHistory.length);

// 6. 上架一张阵图到交易市场
const listResult = gameState.listArrayForSale(savedArrId, seller.id, 3000);
console.log('✓ 阵图上架结果:', listResult.success, listResult.error || '');
console.log('✓ 在售阵图数:', gameState.arrayTrades.size);

// 打印测试玩家ID方便后续使用
console.log('\n=== 关键测试数据 ===');
console.log('买家ID (阵法收藏家):', buyer.id.slice(0, 10), '(有自建和买来的2个阵法)');
console.log('买家 arrayIds:', buyer.arrayIds);
buyerArrs.forEach(a => console.log('   ', a.id.slice(0,10), a.name, 'source='+a.source));
