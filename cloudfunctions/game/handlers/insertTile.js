/**
 * insertTile — 将 drawnTile 插入手牌指定位置。
 * 初始 Joker 摆放 + 摸牌 Joker 放置，统一在此处理。
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId, position } = event;
  if (!gameId || position === undefined) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    if (gs.turnOrder[gs.turnIndex] !== caller) return { success: false, error: 'NOT_YOUR_TURN' };
    if (gs.phase !== E.Phase.INSERTING) return { success: false, error: 'WRONG_PHASE' };
    if (!gs.drawnTileId) return { success: false, error: 'NO_DRAWN_TILE' };

    const hand = E.getPlayerHand(gs.tiles, caller);
    if (position < 0 || position > hand.length) return { success: false, error: 'INVALID_POSITION' };

    const tile = hand.find(t => t.id === gs.drawnTileId);
    if (!tile) return { success: false, error: 'NO_DRAWN_TILE' };

    if (tile && !tile.isJoker) {
      const leftTile = position > 0 ? hand[position - 1] : null;
      const rightTile = position < hand.length ? hand[position] : null;
      if ((leftTile && E.sortKey(leftTile)[0] > E.sortKey(tile)[0]) ||
          (rightTile && E.sortKey(tile)[0] > E.sortKey(rightTile)[0])) {
        return { success: false, error: 'INVALID_POSITION' };
      }
    }

    // 执行插入
    const without = hand.filter(t => t.id !== gs.drawnTileId);
    without.splice(position, 0, tile);
    without.forEach((t, i) => { t.position = i; });
    gs.tiles = gs.tiles.map(t => { const u = without.find(w => w.id === t.id); return u || t; });
    gs.turnLog.push({ turnNumber: gs.turnLog.length+1, playerOpenid: caller, action: 'insert', position, timestamp: new Date().toISOString() });

    // ═══════════════════════════════════════
    // A. 初始 Joker 摆放回合
    // ═══════════════════════════════════════
    if (gs.initialJokerTurn != null) {
      if (gs.jokersToPlace && gs.jokersToPlace.length > 0) {
        // 同玩家还有更多 Joker → 继续
        gs.drawnTileId = gs.jokersToPlace[0];
        gs.jokersToPlace = gs.jokersToPlace.slice(1);
        gs.phase = E.Phase.INSERTING;
      } else {
        // 当前玩家 Joker 放完 → 找下一个有 Joker 的玩家
        gs.jokersToPlace = null;
        gs.drawnTileId = null;
        gs.initialJokerTurn++;
        var found = false;
        while (gs.initialJokerTurn < gs.turnOrder.length) {
          var nextOid = gs.turnOrder[gs.initialJokerTurn];
          var nextJokers = (gs.initialJokers || {})[nextOid];
          if (nextJokers && nextJokers.length > 0) {
            gs.drawnTileId = nextJokers[0];
            gs.jokersToPlace = nextJokers.length > 1 ? nextJokers.slice(1) : null;
            gs.phase = E.Phase.INSERTING;
            found = true;
            break;
          }
          gs.initialJokerTurn++;
        }
        if (!found) {
          // 全部玩家 Joker 放完 → 正式回合开始（恢复原本先手）
          gs.initialJokerTurn = null;
          gs.initialJokers = null;
          gs.turnIndex = gs.originalTurnIndex || 0;
          gs.phase = E.Phase.DRAWING;
        }
      }

      await db.collection('games').doc(gameId).update({ data: {
        tiles: gs.tiles, phase: gs.phase, drawnTileId: gs.drawnTileId,
        jokersToPlace: gs.jokersToPlace, initialJokerTurn: gs.initialJokerTurn,
        initialJokers: gs.initialJokers, turnLog: gs.turnLog, updatedAt: db.serverDate(),
      }});
      return { success: true, data: { hand: E.getPlayerHand(gs.tiles, caller).map(E.toSelfTile), phase: gs.phase }};
    }

    // ═══════════════════════════════════════
    // B. 正式回合: 摸到的 Joker 放置 → 翻开 → 结束回合
    // ═══════════════════════════════════════
    if (tile && tile.isJoker) {
      // 猜错 Joker: 先放置再亮牌
      if (gs.jokerPendingReveal) {
        gs.tiles = gs.tiles.map(function(t) { return t.id !== tile.id ? t : Object.assign({}, t, { isRevealed: true }); });
        gs.jokerPendingReveal = null;
      }
      gs.drawnTileId = null;
      gs.turnIndex = (gs.turnIndex + 1) % gs.turnOrder.length;
      gs.phase = E.Phase.WAITING;

      await db.collection('games').doc(gameId).update({ data: {
        tiles: gs.tiles, phase: gs.phase, turnIndex: gs.turnIndex,
        drawnTileId: null, jokerPendingReveal: gs.jokerPendingReveal || null, turnLog: gs.turnLog, updatedAt: db.serverDate(),
      }});
      return { success: true, data: { hand: E.getPlayerHand(gs.tiles, caller).map(E.toSelfTile), phase: gs.phase }};
    }

    // ═══════════════════════════════════════
    // C. 正常插入 (数字牌)
    // ═══════════════════════════════════════
    gs.drawnTileId = null;
    gs.phase = E.Phase.GUESSING;

    await db.collection('games').doc(gameId).update({ data: {
      tiles: gs.tiles, phase: gs.phase, drawnTileId: null, turnLog: gs.turnLog, updatedAt: db.serverDate(),
    }});
    return { success: true, data: { hand: E.getPlayerHand(gs.tiles, caller).map(E.toSelfTile), phase: gs.phase }};
  } catch (e) {
    return { success: false, error: e.message || 'INSERT_FAILED' };
  }
};
