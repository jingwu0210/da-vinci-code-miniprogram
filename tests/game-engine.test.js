/**
 * 游戏引擎单元测试 —— 纯逻辑，不依赖微信环境。
 * 运行: node tests/game-engine.test.js
 */

// ── 内联引擎（避免跨平台 require 问题）──
const Color = { BLACK: 'black', WHITE: 'white' };

function shuffle(arr) {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function createDeckTiles() {
  const tiles = []; let idx = 0;
  for (const color of [Color.BLACK, Color.WHITE]) {
    for (let v = 0; v <= 11; v++) tiles.push({ id: `t_${idx++}`, color, value: v, isJoker: false });
    tiles.push({ id: `t_${idx++}`, color, value: -1, isJoker: true });
  }
  return tiles;
}

function sortKey(tile) {
  if (tile.isJoker || tile.value === -1) return [Infinity, 0];
  return [tile.value, tile.color === Color.BLACK ? 0 : 1];
}

function compareTile(a, b) {
  const [va, ca] = sortKey(a), [vb, cb] = sortKey(b);
  if (va < vb) return -1; if (va > vb) return 1;
  if (ca < cb) return -1; if (ca > cb) return 1;
  return 0;
}

function drawFromPool(pool, color) {
  const sub = pool[color];
  if (!sub || sub.length === 0) return { tile: null, pool };
  const idx = Math.floor(Math.random() * sub.length);
  const newSub = [...sub];
  const [tile] = newSub.splice(idx, 1);
  return { tile, pool: { ...pool, [color]: newSub } };
}

function isGuessMatch(guess, tile) { return guess.value === tile.value; }

function countUnrevealed(hand) { return hand.filter(t => !t.isRevealed).length; }

function allOpponentsEliminated(hands, playerOpenid) {
  for (const [oid, h] of Object.entries(hands)) {
    if (oid === playerOpenid) continue;
    if (countUnrevealed(h) > 0) return false;
  }
  return true;
}

// ── 测试运行器 ──
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}: ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

// ══════════════════════════════════

console.log('\n📦 牌组测试');
test('26 张牌', () => {
  const deck = createDeckTiles();
  assert(deck.length === 26, `expected 26, got ${deck.length}`);
});
test('13 黑 13 白', () => {
  const deck = createDeckTiles();
  const blacks = deck.filter(t => t.color === Color.BLACK);
  const whites = deck.filter(t => t.color === Color.WHITE);
  assert(blacks.length === 13, `blacks: ${blacks.length}`);
  assert(whites.length === 13, `whites: ${whites.length}`);
});
test('每种颜色: 0~11 + 1 Joker', () => {
  const deck = createDeckTiles();
  for (const color of [Color.BLACK, Color.WHITE]) {
    const tiles = deck.filter(t => t.color === color);
    const jokers = tiles.filter(t => t.isJoker);
    const nums = tiles.filter(t => !t.isJoker).map(t => t.value).sort((a, b) => a - b);
    assert(jokers.length === 1, `${color} jokers: ${jokers.length}`);
    assert(nums.length === 12, `${color} nums: ${nums.length}`);
    for (let i = 0; i < 12; i++) assert(nums[i] === i, `${color} num[${i}]=${nums[i]}`);
  }
});
test('Joker value === -1', () => {
  const deck = createDeckTiles();
  deck.filter(t => t.isJoker).forEach(t => assert(t.value === -1));
});

console.log('\n🔀 洗牌测试');
test('洗牌后长度不变', () => {
  const deck = createDeckTiles();
  const shuffled = shuffle(deck);
  assert(shuffled.length === 26);
});
test('洗牌后包含所有原始牌', () => {
  const deck = createDeckTiles();
  const s = shuffle(deck);
  const ids = new Set(s.map(t => t.id));
  assert(ids.size === 26);
  deck.forEach(t => assert(ids.has(t.id)));
});
test('两次洗牌结果不同', () => {
  const deck = createDeckTiles();
  const s1 = shuffle(deck).map(t => t.id).join(',');
  const s2 = shuffle(deck).map(t => t.id).join(',');
  // 概率极小但非零——跑 5 次确保至少一次不同
  let different = false;
  for (let i = 0; i < 5; i++) {
    if (shuffle(deck).map(t => t.id).join(',') !== shuffle(deck).map(t => t.id).join(',')) {
      different = true; break;
    }
  }
  assert(different);
});

