/**
 * AI 策略测试 — 纯逻辑验证。
 * 运行: node tests/ai-strategy.test.js
 */
const { Color, Phase } = require('../miniprogram/common/enums');
const { sortKey, sortHand, findValidInsertPositions } = require('../miniprogram/utils/sort-hand');
const { JOKER_VALUE } = require('../miniprogram/common/constants');
const Tile = require('../miniprogram/model/entities/tile');

var passed = 0, failed = 0;
function assert(desc, ok) { ok ? passed++ : (console.log('  ❌ ' + desc), failed++); }
function T(c, v) { return Tile.create({ id: 't' + (++tid), color: c, value: v, isJoker: v === JOKER_VALUE, position: 0, isRevealed: false }); }
var tid = 0;

// ═══ findInsertPos ═══
console.log('\n📐 findInsertPos');

function cmpKey(a, b) {
  if (a[0] < b[0]) return -1; if (a[0] > b[0]) return 1;
  if (a[1] < b[1]) return -1; if (a[1] > b[1]) return 1;
  return 0;
}
function findInsertPos(hand, tile) {
  for (var i = 0; i <= hand.length; i++) {
    var l = i === 0 || cmpKey(sortKey(hand[i-1]), sortKey(tile)) <= 0;
    var r = i === hand.length || cmpKey(sortKey(tile), sortKey(hand[i])) <= 0;
    if (l && r) return i;
  }
  return hand.length;
}

var h = [T(Color.BLACK, 2), T(Color.WHITE, 5), T(Color.BLACK, 9)];
assert('插 6白 → 2 (5白与9黑之间)', findInsertPos(h, T(Color.WHITE, 6)) === 2);
assert('插 1黑 → 0 (最前)', findInsertPos(h, T(Color.BLACK, 1)) === 0);
assert('插 11白 → 3 (最后)', findInsertPos(h, T(Color.WHITE, 11)) === 3);
assert('插 3黑 → 1 (2黑与5白之间)', findInsertPos([T(Color.BLACK, 2), T(Color.BLACK, 5)], T(Color.BLACK, 3)) === 1);
// 同值黑左白右
assert('插 3黑 在 [3黑,3白] → 0', findInsertPos([T(Color.BLACK, 3), T(Color.WHITE, 3)], T(Color.BLACK, 3)) === 0);
assert('插 3白 在 [3黑,3白] 首选1 (黑左白右)', findInsertPos([T(Color.BLACK, 3), T(Color.WHITE, 3)], T(Color.WHITE, 3)) === 1);

// ═══ 排除已见牌 ═══
console.log('\n🔍 排除已见牌 (MEDIUM)');

function buildPossible(ownValues, revealedValues) {
  var seen = {};
  ownValues.forEach(function(v) { seen[v] = true; });
  revealedValues.forEach(function(v) { seen[v] = true; });
  var possible = [];
  for (var v = 0; v <= 11; v++) { if (!seen[v]) possible.push(v); }
  return possible;
}

var possible = buildPossible([2, 5, 9, 10], [4, 8]);
assert('排除后含 0,1,3,6,7,11', JSON.stringify(possible) === '[0,1,3,6,7,11]');
assert('排除后不含 2', possible.indexOf(2) === -1);
assert('排除后不含 5', possible.indexOf(5) === -1);

var allSeen = buildPossible([0,1,2,3,4,5,6,7,8,9,10,11], []);
assert('全见过 → 空', allSeen.length === 0);

// ═══ 概率矩阵 ═══
console.log('\n📊 概率矩阵 (HARD)');

function initMatrix(oppPositions, ownValues, revealedValues) {
  var P = {};
  Object.keys(oppPositions).forEach(function(opp) {
    P[opp] = {};
    oppPositions[opp].forEach(function(pos) {
      P[opp][pos] = {};
      for (var v = 0; v <= 11; v++) P[opp][pos][v] = 1.0;
    });
  });
  // 排除已知
  ownValues.forEach(function(v) { forEach(P, function(pv) { delete pv[v]; }); });
  revealedValues.forEach(function(v) { forEach(P, function(pv) { delete pv[v]; }); });
  return P;
}

function forEach(P, fn) {
  Object.keys(P).forEach(function(opp) { Object.keys(P[opp]).forEach(function(pos) { fn(P[opp][pos]); }); });
}

function findBest(P) {
  var best = { conf: 0, target: null, pos: -1, val: -1 };
  Object.keys(P).forEach(function(opp) {
    Object.keys(P[opp]).forEach(function(pos) {
      var pv = P[opp][pos];
      var vals = Object.keys(pv);
      if (!vals.length) return;
      vals.forEach(function(v) { if (pv[v] > best.conf) { best = { conf: pv[v], target: opp, pos: parseInt(pos), val: parseInt(v) }; } });
    });
  });
  return best;
}

var P = initMatrix({ opp1: [0,1,2,3] }, [2,5,9,10], [4,8]);
var best = findBest(P);
assert('矩阵初始化: 有最佳猜测', best.target === 'opp1');
assert('矩阵: 不含己牌', !P.opp1[0].hasOwnProperty('2') && !P.opp1[0].hasOwnProperty('5'));
assert('矩阵: 不含已翻', !P.opp1[0].hasOwnProperty('4') && !P.opp1[0].hasOwnProperty('8'));

// 猜对后更新: 移除该位置, 排除该值
var pos = best.pos;
var val = best.val;
delete P.opp1[pos]; // 位置确定
forEach(P, function(pv) { delete pv[val]; }); // 全局排除
var best2 = findBest(P);
assert('猜对更新后: 还有猜测', best2.conf > 0);

// 猜错后更新: P[opp][pos][val] = 0
P = initMatrix({ opp1: [0,1,2,3] }, [2,5,9,10], [4,8]);
P.opp1[2][7] = 0;
P.opp1[2][3] = 0;
var best3 = findBest(P);
assert('猜错更新: 零值不被选', best3.val !== 7 && best3.val !== 3);

// ═══ AI 不猜已翻牌 ═══
console.log('\n🚫 合法性');

// 模拟: 已有 2 张已翻牌, AI 只选未翻的
var oppHand = [T(Color.BLACK, 5), T(Color.WHITE, 2)];
oppHand[0].isRevealed = true; // 5已翻
var unrevealed = oppHand.filter(function(t) { return !t.isRevealed; });
assert('不猜已翻牌: 只剩1张未翻', unrevealed.length === 1);
assert('未翻牌是2白', unrevealed[0].value === 2);

// ═══ 答案 ═══
console.log('\n═══════════════════════');
console.log('  AI 策略: ' + passed + ' 通过 / ' + failed + ' 失败');
console.log('═══════════════════════');
process.exit(failed > 0 ? 1 : 0);
