const E = require('./_engine');

exports.getHand = function(tiles, oid) {
  return tiles.filter(function(t) { return t.owner === oid; }).sort(function(a,b){return a.position-b.position;});
};
exports.getOpponents = function(tiles, oid) {
  var s={}; tiles.forEach(function(t){if(t.owner!=='pool'&&t.owner!==oid)s[t.owner]=true;}); return Object.keys(s);
};

/** 估算最佳猜测位置的候选数。minCount=1 表示有位置可 100% 确定。*/
exports.estimateConfidence = function(tiles, aiPlayer) {
  var seen = {};
  function mark(v, c) { if (!seen[v]) seen[v] = {}; seen[v][c] = true; }
  function bothSeen(v) { return seen[v] && seen[v].black && seen[v].white; }
  function oneSeen(v, c) { return seen[v] && seen[v][c]; }
  exports.getHand(tiles, aiPlayer).forEach(function(t) { mark(t.value, t.color); });
  tiles.filter(function(t) { return t.isRevealed; }).forEach(function(t) { mark(t.value, t.color); });

  var minCount = Infinity, totalUnrev = 0;
  var opps = exports.getOpponents(tiles, aiPlayer);
  opps.forEach(function(opp) {
    var hand = exports.getHand(tiles, opp);
    for (var i = 0; i < hand.length; i++) {
      var t = hand[i];
      if (t.isRevealed) continue;
      totalUnrev++;

      var lk = [-2,0];
      for (var j=i-1; j>=0; j--) { if (hand[j].isRevealed && !hand[j].isJoker) { lk = [hand[j].value, hand[j].color==='black'?0:1]; break; } }
      var rk = [13,0];
      for (var k=i+1; k<hand.length; k++) { if (hand[k].isRevealed && !hand[k].isJoker) { rk = [hand[k].value, hand[k].color==='black'?0:1]; break; } }

      var count = 0;
      for (var v=0; v<=11; v++) {
        if (bothSeen(v)) continue;
        if (oneSeen(v, t.color)) continue;
        var sk = [v, t.color==='black'?0:1];
        var lok = sk[0] > lk[0] || (sk[0]===lk[0] && sk[1] >= lk[1]);
        var rok = sk[0] < rk[0] || (sk[0]===rk[0] && sk[1] <= rk[1]);
        if (lok && rok) count++;
      }
      if (count === 0 && !oneSeen(-1, t.color)) count = 1;
      if (count > 0 && count < minCount) minCount = count;
    }
  });
  return { minCount: minCount === Infinity ? 0 : minCount, totalUnrev: totalUnrev };
};

// ═══════════════════════════════════════════════
// 共享 pickGuess 核心：评估对手所有未翻牌位的候选值
// ═══════════════════════════════════════════════

/**
 * 对每个对手未翻牌位做完整推理，返回候选列表。
 * Medium/Hard 共享此函数，各自按不同方式从候选中选择最终猜测。
 */
