/**
 * joinRoom —— 校验并加入房间。
 */
module.exports = async function (event, caller, db) {
  const { roomId, password = '' } = event;
  if (!roomId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const res = await db.collection('rooms').where({ roomId: roomId.toUpperCase() }).get();
    if (res.data.length === 0) return { success: false, error: 'ROOM_NOT_FOUND', errorCode: 'ROOM_NOT_FOUND' };

    const room = res.data[0];
    if (room.status === 'playing') return { success: false, error: 'ROOM_STARTED', errorCode: 'ROOM_STARTED' };
    if (room.status === 'finished') return { success: false, error: 'ROOM_STARTED', errorCode: 'ROOM_STARTED' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'ROOM_FULL', errorCode: 'ROOM_FULL' };
    // 密码校验：统一转字符串比较（兼容数字/字符串存储）
    if (room.password && String(room.password) !== String(password)) return { success: false, error: 'WRONG_PASSWORD', errorCode: 'WRONG_PASSWORD' };
    if (room.players.some(p => p.openid === caller)) return { success: false, error: 'ALREADY_IN_ROOM', errorCode: 'ALREADY_IN_ROOM' };

    var joinerName = '';
    var joinerAvatar = '';
    if (!caller.startsWith('t_')) {
      try {
        var profileRes = await db.collection('players').where({ openid: caller }).get();
        if (profileRes.data && profileRes.data.length > 0) { joinerName = profileRes.data[0].nickName || ''; joinerAvatar = profileRes.data[0].avatarUrl || ''; }
      } catch (e) {}
    }
    if (!joinerName) joinerName = caller.startsWith('t_') ? '游客' + caller.slice(2, 6) : caller.substring(0, 10);
    room.players.push({ openid: caller, nickName: joinerName, avatarUrl: joinerAvatar, isReady: false, isAI: false, seatIndex: room.players.length });
    await db.collection('rooms').doc(room._id).update({
      data: { players: room.players, updatedAt: db.serverDate() },
    });

    return { success: true, data: { room } };
  } catch (e) {
    return { success: false, error: e.message || 'JOIN_ROOM_FAILED' };
  }
};