console.log('\n📐 排序测试');
test('(3, BLACK) < (3, WHITE)', () => {
  const a = { value: 3, color: Color.BLACK, isJoker: false };
  const b = { value: 3, color: Color.WHITE, isJoker: false };
  assert(compareTile(a, b) < 0);
});
test('(2, BLACK) < (5, WHITE)', () => {
  assert(compareTile({ value: 2, color: Color.BLACK, isJoker: false }, { value: 5, color: Color.WHITE, isJoker: false }) < 0);
});
test('Joker 排到最后', () => {
  const a = { value: -1, color: Color.BLACK, isJoker: true };
  const b = { value: 11, color: Color.WHITE, isJoker: false };
  assert(compareTile(a, b) > 0);
});

console.log('\n🃏 颜色分池摸牌');
test('从黑池摸牌返回黑色牌', () => {
  const pool = { black: [{ id: 't_0', color: 'black', value: 5, isJoker: false }], white: [] };
  const { tile, pool: newPool } = drawFromPool(pool, 'black');
  assert(tile !== null && tile.color === 'black');
  assert(newPool.black.length === 0);
});
test('从空池摸牌返回 null', () => {
  const pool = { black: [], white: [] };
  const { tile } = drawFromPool(pool, 'black');
  assert(tile === null);
});
test('摸牌后总数守恒', () => {
  const pool = { black: [{ id: 'b1', color: 'black', value: 1, isJoker: false }, { id: 'b2', color: 'black', value: 2, isJoker: false }], white: [{ id: 'w1', color: 'white', value: 3, isJoker: false }] };
  const total = pool.black.length + pool.white.length;
  const { pool: np } = drawFromPool(pool, 'black');
  assert(np.black.length + np.white.length === total - 1);
});

console.log('\n🎯 猜测判定');
test('猜对数字', () => {
  const tile = { value: 5, isJoker: false };
  assert(isGuessMatch({ value: 5 }, tile) === true);
});
test('猜错数字', () => {
  const tile = { value: 5, isJoker: false };
  assert(isGuessMatch({ value: 3 }, tile) === false);
});
test('猜 Joker(value=-1) 命中 Joker', () => {
  const tile = { value: -1, isJoker: true };
  assert(isGuessMatch({ value: -1 }, tile) === true);
});
test('猜数字但实际是 Joker', () => {
  const tile = { value: -1, isJoker: true };
  assert(isGuessMatch({ value: 5 }, tile) === false);
});
test('猜 Joker 但实际是数字', () => {
  const tile = { value: 0, isJoker: false };
  assert(isGuessMatch({ value: -1 }, tile) === false);
});

console.log('\n🏆 胜负判定');
test('所有对手全翻开 → 胜', () => {
  const hands = {
    me: [{ isRevealed: false }, { isRevealed: true }],
    opponent: [{ isRevealed: true }, { isRevealed: true }],
  };
  assert(allOpponentsEliminated(hands, 'me') === true);
});
test('对手还有未翻牌 → 继续', () => {
  const hands = {
    me: [{ isRevealed: false }],
    opponent: [{ isRevealed: true }, { isRevealed: false }],
  };
  assert(allOpponentsEliminated(hands, 'me') === false);
});

console.log(`\n══════════════════════`);
console.log(`  通过: ${passed}  失败: ${failed}`);
console.log(`══════════════════════\n`);
process.exit(failed > 0 ? 1 : 0);
