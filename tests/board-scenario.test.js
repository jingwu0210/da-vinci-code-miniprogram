/**
 * Board 多场景确定性测试 — 使用 tiles + owner 模型。
 * 运行: node tests/board-scenario.test.js
 */
const { Color, Phase } = require('../miniprogram/common/enums');
const { JOKER_VALUE } = require('../miniprogram/common/constants');
const Tile = require('../miniprogram/model/entities/tile');
const { createInitialState, drawFromPool, getPlayerHand, getClientView, countUnrevealed, allOpponentsEliminated } = require('../miniprogram/model/entities/game-state');
const { isGuessMatch } = require('../miniprogram/service/game/guess-handler');
const { nextPhase, PASS_REVEALS_TILE } = require('../miniprogram/service/game/turn-manager');
const { findValidInsertPositions, sortHand } = require('../miniprogram/utils/sort-hand');

let passed = 0, failed = 0;
function assert(desc, ok) { ok ? passed++ : (console.log('  ❌ ' + desc), failed++); }

const O_ME = 'me', O_AI = 'ai';
let tid = 0;
function T(c, v) { return Tile.create({ id: `t${tid++}`, color: c, value: v, isJoker: v===JOKER_VALUE, position: null, isRevealed: false }); }

function buildGame(humanSpecs, aiSpecs, opts = {}) {
  const tiles = [];
  humanSpecs.forEach((s, i) => tiles.push(T(s.color, s.value)));  // fix owner later
  aiSpecs.forEach((s, i) => tiles.push(T(s.color, s.value)));

  // 修正 owner 和 position
  let hi = 0, ai = 0;
  tiles.forEach(t => {
    if (hi < humanSpecs.length) { t.owner = O_ME; t.position = hi++; }
    else { t.owner = O_AI; t.position = ai++; }
  });

  // 剩余牌归池（简化：手动添加一些池牌）
  const poolSpecs = opts.pool || [];
  poolSpecs.forEach(s => tiles.push({ ...T(s.color, s.value), owner: 'pool', position: null }));

  // 确保共 26 张（补足）
  const existing = new Set(tiles.map(t => `${t.color}_${t.value}_${t.isJoker}`));
  const all = Tile.createDeckTiles();
  for (const t of all) {
    const k = `${t.color}_${t.value}_${t.isJoker}`;
    if (!existing.has(k)) { t.owner = 'pool'; t.position = null; tiles.push(t); existing.add(k); }
  }

  const first = opts.firstPlayer || O_ME;
  const turnOrder = first === O_ME ? [O_ME, O_AI] : [O_AI, O_ME];

  return {
    roomId: 'T', mode: 'ai', status: 'playing', phase: Phase.DRAWING,
    turnOrder, turnIndex: 0, tiles, drawnTileId: null, winner: null, turnLog: [],
  };
}

console.log('\n🏁 S1 — 先手判定');
(() => {
  const g = buildGame(
    [{color:Color.BLACK,value:2},{color:Color.BLACK,value:3},{color:Color.WHITE,value:7},{color:Color.BLACK,value:9}],
    [{color:Color.WHITE,value:5},{color:Color.BLACK,value:6},{color:Color.WHITE,value:8},{color:Color.BLACK,value:10}],
    {firstPlayer:O_ME});
  const v = getClientView(g, O_ME);
  assert('S1.1 玩家先手 myTurn=true', v.game.myTurn === true);
})();
(() => {
  const g = buildGame(
    [{color:Color.BLACK,value:2},{color:Color.BLACK,value:3},{color:Color.WHITE,value:7},{color:Color.BLACK,value:9}],
    [{color:Color.WHITE,value:5},{color:Color.BLACK,value:6},{color:Color.WHITE,value:8},{color:Color.BLACK,value:10}],
    {firstPlayer:O_AI});
  const v = getClientView(g, O_ME);
  assert('S1.2 AI先手 myTurn=false', v.game.myTurn === false);
})();

console.log('\n🃏 S2 — Joker 插入');
(() => {
  const hand = [T(Color.BLACK, 3), T(Color.WHITE, 5), T(Color.BLACK, 9)];
  const j = T(Color.BLACK, JOKER_VALUE);
  const p = findValidInsertPositions(hand, j);
  assert('S2.1 Joker 全位置 [0,1,2,3]', JSON.stringify(p)==='[0,1,2,3]');
})();
(() => {
  const hand = [T(Color.BLACK, 2), T(Color.BLACK, 8)];
  // 两张 Joker
  const j1 = T(Color.BLACK, JOKER_VALUE), j2 = T(Color.WHITE, JOKER_VALUE);
  assert('S2.2 J1 全位置', findValidInsertPositions(hand, j1).length === 3);
  hand.splice(0,0,j1);
  assert('S2.2 J2 全位置', findValidInsertPositions(hand, j2).length === 4);
})();

