/**
 * passTurn —— 结束猜测阶段。
 * 重要: pass = 猜错处理 —— 当前玩家的摸牌会被翻开 (isRevealed=true)。
 * 输入: { gameId }
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId } = event;
  if (!gameId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND', errorCode: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    if (gs.turnOrder[gs.turnIndex] !== caller) return { success: false, error: 'NOT_YOUR_TURN', errorCode: 'NOT_YOUR_TURN' };
    if (gs.phase !== E.Phase.GUESSING) return { success: false, error: 'WRONG_PHASE', errorCode: 'WRONG_PHASE' };

    // pass = 亮出摸的牌
    const myHand = gs.hands[caller] || [];
    let revealedTile = null;
    if (gs.drawnTileId) {
      const dt = myHand.find(t => t.id === gs.drawnTileId);
      if (dt) {
        dt.isRevealed = true;
        revealedTile = E.toSelfTile(dt);
      }
    }

    gs.drawnTileId = null;
    gs.phase = E.Phase.WAITING;
    const nextIdx = (gs.turnIndex + 1) % gs.turnOrder.length;
    gs.turnIndex = nextIdx;
    gs.turnLog.push({
      turnNumber: gs.turnLog.length + 1,
      playerOpenid: caller,
      action: 'pass',
      revealed: !!revealedTile,
      timestamp: new Date().toISOString(),
    });

    await db.collection('games').doc(gameId).update({
      data: {
        hands: gs.hands,
        phase: gs.phase,
        turnIndex: gs.turnIndex,
        drawnTileId: null,
        turnLog: gs.turnLog,
        updatedAt: db.serverDate(),
      },
    });

    return {
      success: true,
      data: {
        nextTurnOpenid: gs.turnOrder[nextIdx],
        nextPhase: gs.phase,
        revealedTile,
      },
    };
  } catch (e) {
    return { success: false, error: e.message || 'PASS_FAILED' };
  }
};
