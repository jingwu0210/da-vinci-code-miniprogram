/**
 * HARD AI — Medium 全部推理 + 概率矩阵 P[opp][pos][val] + 中位加权 + argmax。
 * pickGuess 核心逻辑委托给 ai-common.evaluatePositions。
 *   ⚠️ 待持续优化: 概率矩阵未跨回合持久化(当前每轮重新计算);
 *      应跨回合跟踪 P 矩阵以利用历史推理。
 */
const C = require('./ai-common');

// ── pickColor: 阶段感知 ──
// 早期(对手暴露 < 40%): Score = 己方持有数×2 + 对手该色暗牌数 → 建立信息垄断
// 中后期(对手暴露 ≥ 40%): 对手暗牌多的颜色优先 (同 Medium)
exports.pickColor = function(pool, gs, aiPlayer) {
  if (pool.black === 0) return 'white';
  if (pool.white === 0) return 'black';

  var opps = C.getOpponents(gs.tiles, aiPlayer);
  var unrev = { black: 0, white: 0 };
  var oppTotal = 0, oppRevealed = 0;
  opps.forEach(function(opp) {
    C.getHand(gs.tiles, opp).forEach(function(t) {
      oppTotal++;
      if (t.isRevealed) oppRevealed++;
      else unrev[t.color]++;
    });
  });

  // 早期: 己方持有数加权 + 对手暗牌数
  if (oppTotal === 0 || oppRevealed / oppTotal < 0.4) {
    var own = { black: 0, white: 0 };
    C.getHand(gs.tiles, aiPlayer).forEach(function(t) { own[t.color]++; });
    var scoreB = own.black * 2 + unrev.black;
    var scoreW = own.white * 2 + unrev.white;
    if (scoreB > scoreW) return 'black';
    if (scoreW > scoreB) return 'white';
  }

  // 中后期 / 平分: Medium 策略
  if (unrev.black === 0) return 'white';
  if (unrev.white === 0) return 'black';
  return unrev.black >= unrev.white ? 'black' : 'white';
};

// ── pickGuess: 共享推理 + 概率矩阵 + 中位加权 + argmax ──
exports.pickGuess = function(gs, aiPlayer) {
  var eval = C.evaluatePositions(gs, aiPlayer);
  if (!eval.opps.length) return null;

  // 构建概率矩阵 P[opp][pos][val]，候选值按范围中位加权
  var P = {};
  var hasAny = false;
  eval.candidates.forEach(function(c) {
    if (!P[c.opp]) P[c.opp] = {};
    P[c.opp][c.pos] = {};

    var rangeMid = (c.leftKey[0] + c.rightKey[0]) / 2;
    var weights = [];
    var totalWeight = 0;
    c.possible.forEach(function(pv) {
      var w = pv === -1 ? 1.0 : 1.0 / (1.0 + Math.abs(pv - rangeMid));
      weights.push(w);
      totalWeight += w;
    });
    c.possible.forEach(function(pv, wi) {
      P[c.opp][c.pos][pv] = weights[wi] / totalWeight;
      hasAny = true;
    });
  });

  // argmax
  if (hasAny) {
    var best = { conf: -1, opp: null, pos: -1, val: -1 };
    eval.opps.forEach(function(opp) {
      Object.keys(P[opp] || {}).forEach(function(pos) {
        Object.keys(P[opp][pos] || {}).forEach(function(val) {
          if (P[opp][pos][val] > best.conf) {
            best = { conf: P[opp][pos][val], opp: opp, pos: parseInt(pos), val: parseInt(val) };
          }
        });
      });
    });
    if (best.opp) return { target: best.opp, position: best.pos, value: best.val };
  }

  return C.pickFallback(eval.opps, gs.tiles, eval.seen, eval.negated, eval.bothSeen, eval.oneSeen);
};

// Hard: 比 Medium 更谨慎
exports.shouldContinue = function(gs, aiPlayer, consecutiveCorrect) {
  return C.shouldContinueWithProbs(gs, aiPlayer, consecutiveCorrect, 0.65, 0.50, 0.35);
};
