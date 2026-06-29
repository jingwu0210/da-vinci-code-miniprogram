/**
 * MEDIUM AI — sortKey 上下界 + (value,color) 精确排除 + 否定信息。
 * pickGuess 核心逻辑委托给 ai-common.evaluatePositions。
 */
const C = require('./ai-common');

exports.pickColor = function(pool, gs, aiPlayer) {
  if (pool.black === 0) return 'white';
  if (pool.white === 0) return 'black';
  var opps = C.getOpponents(gs.tiles, aiPlayer);
  var unrev = { black: 0, white: 0 };
  opps.forEach(function(opp) {
    C.getHand(gs.tiles, opp).forEach(function(t) { if (!t.isRevealed) unrev[t.color]++; });
  });
  if (unrev.black === 0) return 'white';
  if (unrev.white === 0) return 'black';
  return unrev.black >= unrev.white ? 'black' : 'white';
};

exports.pickGuess = function(gs, aiPlayer) {
  var eval = C.evaluatePositions(gs, aiPlayer);
  if (!eval.opps.length) return null;

  // Medium 选目标: 优先有否定信息的位置 → 其次候选数最少
  var best = null, bestRange = Infinity;
  eval.candidates.forEach(function(c) {
    // 推断惩罚: 对手猜过的 (value,color) 降低该候选的优先级
    var inferredPenalty = 0;
    c.possible.forEach(function(pv) {
      if (pv === -1) return;
      var ik = pv + '_' + c.tileColor;
      if (eval.inferred[ik]) inferredPenalty += C.inferredPenalty(eval.inferred[ik]);
    });
    var score = c.possible.length - (c.hasNeg ? 1 : 0) + inferredPenalty;
    if (score < bestRange) {
      bestRange = score;
      best = c;
    }
  });

  if (best) return { target: best.opp, position: best.pos, value: best.possible[Math.floor(Math.random()*best.possible.length)] };

  return C.pickFallback(eval.opps, gs.tiles, eval.seen, eval.negated, eval.bothSeen, eval.oneSeen);
};

// Medium: 比 Hard 更激进。池空时 ×1.5（无亮牌代价）
exports.shouldContinue = function(gs, aiPlayer, consecutiveCorrect) {
  var conf = C.estimateConfidence(gs.tiles, aiPlayer);
  if (conf.minCount === 1) return true;       // 100% 确定 → 必猜
  if (conf.totalUnrev <= 2) return true;      // 终局冲胜
  var poolTotal = gs.tiles.filter(function(t) { return t.owner === 'pool'; }).length;
  var poolFactor = poolTotal === 0 ? 1.5 : 1.0;  // 池空: 无牌可亮，大胆猜
  if (conf.minCount === 2) return Math.random() < 0.70 * poolFactor;
  if (conf.minCount === 3) return Math.random() < 0.50 * poolFactor;
  return Math.random() < 0.30 * poolFactor;
};
