/**
 * toggleReady —— 切换准备状态。
 */
module.exports = async function (event, caller, db) {
  const { roomId, isReady } = event;
  if (!roomId || isReady === undefined) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const res = await db.collection('rooms').where({ roomId: roomId.toUpperCase() }).get();
    if (res.data.length === 0) return { success: false, error: 'ROOM_NOT_FOUND', errorCode: 'ROOM_NOT_FOUND' };

    const room = res.data[0];
    if (room.status !== 'waiting') return { success: false, error: 'ROOM_NOT_WAITING', errorCode: 'ROOM_NOT_WAITING' };

    const player = room.players.find(p => p.openid === caller);
    if (!player) return { success: false, error: 'NOT_IN_ROOM', errorCode: 'NOT_IN_ROOM' };

    player.isReady = isReady;
    const humanPlayers = room.players.filter(p => !p.isAI);
    const allReady = humanPlayers.every(p => p.isReady);

    await db.collection('rooms').doc(room._id).update({
      data: { players: room.players, updatedAt: db.serverDate() },
    });

    return { success: true, data: { room: { players: room.players.map(p => ({ openid: p.openid, isReady: p.isReady })), allReady } } };
  } catch (e) {
    return { success: false, error: e.message || 'TOGGLE_READY_FAILED' };
  }
};