exports.evaluatePositions = function(gs, aiPlayer) {
  var tiles = gs.tiles;
  var opps = exports.getOpponents(tiles, aiPlayer);

  // ── seen 表 ──
  var seen = {};
  function mark(v, c) { if (!seen[v]) seen[v] = {}; seen[v][c] = true; }
  function bothSeen(v) { return seen[v] && seen[v].black && seen[v].white; }
  function oneSeen(v, c) { return seen[v] && seen[v][c]; }
  exports.getHand(tiles, aiPlayer).forEach(function(t) { mark(t.value, t.color); });
  tiles.filter(function(t) { return t.isRevealed; }).forEach(function(t) { mark(t.value, t.color); });

  // ── 否定信息 (tile ID 追踪 + 旧格式兼容) ──
  var negated = {};
  (gs.turnLog || []).forEach(function(log) {
    if (log.action === 'guess' && !log.isCorrect) {
      if (log.targetTileId) {
        negated[log.targetTileId + '_' + log.guessedValue] = true;
      } else {
        var thand = exports.getHand(tiles, log.targetOpenid);
        var tileAtPos = thand[log.position];
        if (tileAtPos && !tileAtPos.isRevealed && tileAtPos.color === log.targetColor) {
          negated[log.targetOpenid+'_'+log.position+'_'+log.guessedValue] = true;
        }
      }
    }
    // 对手猜测推断: 对手猜我的牌 → 对手没有该 (value,color)
    if (log.action === 'guess' && log.playerOpenid !== aiPlayer && log.targetColor) {
      mark(log.guessedValue, log.targetColor);
    }
  });

  // ── 遍历对手所有未翻牌位 ──
  var candidates = [];
  opps.forEach(function(opp) {
    var hand = exports.getHand(tiles, opp);
    for (var i = 0; i < hand.length; i++) {
      var t = hand[i];
      if (t.isRevealed) continue;

      // sortKey 上下界
      var leftKey = [-2,0];
      for (var j=i-1; j>=0; j--) { if (hand[j].isRevealed && !hand[j].isJoker) { leftKey = [hand[j].value, hand[j].color==='black'?0:1]; break; } }
      var rightKey = [13,0];
      for (var k=i+1; k<hand.length; k++) { if (hand[k].isRevealed && !hand[k].isJoker) { rightKey = [hand[k].value, hand[k].color==='black'?0:1]; break; } }

      // 空间约束
      var nRight = 0, nLeft = 0;
      for (var jj=i+1; jj<hand.length; jj++) { if (!hand[jj].isRevealed && hand[jj].color === t.color) nRight++; }
      for (var jj=i-1; jj>=0; jj--) { if (!hand[jj].isRevealed && hand[jj].color === t.color) nLeft++; }
      var seenJ = (oneSeen(-1,'black')?1:0) + (oneSeen(-1,'white')?1:0);
      var unseenJ = 2 - seenJ;
      var maxVal = 11 - Math.max(0, nRight - unseenJ);
      var minVal = Math.max(0, nLeft - unseenJ);

      // 候选值收集
      var possible = [];
      for (var v=0; v<=11; v++) {
        if (v < minVal || v > maxVal) continue;
        if (bothSeen(v)) continue;
        if (negated[t.id + '_' + v] || negated[opp + '_' + t.position + '_' + v]) continue;
        if (!oneSeen(v, t.color)) {
          var sk = [v, t.color==='black'?0:1];
          var lOk = sk[0] > leftKey[0] || (sk[0]===leftKey[0] && sk[1] >= leftKey[1]);
          var rOk = sk[0] < rightKey[0] || (sk[0]===rightKey[0] && sk[1] <= rightKey[1]);
          if (lOk && rOk) possible.push(v);
        }
      }

      // 空间约束二次过滤
      var filtered = [];
      for (var pi = 0; pi < possible.length; pi++) {
        var pv = possible[pi];
        if (pv === -1) { filtered.push(pv); continue; }
        var below = 0, above = 0;
        for (var bv = 0; bv < pv; bv++) { if (!oneSeen(bv, t.color)) below++; }
        for (var av = pv + 1; av <= 11; av++) { if (!oneSeen(av, t.color)) above++; }
        if (below >= nLeft && above >= nRight) filtered.push(pv);
      }
      possible = filtered;

      // Joker 推理
      var jokerNegated = negated[t.id + '_-1'] || negated[opp + '_' + t.position + '_-1'];
      var jokerColorSeen = oneSeen(-1, t.color);
      if (possible.length === 0 && !jokerColorSeen && !jokerNegated) { possible.push(-1); }
      else if (possible.length > 0 && Math.random()<0.1 && !jokerColorSeen && !jokerNegated) possible.push(-1);

      if (possible.length === 0) continue;

      // 否定信息标记 (hasNeg 用于 Medium 评分)
      var hasNeg = false;
      for (var vv=0; vv<=11; vv++) {
        if (negated[t.id+'_'+vv] || negated[opp+'_'+t.position+'_'+vv]) { hasNeg = true; break; }
      }

      candidates.push({ opp: opp, pos: t.position, tileId: t.id, tileColor: t.color,
        leftKey: leftKey, rightKey: rightKey, possible: possible, hasNeg: hasNeg });
    }
  });

  return { candidates: candidates, opps: opps, seen: seen, negated: negated,
    bothSeen: bothSeen, oneSeen: oneSeen, mark: mark };
};

/**
 * 兜底猜测: position 感知 fallback，不猜违反排序的值。
 */
exports.pickFallback = function(opps, tiles, seen, negated, bothSeen, oneSeen) {
  var fo = opps[0];
  var fhand = exports.getHand(tiles, fo);
  var fh = fhand.filter(function(t){return !t.isRevealed;});
  if (!fh.length && opps[1]) { fo = opps[1]; fhand = exports.getHand(tiles, fo); fh = fhand.filter(function(t){return !t.isRevealed;}); }
  if (!fh.length) return { target: fo, position: 0, value: Math.floor(Math.random()*12) };

  var ft = fh[0];
  var fi = fhand.indexOf(ft);
  var fLeft = [-2,0];
  for (var fj=fi-1; fj>=0; fj--) { if (fhand[fj].isRevealed && !fhand[fj].isJoker) { fLeft = [fhand[fj].value, fhand[fj].color==='black'?0:1]; break; } }
  var fRight = [13,0];
  for (var fk=fi+1; fk<fhand.length; fk++) { if (fhand[fk].isRevealed && !fhand[fk].isJoker) { fRight = [fhand[fk].value, fhand[fk].color==='black'?0:1]; break; } }

  var fav = [];
  for (var fx=0; fx<=11; fx++) {
    if (bothSeen(fx)) continue;
    if (!oneSeen(fx, ft.color)) {
      var fsk = [fx, ft.color==='black'?0:1];
      var flOk = fsk[0] > fLeft[0] || (fsk[0]===fLeft[0] && fsk[1] >= fLeft[1]);
      var frOk = fsk[0] < fRight[0] || (fsk[0]===fRight[0] && fsk[1] <= fRight[1]);
      if (flOk && frOk) fav.push(fx);
    }
  }
  if (!fav.length) { for (var fx2=0; fx2<=11; fx2++) { if (!bothSeen(fx2)) fav.push(fx2); } }
  if (!fav.length) fav.push(Math.floor(Math.random()*12));
  var fjSeen = oneSeen(-1, ft.color);
  var fjNeg = negated[ft.id + '_-1'] || negated[fo + '_' + ft.position + '_-1'];
  if (!fjSeen && !fjNeg) {
    if (fav.length === 0 || Math.random() < 0.1) fav.push(-1);
  }
  return { target: fo, position: ft.position, value: fav[Math.floor(Math.random()*fav.length)] };
};

