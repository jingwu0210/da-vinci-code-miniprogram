/**
 * makeGuess ★ 核心 —— 猜测对手某张牌的数字。
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId, targetOpenid, position, value } = event;
  if (!gameId || !targetOpenid || position === undefined || value === undefined) {
    return { success: false, error: 'INVALID_PARAMS' };
  }

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    if (gs.status !== 'playing') return { success: false, error: 'GAME_ALREADY_FINISHED' };
    if (gs.turnOrder[gs.turnIndex] !== caller) return { success: false, error: 'NOT_YOUR_TURN' };
    if (gs.phase !== E.Phase.GUESSING) return { success: false, error: 'WRONG_PHASE' };
    if (targetOpenid === caller) return { success: false, error: 'INVALID_TARGET' };

    const targetHand = E.getPlayerHand(gs.tiles, targetOpenid);
    if (!targetHand.length) return { success: false, error: 'INVALID_TARGET' };
    if (position < 0 || position >= targetHand.length) return { success: false, error: 'INVALID_POSITION' };

    const targetTile = targetHand[position];
    if (!targetTile || targetTile.isRevealed) return { success: false, error: 'ALREADY_REVEALED' };

    const isCorrect = E.isGuessMatch({ value }, targetTile);

    gs.turnLog.push({ turnNumber: gs.turnLog.length+1, playerOpenid: caller, action: 'guess',
      targetOpenid, position, guessedValue: value, isCorrect, targetColor: targetTile.color, targetTileId: targetTile.id, timestamp: new Date().toISOString() });

    if (isCorrect) {
      // 猜对：翻开对手牌
      gs.tiles = gs.tiles.map(t => t.id === targetTile.id ? { ...t, isRevealed: true } : t);

      if (E.allOpponentsEliminated(gs.tiles, caller)) {
        gs.status = 'finished'; gs.winner = caller; gs.phase = E.Phase.WAITING;
        await db.collection('games').doc(gameId).update({ data: {
          tiles: gs.tiles, status: gs.status, winner: gs.winner, phase: gs.phase, turnLog: gs.turnLog, updatedAt: db.serverDate(),
        }});
        return { success: true, data: { isCorrect: true, revealedTile: E.toOpponentTile(targetTile), gameOver: true, winner: caller, nextPhase: 'game_over' }};
      }

      await db.collection('games').doc(gameId).update({ data: { tiles: gs.tiles, turnLog: gs.turnLog, updatedAt: db.serverDate() }});
      return { success: true, data: { isCorrect: true, revealedTile: E.toOpponentTile(targetTile), gameOver: false, nextPhase: E.Phase.GUESSING }};
    }

    // 猜错：翻开自己摸的牌（Joker 除外——先插入再翻开）
    let myRevealedTile = null;
    var isJokerDrawn = false;
    if (gs.drawnTileId) {
      var drawnTile = gs.tiles.find(t => t.id === gs.drawnTileId);
      if (drawnTile && drawnTile.isJoker) {
        isJokerDrawn = true;
        // Joker: 先不翻开，标记待 insertTile 放置后翻开
        gs.jokerPendingReveal = true;
      } else if (gs.drawnTileId) {
        gs.tiles = gs.tiles.map(t => {
          if (t.id !== gs.drawnTileId) return t;
          myRevealedTile = E.toSelfTile({ ...t, isRevealed: true });
          return { ...t, isRevealed: true };
        });
      }
    }

    let nextPhase = E.Phase.WAITING, nextTurnIdx = gs.turnIndex;
    if (gs.drawnTileId) {
      const drawn = gs.tiles.find(t => t.id === gs.drawnTileId);
      if (drawn && drawn.isJoker) {
        nextPhase = E.Phase.INSERTING; // Joker: 用户自选位置
      } else if (drawn) {
        // 数字牌: 自动插入唯一正确位置
        const hand = E.getPlayerHand(gs.tiles, caller);
        const handWithout = hand.filter(function(t) { return t.id !== gs.drawnTileId; });
        // 只对非 Joker 牌计算位置，避免 Joker 的 Infinity 干扰
        var nonJoker = handWithout.filter(function(t) { return !t.isJoker; });
        var njPos = nonJoker.length;
        for (var i2 = 0; i2 <= nonJoker.length; i2++) {
          var lOk = i2===0 || (E.sortKey(nonJoker[i2-1])[0] <= E.sortKey(drawn)[0] && (E.sortKey(nonJoker[i2-1])[0] !== E.sortKey(drawn)[0] || E.sortKey(nonJoker[i2-1])[1] <= E.sortKey(drawn)[1]));
          var rOk = i2===nonJoker.length || (E.sortKey(drawn)[0] <= E.sortKey(nonJoker[i2])[0] && (E.sortKey(drawn)[0] !== E.sortKey(nonJoker[i2])[0] || E.sortKey(drawn)[1] <= E.sortKey(nonJoker[i2])[1]));
          if (lOk && rOk) { njPos = i2; break; }
        }
        // 非 Joker 位置映射回完整手牌位置
        var insertPos = 0, njCount = 0;
        for (var i3 = 0; i3 < handWithout.length; i3++) {
          if (njCount === njPos) { insertPos = i3; break; }
          if (!handWithout[i3].isJoker) njCount++;
          insertPos = i3 + 1;
        }
        const without = hand.filter(function(t) { return t.id !== gs.drawnTileId; });
        without.splice(insertPos, 0, drawn);
        without.forEach((t, i) => { t.position = i; });
        gs.tiles = gs.tiles.map(t => {
          const u = without.find(w => w.id === t.id);
          return u || t;
        });
        gs.drawnTileId = null;
        nextTurnIdx = (gs.turnIndex + 1) % gs.turnOrder.length;
      }
    } else {
      nextTurnIdx = (gs.turnIndex + 1) % gs.turnOrder.length;
    }

    gs.phase = nextPhase;
    gs.turnIndex = nextTurnIdx;

    await db.collection('games').doc(gameId).update({ data: {
      tiles: gs.tiles, phase: gs.phase, turnIndex: gs.turnIndex,
      drawnTileId: gs.drawnTileId || null, jokerPendingReveal: gs.jokerPendingReveal || null, turnLog: gs.turnLog, updatedAt: db.serverDate(),
    }});

    return { success: true, data: {
      isCorrect: false, myRevealedTile, gameOver: false,
      nextPhase, nextTurnOpenid: gs.turnOrder[gs.turnIndex],
    }};
  } catch (e) {
    return { success: false, error: e.message || 'GUESS_FAILED' };
  }
};
