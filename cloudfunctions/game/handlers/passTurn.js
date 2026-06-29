/**
 * passTurn —— 结束回合。
 * reveal=true（默认/猜错）: 亮摸牌 + 自动/手动插入
 * reveal=false（猜对后主动结束）: 不亮牌，自动插入 → 切回合
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId, reveal } = event;
  const shouldReveal = reveal !== false; // 默认 true
  if (!gameId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    if (gs.turnOrder[gs.turnIndex] !== caller) return { success: false, error: 'NOT_YOUR_TURN' };
    // 允许 WAITING + INSERTING 阶段直接切回合（AI Joker 放置等）
    if (gs.phase === E.Phase.WAITING || gs.phase === E.Phase.INSERTING) {
      gs.turnIndex = (gs.turnIndex + 1) % gs.turnOrder.length;
      gs.drawnTileId = null;
      gs.phase = E.Phase.WAITING;
      gs.turnLog.push({ turnNumber: gs.turnLog.length+1, playerOpenid: caller, action: 'pass', revealed: false, timestamp: new Date().toISOString() });
      await db.collection('games').doc(gameId).update({ data: {
        phase: gs.phase, turnIndex: gs.turnIndex, drawnTileId: null, turnLog: gs.turnLog, updatedAt: db.serverDate(),
      }});
      return { success: true, data: { nextTurnOpenid: gs.turnOrder[gs.turnIndex], nextPhase: gs.phase }};
    }
    if (gs.phase !== E.Phase.GUESSING) return { success: false, error: 'WRONG_PHASE' };

    let revealedTile = null;

    if (gs.drawnTileId) {
      if (shouldReveal) {
        gs.tiles = gs.tiles.map(t => {
          if (t.id !== gs.drawnTileId) return t;
          revealedTile = E.toSelfTile({ ...t, isRevealed: true });
          return { ...t, isRevealed: true };
        });
      }

      const drawn = gs.tiles.find(t => t.id === gs.drawnTileId);
      // Joker → 始终让用户手动选位置
      if (drawn && drawn.isJoker) {
        gs.phase = E.Phase.INSERTING;
        gs.turnLog.push({ turnNumber: gs.turnLog.length+1, playerOpenid: caller, action: 'pass', revealed: shouldReveal, timestamp: new Date().toISOString() });
        await db.collection('games').doc(gameId).update({ data: {
          tiles: gs.tiles, phase: gs.phase, drawnTileId: gs.drawnTileId, turnLog: gs.turnLog, updatedAt: db.serverDate(),
        }});
        return { success: true, data: { nextTurnOpenid: gs.turnOrder[gs.turnIndex], nextPhase: gs.phase, revealedTile }};
      }

      // 数字牌：自动插入
      if (drawn) {
        const hand = E.getPlayerHand(gs.tiles, caller);
        const handWithout = hand.filter(function(t) { return t.id !== gs.drawnTileId; });
        if (drawn.isJoker) {
          var insertPos = handWithout.length; // Joker 放末尾
        } else {
          var nonJoker = handWithout.filter(function(t) { return !t.isJoker; });
          var njPos = nonJoker.length;
          for (var i2 = 0; i2 <= nonJoker.length; i2++) {
            var lOk = i2===0 || (E.sortKey(nonJoker[i2-1])[0] <= E.sortKey(drawn)[0] && (E.sortKey(nonJoker[i2-1])[0] !== E.sortKey(drawn)[0] || E.sortKey(nonJoker[i2-1])[1] <= E.sortKey(drawn)[1]));
            var rOk = i2===nonJoker.length || (E.sortKey(drawn)[0] <= E.sortKey(nonJoker[i2])[0] && (E.sortKey(drawn)[0] !== E.sortKey(nonJoker[i2])[0] || E.sortKey(drawn)[1] <= E.sortKey(nonJoker[i2])[1]));
            if (lOk && rOk) { njPos = i2; break; }
          }
          var insertPos = 0, njCount = 0;
          for (var i3 = 0; i3 < handWithout.length; i3++) {
            if (njCount === njPos) { insertPos = i3; break; }
            if (!handWithout[i3].isJoker) njCount++;
            insertPos = i3 + 1;
          }
        }
        const without = hand.filter(t => t.id !== gs.drawnTileId);
        without.splice(insertPos, 0, drawn);
        without.forEach((t, i) => { t.position = i; });
        gs.tiles = gs.tiles.map(t => { const u = without.find(w => w.id === t.id); return u || t; });
      }
    }

    gs.drawnTileId = null;
    gs.turnIndex = (gs.turnIndex + 1) % gs.turnOrder.length;
    gs.phase = E.Phase.WAITING;
    gs.turnLog.push({ turnNumber: gs.turnLog.length+1, playerOpenid: caller, action: 'pass', revealed: shouldReveal, timestamp: new Date().toISOString() });

    await db.collection('games').doc(gameId).update({ data: {
      tiles: gs.tiles, phase: gs.phase, turnIndex: gs.turnIndex,
      drawnTileId: null, turnLog: gs.turnLog, updatedAt: db.serverDate(),
    }});

    return { success: true, data: { nextTurnOpenid: gs.turnOrder[gs.turnIndex], nextPhase: gs.phase, revealedTile }};
  } catch (e) {
    return { success: false, error: e.message || 'PASS_FAILED' };
  }
};