/**
 * shouldContinue 通用实现。各策略只需传入不同概率。
 */
exports.shouldContinueWithProbs = function(gs, aiPlayer, consecutiveCorrect, p2, p3, pDefault) {
  var conf = exports.estimateConfidence(gs.tiles, aiPlayer);
  if (conf.minCount === 1) return true;
  if (conf.totalUnrev <= 2) return true;
  if (conf.minCount === 2) return Math.random() < p2;
  if (conf.minCount === 3) return Math.random() < p3;
  return Math.random() < pDefault;
};

/** 执行一轮 AI 回合 */
exports.doMove = async function(gs, caller, gameId, db, strategy) {
  var actions = [];
  var pool = E.poolRemaining(gs.tiles);
  if (pool.total === 0) { gs.drawnTileId = null; gs.phase = E.Phase.GUESSING; }

  // Joker 放置
  var hadJokers = false;
  while (gs.phase === E.Phase.INSERTING && gs.drawnTileId) {
    hadJokers = true;
    var hand = exports.getHand(gs.tiles, caller);
    var joker = hand.find(function(t) { return t.id === gs.drawnTileId; });
    if (!joker) break;
    var pos = Math.floor(Math.random() * (hand.length));
    await require('./insertTile')({ gameId: gameId, position: pos }, caller, db);
    actions.push({ action: 'insert', position: pos });
    gs = (await db.collection('games').doc(gameId).get()).data;
  }
  if (hadJokers && gs.phase !== E.Phase.DRAWING && gs.phase !== E.Phase.WAITING) {
    gs.turnIndex = (gs.turnIndex + 1) % gs.turnOrder.length;
    await db.collection('games').doc(gameId).update({ data: { phase: 'waiting', turnIndex: gs.turnIndex, drawnTileId: null, updatedAt: db.serverDate() }});
    actions.push({ action: 'pass' });
    return { actions: actions, gameOver: false };
  }

  // 摸牌
  var color = strategy.pickColor(pool);
  var dr = await require('./drawTile')({ gameId: gameId, color: color }, caller, db);
  if (!dr.success) { actions.push({ action: 'pass' }); return { actions: actions, gameOver: false }; }
  actions.push({ action: 'draw', color: color });
  gs = (await db.collection('games').doc(gameId).get()).data;

  // 插牌
  var hand2 = exports.getHand(gs.tiles, caller);
  var drawn = hand2.find(function(t) { return t.id === gs.drawnTileId; });
  if (drawn) {
    var without2 = hand2.filter(function(t) { return t.id !== gs.drawnTileId; });
    var ipos = strategy.pickInsert(without2, drawn);
    await require('./insertTile')({ gameId: gameId, position: ipos }, caller, db);
    actions.push({ action: 'insert', position: ipos });
    gs = (await db.collection('games').doc(gameId).get()).data;
  }

  // 猜测
  for (var round = 0; round < 3; round++) {
    if (E.allOpponentsEliminated(gs.tiles, caller)) break;
    if (gs.phase !== E.Phase.GUESSING) break;
    var guess = strategy.pickGuess(gs, caller);
    if (!guess) break;
    var gr = await require('./makeGuess')({ gameId: gameId, targetOpenid: guess.target, position: guess.position, value: guess.value }, caller, db);
    if (!gr.success) break;
    actions.push({ action: 'guess', target: guess.target, position: guess.position, value: guess.value, isCorrect: gr.data.isCorrect });
    gs = (await db.collection('games').doc(gameId).get()).data;
    if (gr.data.gameOver) return { actions: actions, gameOver: true, winner: gr.data.winner };
    if (!gr.data.isCorrect) break;
    if (!strategy.shouldContinue(true, round)) break;
  }

  // pass
  gs = (await db.collection('games').doc(gameId).get()).data;
  if (gs.phase === E.Phase.GUESSING) {
    await require('./passTurn')({ gameId: gameId, reveal: false }, caller, db);
    actions.push({ action: 'pass' });
  }
  return { actions: actions, gameOver: false };
};
