/**
 * createRoom —— 生成 6 位房间码 → 写入 rooms 集合。
 */
module.exports = async function (event, caller, db) {
  const { mode, maxPlayers = 2, password = '', difficulty = null } = event;
  if (!mode || !['ai', 'friends'].includes(mode)) return { success: false, error: 'INVALID_MODE', errorCode: 'INVALID_MODE' };
  if (maxPlayers < 2 || maxPlayers > 4) return { success: false, error: 'INVALID_PLAYER_COUNT', errorCode: 'INVALID_PLAYER_COUNT' };

  try {
    // 生成唯一 6 位房间码
    let roomId;
    let exists = true;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    while (exists) {
      roomId = '';
      for (let i = 0; i < 6; i++) roomId += chars.charAt(Math.floor(Math.random() * chars.length));
      const check = await db.collection('rooms').where({ roomId }).get();
      exists = check.data.length > 0;
    }

    // 查询创建者昵称头像
    var creatorName = '';
    var creatorAvatar = '';
    if (!caller.startsWith('t_')) {
      try {
        var profileRes = await db.collection('players').where({ openid: caller }).get();
        if (profileRes.data && profileRes.data.length > 0) {
          creatorName = profileRes.data[0].nickName || '';
          creatorAvatar = profileRes.data[0].avatarUrl || '';
        }
      } catch (e) { /* ignore */ }
    }
    if (!creatorName) creatorName = caller.startsWith('t_') ? '游客' + caller.slice(2, 6) : caller.substring(0, 10);

    const players = [{ openid: caller, nickName: creatorName, avatarUrl: creatorAvatar, isReady: mode === 'ai', isAI: false, seatIndex: 0 }];

    // AI 模式：自动添加 AI 玩家
    if (mode === 'ai') {
      players.push({ openid: `ai_${roomId}`, nickName: 'AI', avatarUrl: '', isReady: true, isAI: true, seatIndex: 1 });
    }

    const room = {
      roomId,
      mode,
      maxPlayers,
      password: String(password || ''),
      difficulty,
      creatorOpenid: caller,
      status: 'waiting',
      players,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };

    await db.collection('rooms').add({ data: room });

    return { success: true, data: { room } };
  } catch (e) {
    return { success: false, error: e.message || 'ROOM_CREATE_FAILED' };
  }
};