console.log('\n🔄 S3 — 状态转移');
(() => {
  assert('S3.1 DRAW+draw→INSERTING', nextPhase(Phase.DRAWING,'draw')===Phase.INSERTING);
  assert('S3.2 INSERT+insert→GUESSING', nextPhase(Phase.INSERTING,'insert')===Phase.GUESSING);
  assert('S3.3 GUESS+correct→GUESSING', nextPhase(Phase.GUESSING,'correct')===Phase.GUESSING);
  assert('S3.4 GUESS+wrong→WAITING', nextPhase(Phase.GUESSING,'wrong')===Phase.WAITING);
  assert('S3.5 GUESS+pass→WAITING', nextPhase(Phase.GUESSING,'pass')===Phase.WAITING);
  assert('S3.6 PASS_REVEALS_TILE', PASS_REVEALS_TILE===true);
})();

console.log('\n🔒 S4 — 信息隔离');
(() => {
  const g = buildGame(
    [{color:Color.BLACK,value:3},{color:Color.WHITE,value:5}],
    [{color:Color.WHITE,value:2},{color:Color.BLACK,value:JOKER_VALUE}],
    {firstPlayer:O_ME});
  const v = getClientView(g, O_ME);
  assert('S4.1 自己全可见', v.self.hand.every(t=>t.value!==undefined));
  const opp = v.opponents[0].hand.filter(t=>!t.isRevealed);
  assert('S4.2 对手未翻牌无value', opp.every(t=>t.value===undefined));
  assert('S4.3 对手未翻牌有color', opp.every(t=>t.color!==undefined));
})();

console.log('\n🏆 S5 — 胜负');
(() => {
  const g = buildGame([{color:Color.BLACK,value:3}],[{color:Color.WHITE,value:2}]);
  g.tiles.forEach(t => { if (t.owner===O_AI) t.isRevealed=true; });
  assert('S5.1 全翻开→胜', allOpponentsEliminated(g.tiles, O_ME));
})();
(() => {
  const g = buildGame([{color:Color.BLACK,value:3}],[{color:Color.WHITE,value:2},{color:Color.BLACK,value:6}]);
  g.tiles.find(t=>t.owner===O_AI&&t.value===2).isRevealed=true;
  assert('S5.2 部分翻开→继续', !allOpponentsEliminated(g.tiles, O_ME));
})();

console.log('\n🧪 S6 — 插入位置边界');
(() => {
  const hand = [T(Color.BLACK,3),T(Color.WHITE,3),T(Color.BLACK,5)];
  assert('S6.1 摸3黑→[0,1]', JSON.stringify(findValidInsertPositions(hand,T(Color.BLACK,3)))==='[0,1]');
  assert('S6.2 摸3白→[1,2]', JSON.stringify(findValidInsertPositions(hand,T(Color.WHITE,3)))==='[1,2]');
})();
(() => {
  const hand = [T(Color.BLACK,5),T(Color.BLACK,7)];
  assert('S6.3 摸0→[0]', JSON.stringify(findValidInsertPositions(hand,T(Color.BLACK,0)))==='[0]');
  assert('S6.4 摸11→[2]', JSON.stringify(findValidInsertPositions(hand,T(Color.WHITE,11)))==='[2]');
})();

console.log('\n🎯 S7 — 猜牌矩阵');
(() => {
  assert('S7.1 猜5命中5', isGuessMatch({value:5}, T(Color.WHITE,5)));
  assert('S7.2 猜3未命中5', !isGuessMatch({value:3}, T(Color.WHITE,5)));
  assert('S7.3 猜-1命中Joker', isGuessMatch({value:JOKER_VALUE}, T(Color.BLACK,JOKER_VALUE)));
  assert('S7.4 猜5未命中Joker', !isGuessMatch({value:5}, T(Color.BLACK,JOKER_VALUE)));
  assert('S7.5 猜-1未命中数字', !isGuessMatch({value:JOKER_VALUE}, T(Color.WHITE,5)));
})();

console.log('\n📐 S8 — 排序');
(() => {
  const tiles = [T(Color.WHITE,3),T(Color.BLACK,5),T(Color.BLACK,3),T(Color.WHITE,1)];
  const s = sortHand(tiles);
  assert('S8.1 0=1白', s[0].value===1&&s[0].color===Color.WHITE);
  assert('S8.2 1=3黑', s[1].value===3&&s[1].color===Color.BLACK);
  assert('S8.3 2=3白', s[2].value===3&&s[2].color===Color.WHITE);
  assert('S8.4 3=5黑', s[3].value===5&&s[3].color===Color.BLACK);
})();

console.log(`\n═══════════════════════`);
console.log(`  Board 场景: ${passed} 通过 / ${failed} 失败`);
console.log(`═══════════════════════`);
process.exit(failed > 0 ? 1 : 0);
