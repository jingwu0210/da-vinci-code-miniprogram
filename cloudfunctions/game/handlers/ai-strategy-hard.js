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

// ── pickInsert: Joker 放置策略 ──
// 不放两端、不夹相邻数字之间、优先挨着已翻牌
exports.pickInsert = function(handWithout, drawnJoker) {
  var bestPos = Math.floor(Math.random() * (handWithout.length + 1));
  var bestScore = -Infinity;
  for (var pos = 0; pos <= handWithout.length; pos++) {
    var lt = pos > 0 ? handWithout[pos - 1] : null;
    var rt = pos < handWithout.length ? handWithout[pos] : null;
    var score = 1;
    // 优先挨着已翻牌 (+3)
    if ((lt && lt.isRevealed) || (rt && rt.isRevealed)) score += 3;
    // 避免两端 (-2)
    if (pos === 0 || pos === handWithout.length) score -= 2;
    // 避免夹在相邻同色数字之间 (-2)
    if (lt && rt && !lt.isJoker && !rt.isJoker && lt.color === rt.color && Math.abs(lt.value - rt.value) === 1) score -= 2;
    // 偏好有间隙的位置 (+1)
    if (lt && rt && !lt.isJoker && !rt.isJoker && lt.color === rt.color && Math.abs(lt.value - rt.value) > 2) score += 1;
    if (score > bestScore) { bestScore = score; bestPos = pos; }
  }
  return bestPos;
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

    // 中位向空位多的方向偏移：nLeft 多 → 值偏大（需留空间给左侧），nRight 多 → 值偏小
    var bias = (c.nLeft || 0) - (c.nRight || 0);
    var rangeMid = (c.leftKey[0] + c.rightKey[0] + bias) / 2;
    var weights = [];
    var totalWeight = 0;
    // 对手暗牌总数（Joker 先验概率用）
    var oppUnrev = 0;
    C.getHand(gs.tiles, c.opp).forEach(function(ht) { if (!ht.isRevealed) oppUnrev++; });

    c.possible.forEach(function(pv) {
      var w;
      if (pv === -1) {
        // Joker 权重 = 未见 Joker 数 / (对手暗牌 + 1)，远低于数字值
        w = (2 - ((eval.oneSeen(-1,'black')?1:0) + (eval.oneSeen(-1,'white')?1:0))) / (oppUnrev + 1);
      } else {
        w = 1.0 / (1.0 + Math.abs(pv - rangeMid));
      }
      // 推断惩罚: 对手猜过的 (value,color) 降低该值权重
      var ik = pv + '_' + c.tileColor;
      if (eval.inferred[ik]) w *= (1.0 - C.inferredPenalty(eval.inferred[ik]));
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
              console.log('[AI-HARD] argmax update: opp=' + opp + ' pos=' + pos + ' val=' + val + ' conf=' + P[opp][pos][val].toFixed(3));
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
  var conf = C.estimateConfidence(gs.tiles, aiPlayer);
  if (conf.minCount === 1) return true;       // 100% 确定 → 必猜
  if (conf.totalUnrev <= 2) return true;      // 终局冲胜
  // 摸到 Joker → 降低意愿 (×0.6)；池空 → 无亮牌代价 (×1.5)
  var hasJokerDrawn = false;
  if (gs.drawnTileId) {
    var drawn = gs.tiles.find(function(t) { return t.id === gs.drawnTileId && t.owner === aiPlayer; });
    if (drawn && drawn.isJoker) hasJokerDrawn = true;
  }
  var poolTotal = gs.tiles.filter(function(t) { return t.owner === 'pool'; }).length;
  var factor = (hasJokerDrawn ? 0.6 : 1.0) * (poolTotal === 0 ? 1.5 : 1.0);
  if (conf.minCount === 2) return Math.random() < 0.55 * factor;
  if (conf.minCount === 3) return Math.random() < 0.35 * factor;
  return Math.random() < 0.20 * factor;
};
