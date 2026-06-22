/**
 * quitGame —— 玩家主动退出对局。退出者所有未翻牌全部翻开，判为负方。
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId } = event;
  if (!gameId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND', errorCode: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    // 翻开退出者的所有未翻牌
    const hand = gs.hands[caller] || [];
    hand.forEach(t => { t.isRevealed = true; });
    gs.hands[caller] = hand;

    // turnOrder 移除该玩家
    gs.turnOrder = gs.turnOrder.filter(oid => oid !== caller);

    let winner = null;
    let gameContinues = true;

    if (gs.turnOrder.length <= 1) {
      // 只剩 1 人 → 自动获胜
      gs.status = 'finished';
      gs.winner = gs.turnOrder[0] || null;
      gs.phase = E.Phase.WAITING;
      winner = gs.winner;
      gameContinues = false;
    } else {
      // 继续游戏
      gs.turnIndex = gs.turnIndex % gs.turnOrder.length;
      gs.drawnTileId = null;
      gs.phase = E.Phase.WAITING;
    }

    gs.turnLog.push({
      turnNumber: gs.turnLog.length + 1,
      playerOpenid: caller,
      action: 'quit',
      timestamp: new Date().toISOString(),
    });

    await db.collection('games').doc(gameId).update({
      data: {
        hands: gs.hands,
        turnOrder: gs.turnOrder,
        turnIndex: gs.turnIndex,
        status: gs.status,
        winner: gs.winner || null,
        phase: gs.phase,
        drawnTileId: null,
        turnLog: gs.turnLog,
        updatedAt: db.serverDate(),
      },
    });

    return {
      success: true,
      data: {
        quit: true,
        remainingPlayers: gs.turnOrder.length,
        gameContinues,
        winner,
      },
    };
  } catch (e) {
    return { success: false, error: e.message || 'QUIT_FAILED' };
  }
};
