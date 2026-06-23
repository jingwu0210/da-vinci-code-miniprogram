/**
 * leaveRoom —— 移除玩家。房主顺延。空房删除。
 */
module.exports = async function (event, caller, db) {
  const { roomId } = event;
  if (!roomId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const res = await db.collection('rooms').where({ roomId: roomId.toUpperCase() }).get();
    if (res.data.length === 0) return { success: false, error: 'ROOM_NOT_FOUND', errorCode: 'ROOM_NOT_FOUND' };

    let room = res.data[0];
    room.players = room.players.filter(p => p.openid !== caller);

    if (room.players.length === 0) {
      await db.collection('rooms').doc(room._id).remove();
      return { success: true, data: { roomDeleted: true } };
    }

    if (room.creatorOpenid === caller) {
      room.creatorOpenid = room.players[0].openid;
    }

    room.players.forEach((p, i) => { p.seatIndex = i; });
    await db.collection('rooms').doc(room._id).update({
      data: { players: room.players, creatorOpenid: room.creatorOpenid, updatedAt: db.serverDate() },
    });

    return { success: true, data: { roomDeleted: false } };
  } catch (e) {
    return { success: false, error: e.message || 'LEAVE_ROOM_FAILED' };
  }
};
