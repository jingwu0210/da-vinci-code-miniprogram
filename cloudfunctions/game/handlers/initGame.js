/**
 * initGame —— 创建对局，生成 games 文档，更新 rooms 状态。
 */
const GameEngine = require('./_engine');

module.exports = async function (event, caller, db) {
  const { roomId, players, mode, difficulty } = event;
  if (!roomId || !players || !mode) {
    return { success: false, error: 'INVALID_PARAMS' };
  }

  try {
    // 创建对局状态
    const gameState = GameEngine.createInitialState({ roomId, players, mode, difficulty });

    // 写入 games 集合
    const gameDoc = {
      roomId,
      mode,
      difficulty: difficulty || null,
      status: gameState.status,
      phase: gameState.phase,
      turnOrder: gameState.turnOrder,
      turnIndex: gameState.turnIndex,
      pool: gameState.pool,
      hands: gameState.hands,
      drawnTileId: null,
      winner: null,
      turnLog: [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };

    const res = await db.collection('games').add({ data: gameDoc });
    const gameId = res._id;

    // 更新 rooms 状态
    await db.collection('rooms').doc(roomId).update({
      data: { status: 'playing', gameId, updatedAt: db.serverDate() },
    });

    // 返回当前调用者的 sanitized 视图
    const clientView = GameEngine.getClientView(
      { ...gameState, _id: gameId },
      caller
    );

    return {
      success: true,
      data: {
        gameId,
        myHand: clientView.self.hand,
        turnOrder: gameState.turnOrder,
        currentTurnOpenid: gameState.turnOrder[gameState.turnIndex],
        poolRemaining: GameEngine.poolRemaining(gameState.pool),
      },
    };
  } catch (e) {
    return { success: false, error: e.message || 'INIT_GAME_FAILED' };
  }
};
