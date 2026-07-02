/**
 * startGame —— 校验全员准备 → 调用 game.initGame。
 */
const cloud = require('wx-server-sdk');
module.exports = async function (event, caller, db) {
  const { roomId } = event;
  if (!roomId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const res = await db.collection('rooms').where({ roomId: roomId.toUpperCase() }).get();
    if (res.data.length === 0) return { success: false, error: 'ROOM_NOT_FOUND', errorCode: 'ROOM_NOT_FOUND' };

    const room = res.data[0];
    if (room.creatorOpenid !== caller) return { success: false, error: 'NOT_ROOM_CREATOR', errorCode: 'NOT_ROOM_CREATOR' };
    if (room.status !== 'waiting') return { success: false, error: 'ROOM_ALREADY_STARTED', errorCode: 'ROOM_ALREADY_STARTED' };

    const humanPlayers = room.players.filter(p => !p.isAI);
    const allReady = humanPlayers.every(p => p.isReady);
    if (!allReady) return { success: false, error: 'NOT_ALL_READY', errorCode: 'NOT_ALL_READY' };

    // 构造 AI 玩家（人机模式）
    const players = room.players.map(p => ({
      openid: p.openid,
      isAI: room.mode === 'ai' && p.openid !== caller,
    }));

    // 调用 game 云函数，显式传入 callerOpenid 避免跨云函数丢失身份
    const gameResult = await cloud.callFunction({
      name: 'game',
      data: { _internal: true, type: 'initGame', callerOpenid: caller, roomId, players, mode: room.mode, difficulty: room.difficulty },
    });

    if (!gameResult.result.success) return gameResult.result;

    return { success: true, data: { gameId: gameResult.result.data.gameId, roomId } };
  } catch (e) {
    return { success: false, error: e.message || 'START_GAME_FAILED' };
  }
};
