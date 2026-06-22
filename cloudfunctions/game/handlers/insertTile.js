/**
 * insertTile —— 将摸到的牌插入手牌指定位置。
 * 输入: { gameId, position }
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId, position } = event;
  if (!gameId || position === undefined) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND', errorCode: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    if (gs.turnOrder[gs.turnIndex] !== caller) return { success: false, error: 'NOT_YOUR_TURN', errorCode: 'NOT_YOUR_TURN' };
    if (gs.phase !== E.Phase.INSERTING) return { success: false, error: 'WRONG_PHASE', errorCode: 'WRONG_PHASE' };
    if (!gs.drawnTileId) return { success: false, error: 'NO_DRAWN_TILE', errorCode: 'NO_DRAWN_TILE' };

    const hand = gs.hands[caller] || [];
    if (position < 0 || position > hand.length) {
      return { success: false, error: 'INVALID_POSITION', errorCode: 'INVALID_POSITION' };
    }

    // 找到摸的牌，从当前位置移除，插入目标位置
    const tileIdx = hand.findIndex(t => t.id === gs.drawnTileId);
    if (tileIdx === -1) return { success: false, error: 'NO_DRAWN_TILE', errorCode: 'NO_DRAWN_TILE' };

    const [tile] = hand.splice(tileIdx, 1);
    hand.splice(position, 0, tile);
    hand.forEach((t, i) => { t.position = i; });

    gs.hands[caller] = hand;
    gs.phase = E.Phase.GUESSING;
    gs.turnLog.push({ turnNumber: gs.turnLog.length + 1, playerOpenid: caller, action: 'insert', position, timestamp: new Date().toISOString() });

    await db.collection('games').doc(gameId).update({
      data: {
        hands: gs.hands,
        phase: gs.phase,
        turnLog: gs.turnLog,
        updatedAt: db.serverDate(),
      },
    });

    return {
      success: true,
      data: {
        hand: hand.map(E.toSelfTile),
        phase: gs.phase,
      },
    };
  } catch (e) {
    return { success: false, error: e.message || 'INSERT_FAILED' };
  }
};
