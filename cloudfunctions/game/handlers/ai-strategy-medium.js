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
    var score = c.possible.length - (c.hasNeg ? 1 : 0);
    if (score < bestRange) {
      bestRange = score;
      best = c;
    }
  });

  if (best) return { target: best.opp, position: best.pos, value: best.possible[Math.floor(Math.random()*best.possible.length)] };

  return C.pickFallback(eval.opps, gs.tiles, eval.seen, eval.negated, eval.bothSeen, eval.oneSeen);
};

// Medium: 比 Hard 更激进
exports.shouldContinue = function(gs, aiPlayer, consecutiveCorrect) {
  return C.shouldContinueWithProbs(gs, aiPlayer, consecutiveCorrect, 0.80, 0.65, 0.45);
};
