/**
 * aiMove — 单步执行 AI 动作。难度策略委托给 strategy 文件。
 */
const STRATEGIES = {
  easy:   require('./ai-strategy-easy'),
  medium: require('./ai-strategy-medium'),
  hard:   require('./ai-strategy-hard'),
};
const E = require('./_engine');

module.exports = async function(event, caller, db) {
  var gameId = event.gameId;
  var difficulty = event.difficulty || 'easy';
  if (!gameId) return { success: false, error: 'INVALID_PARAMS' };

  var doc = await db.collection('games').doc(gameId).get();
  if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND' };
  var gs = doc.data;
  var aiPlayer = gs.turnOrder[gs.turnIndex];
  var strategy = STRATEGIES[difficulty] || STRATEGIES.easy;

  // Step 1: Joker 放置
  if (gs.phase === E.Phase.INSERTING && gs.drawnTileId) {
    var hand = gs.tiles.filter(function(t) { return t.owner === aiPlayer; }).sort(function(a,b){return a.position-b.position;});
    var joker = hand.find(function(t) { return t.id === gs.drawnTileId; });
    if (joker) {
      var pos = Math.floor(Math.random() * hand.length);
      await require('./insertTile')({ gameId: gameId, position: pos }, aiPlayer, db);
      return { success: true, data: { actions: [{ action: 'insert', position: pos }] }};
    }
  }

  var pool = E.poolRemaining(gs.tiles);

  // Step 2: 摸牌
  if ((gs.phase === E.Phase.DRAWING || gs.phase === E.Phase.WAITING) && pool.total > 0) {
    var color = strategy.pickColor(pool, gs, aiPlayer);
    var dr = await require('./drawTile')({ gameId: gameId, color: color }, aiPlayer, db);
    if (dr.success) return { success: true, data: { actions: [{ action: 'draw', color: color }] }};
  }

  // 池空 → 跳过摸牌，直接进入猜测（让后续 guess step 处理）
  if (pool.total === 0 && (gs.phase === E.Phase.DRAWING || gs.phase === E.Phase.WAITING)) {
    gs.phase = E.Phase.GUESSING;
    gs.drawnTileId = null;
    await db.collection('games').doc(gameId).update({ data: { phase: gs.phase, drawnTileId: null, updatedAt: db.serverDate() }});
    // fall through to guess step below
  }

  // Step 3: 猜测
  if (gs.phase === E.Phase.GUESSING) {
    // 重新读取最新状态，避免 DB 读延迟导致 pickGuess 基于过期快照
    var freshDoc = await db.collection('games').doc(gameId).get();
    if (freshDoc.data) gs = freshDoc.data;

    // DEBUG: 打印 AI 视角的对手手牌状态（验证 gs 是否过期）
    var opps = gs.tiles.filter(function(t) { return t.owner !== aiPlayer && t.owner !== 'pool'; }).map(function(t) { return t.owner; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
    opps.forEach(function(oid) {
      var oh = E.getPlayerHand(gs.tiles, oid);
      console.log('[AI-DEBUG] gameId=' + gameId + ' opp=' + oid + ' hand=' + JSON.stringify(oh.map(function(t) { return { p: t.position, c: t.color, v: t.isRevealed ? t.value : '?', r: t.isRevealed, j: t.isJoker }; })));
    });

    // 统计本回合已连续猜对次数（从 turnLog 尾部倒推）
    var consecutiveCorrect = 0;
    var tlog = gs.turnLog || [];
    for (var ti = tlog.length - 1; ti >= 0; ti--) {
      var tl = tlog[ti];
      if (tl.playerOpenid === aiPlayer && tl.action === 'guess' && tl.isCorrect) {
        consecutiveCorrect++;
      } else if (tl.playerOpenid === aiPlayer) {
        break; // 遇到 AI 的非猜对动作 → 连续段结束
      }
    }

    // 猜对后由 strategy.shouldContinue 决定是否继续还是见好就收
    if (consecutiveCorrect > 0 && !strategy.shouldContinue(gs, aiPlayer, consecutiveCorrect)) {
      // 跳过猜测，fall through 到 step 4 pass
    } else {
      var guess = strategy.pickGuess(gs, aiPlayer);
      if (guess) {
        var gr = await require('./makeGuess')({ gameId: gameId, targetOpenid: guess.target, position: guess.position, value: guess.value }, aiPlayer, db);
        if (gr.success) {
          return { success: true, data: { actions: [{ action: 'guess', target: guess.target, position: guess.position, value: guess.value, isCorrect: gr.data.isCorrect, gameOver: gr.data.gameOver }] }};
        }
      }
    }
  }

  // Step 4: Pass
  if (gs.phase === E.Phase.GUESSING) {
    await require('./passTurn')({ gameId: gameId, reveal: false }, aiPlayer, db);
    return { success: true, data: { actions: [{ action: 'pass' }] }};
  }

  // Fallback
  gs.turnIndex = (gs.turnIndex + 1) % gs.turnOrder.length;
  gs.phase = 'waiting';
  await db.collection('games').doc(gameId).update({ data: {
    phase: gs.phase, turnIndex: gs.turnIndex, updatedAt: db.serverDate(),
  }});
  return { success: true, data: { actions: [{ action: 'pass' }] }};
};
