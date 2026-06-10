const gameState = require('./server/src/gameState');
const http = require('http');

const runesMap = gameState.runes;
console.log('Total runes in map:', runesMap.size);
const keys = Array.from(runesMap.keys());

// 按元素分类找共鸣对（火+风，水+冰，光+暗）
const byElement = {};
for (const k of keys) {
  const r = runesMap.get(k);
  if (!byElement[r.element]) byElement[r.element] = [];
  byElement[r.element].push(k);
}
console.log('By element:', Object.keys(byElement));

// 找火+风
const testResonance = () => {
  let ids = [];
  if (byElement.FIRE?.length && byElement.WIND?.length) {
    ids = [byElement.FIRE[0], byElement.WIND[0]];
    console.log('Test 共鸣: FIRE+WIND');
  } else if (byElement.WATER?.length && byElement.ICE?.length) {
    ids = [byElement.WATER[0], byElement.ICE[0]];
    console.log('Test 共鸣: WATER+ICE');
  } else if (byElement.LIGHT?.length && byElement.DARK?.length) {
    ids = [byElement.LIGHT[0], byElement.DARK[0]];
    console.log('Test 共鸣: LIGHT+DARK');
  } else {
    ids = keys.slice(0, 4);
    console.log('Test random:', ids.map(id=>runesMap.get(id).element).join('+'));
  }
  return ids;
};

// 找对立对
const testCounter = () => {
  let ids = [];
  const pairs = [['FIRE','WATER'],['LIGHT','DARK'],['EARTH','THUNDER']];
  for (const [a,b] of pairs) {
    if (byElement[a]?.length && byElement[b]?.length) {
      ids = [byElement[a][0], byElement[b][0]];
      console.log('Test 反噬:', a + '+' + b);
      break;
    }
  }
  if (!ids.length) {
    ids = keys.slice(0, 3);
    console.log('Test counter random');
  }
  return ids;
};

const runTest = (ids, label) => {
  return new Promise((resolve) => {
    const data = JSON.stringify({ runeIds: ids });
    const req = http.request({
      hostname: 'localhost', port: 8080, path: '/api/array/calculate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const obj = JSON.parse(body);
        console.log('---', label, '---');
        console.log('  power:', obj.power, 'range:', obj.range, 'duration:', obj.duration, 'trigger:', obj.triggerChance);
        if (obj.resonance && obj.resonance.triggered) {
          console.log('  ✅ 共鸣:', obj.resonance.name, 'x' + obj.resonance.powerBoost, 'triggered=' + obj.resonance.triggered);
        } else if (obj.resonance) {
          console.log('  ⚪ 共鸣对象存在但未触发 triggered=' + obj.resonance.triggered);
        } else {
          console.log('  ⚪ 无共鸣对象');
        }
        if (obj.backlash && obj.backlash.triggered) {
          console.log('  💥 反噬:', obj.backlash.name, '-' + ((obj.backlash.powerReduction||0)*100).toFixed(0) + '%', 'triggered=' + obj.backlash.triggered);
        } else if (obj.backlash) {
          console.log('  ⚪ 反噬对象存在但未触发 triggered=' + obj.backlash.triggered);
        } else {
          console.log('  ⚪ 无反噬对象');
        }
        resolve();
      });
    });
    req.write(data);
    req.end();
  });
};

(async () => {
  // 多次测试共鸣
  for (let i = 0; i < 5; i++) {
    const ids = testResonance();
    await runTest(ids, '共鸣测试 #'+i);
  }
  // 多次测试对立元素反噬
  for (let i = 0; i < 5; i++) {
    const ids = testCounter();
    await runTest(ids, '反噬测试 #'+i);
  }
})();
