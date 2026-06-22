/**
 * aiMove —— AI 执行完整回合（easy 随机策略，medium/hard 后续阶段实现）。
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId, difficulty } = event;
  if (!gameId) return { success: false, error: 'INVALID_PARAMS' };

  const actions = [];

  // ── Step 1: 摸牌 ──
  const remaining = E.poolRemaining((await db.collection('games').doc(gameId).get()).data.pool);
  const pickColor = remaining.black > 0 ? 'black' : 'white';
  const drawResult = await require('./drawTile')({ gameId, color: pickColor }, caller, db);
  if (!drawResult.success) return drawResult;
  actions.push({ action: 'draw', color: pickColor, ...drawResult.data });

  // ── Step 2: 插入 ──
  const handLen = await _getHandLen(db, gameId, caller);
  const pos = Math.floor(Math.random() * (handLen + 1));
  const insertResult = await require('./insertTile')({ gameId, position: pos }, caller, db);
  if (!insertResult.success) return insertResult;
  actions.push({ action: 'insert', position: pos });

  // ── Step 3: 猜测 ──
  const gs = (await db.collection('games').doc(gameId).get()).data;
  const opponents = gs.turnOrder.filter(oid => oid !== caller);
  const target = opponents[Math.floor(Math.random() * opponents.length)];
  const tHand = gs.hands[target] || [];
  const unrevealed = tHand.filter(t => !t.isRevealed);
  if (unrevealed.length > 0) {
    const tPos = unrevealed[Math.floor(Math.random() * unrevealed.length)].position;
    const val = Math.random() < 0.1 ? -1 : Math.floor(Math.random() * 12);
    const guessResult = await require('./makeGuess')({ gameId, targetOpenid: target, position: tPos, value: val }, caller, db);
    if (!guessResult.success) return guessResult;
    actions.push({ action: 'guess', target, position: tPos, value: val, ...guessResult.data });
  }

  // ── Step 4: Pass ──
  const passResult = await require('./passTurn')({ gameId }, caller, db);
  if (passResult.success) actions.push({ action: 'pass' });

  return {
    success: true,
    data: { actions, gameOver: passResult.data?.gameOver || false, winner: passResult.data?.winner || null },
  };
};

async function _getHandLen(db, gameId, caller) {
  const doc = await db.collection('games').doc(gameId).get();
  return (doc.data.hands[caller] || []).length;
}
