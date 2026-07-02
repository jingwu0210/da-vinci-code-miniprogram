/**
 * quitGame —— 玩家主动退出对局。退出者所有未翻牌全部翻开，判为负方。
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId } = event;
  if (!gameId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    // 翻开退出者的所有未翻牌
    gs.tiles = gs.tiles.map(t => t.owner === caller ? { ...t, isRevealed: true } : t);
    gs.turnOrder = gs.turnOrder.filter(oid => oid !== caller);

    let winner = null, gameContinues = true;
    if (gs.turnOrder.length <= 1) {
      gs.status = 'finished'; gs.winner = gs.turnOrder[0] || null;
      gs.phase = E.Phase.WAITING; winner = gs.winner; gameContinues = false;
      // 更新房间状态为 finished
      if (gs.roomId) {
        await db.collection('rooms').where({ roomId: gs.roomId }).update({ data: { status: 'finished', updatedAt: db.serverDate() } });
      }
    } else {
      gs.turnIndex = gs.turnIndex % gs.turnOrder.length;
      gs.drawnTileId = null; gs.phase = E.Phase.WAITING;
    }

    gs.turnLog.push({ turnNumber: gs.turnLog.length+1, playerOpenid: caller, action: 'quit', timestamp: new Date().toISOString() });

    await db.collection('games').doc(gameId).update({ data: {
      tiles: gs.tiles, turnOrder: gs.turnOrder, turnIndex: gs.turnIndex,
      status: gs.status, winner: gs.winner || null, phase: gs.phase,
      drawnTileId: null, turnLog: gs.turnLog, updatedAt: db.serverDate(),
    }});

    return { success: true, data: { quit: true, remainingPlayers: gs.turnOrder.length, gameContinues, winner }};
  } catch (e) {
    return { success: false, error: e.message || 'QUIT_FAILED' };
  }
};
