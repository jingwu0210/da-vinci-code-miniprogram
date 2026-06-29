/**
 * initGame — 创建对局，处理初始 Joker 摆放回合。
 */
const GameEngine = require('./_engine');

module.exports = async function (event, caller, db) {
  const { roomId, players, mode, difficulty, testHands, testFirstPlayer } = event;
  if (!roomId || !players || !mode) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const gameState = testHands
      ? GameEngine.createControlledState({ roomId, players, mode, difficulty, hands: testHands, firstPlayer: testFirstPlayer })
      : GameEngine.createInitialState({ roomId, players, mode, difficulty });

    // 收集所有玩家初始 Joker
    var initialJokers = {};
    var anyJokers = false;
    gameState.turnOrder.forEach(function(oid) {
      var hand = GameEngine.getPlayerHand(gameState.tiles, oid);
      var jokers = hand.filter(function(t) { return t.isJoker; });
      if (jokers.length > 0) { initialJokers[oid] = jokers.map(function(t) { return t.id; }); anyJokers = true; }
    });

    // 首个玩家 Joker 设置
    var ijTurn = 0, drawnId = null, jtp = null;
    if (anyJokers) {
      // 跳过没有 Joker 的前几个玩家
      while (ijTurn < gameState.turnOrder.length) {
        var oid = gameState.turnOrder[ijTurn];
        if (initialJokers[oid] && initialJokers[oid].length > 0) {
          drawnId = initialJokers[oid][0];
          jtp = initialJokers[oid].length > 1 ? initialJokers[oid].slice(1) : null;
          break;
        }
        ijTurn++;
      }
      if (ijTurn >= gameState.turnOrder.length) { anyJokers = false; ijTurn = null; }
    } else { ijTurn = null; }

    const gameDoc = {
      roomId, mode, difficulty: difficulty || null,
      status: gameState.status,
      phase: anyJokers ? 'inserting' : gameState.phase,
      turnOrder: gameState.turnOrder,
      turnIndex: anyJokers ? ijTurn : gameState.turnIndex,
      originalTurnIndex: gameState.turnIndex,
      tiles: gameState.tiles,
      drawnTileId: drawnId,
      jokersToPlace: jtp,
      initialJokers: initialJokers,
      initialJokerTurn: ijTurn,
      winner: null, turnLog: [],
      createdAt: db.serverDate(), updatedAt: db.serverDate(),
    };

    const res = await db.collection('games').add({ data: gameDoc });
    const gameId = res._id;

    await db.collection('rooms').doc(roomId).update({ data: { status: 'playing', gameId, updatedAt: db.serverDate() } });

    const clientView = GameEngine.getClientView({ ...gameState, _id: gameId }, caller);
    return { success: true, data: { gameId, myHand: clientView.self.hand, turnOrder: gameState.turnOrder, currentTurnOpenid: gameState.turnOrder[gameState.turnIndex], poolRemaining: GameEngine.poolRemaining(gameState.tiles) }};
  } catch (e) {
    return { success: false, error: e.message || 'INIT_GAME_FAILED' };
  }
};
