/**
 * getGameState —— 获取对局状态（sanitized 客户端视图）。
 * 用于进入对局页和断线重连。对手未翻牌仅暴露颜色+位置，不暴露数字。
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId } = event;
  if (!gameId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const docRef = await db.collection('games').doc(gameId).get();
    if (!docRef.data) return { success: false, error: 'GAME_NOT_FOUND', errorCode: 'GAME_NOT_FOUND' };

    const gameState = docRef.data;
    const clientView = E.getClientView(gameState, caller);

    // 获取对手的昵称和头像
    // 从 room 文档和 players 集合中查找
    const roomRes = await db.collection('rooms').where({ roomId: gameState.roomId }).get();
    const roomPlayers = (roomRes.data && roomRes.data[0]) ? roomRes.data[0].players : [];

    // 从 players 集合获取头像
    const opponentOpenids = clientView.opponents.map(o => o.openid);
    let profiles = {};
    if (opponentOpenids.length > 0) {
      const profileRes = await db.collection('players').where({
        openid: db.command.in(opponentOpenids)
      }).get();
      (profileRes.data || []).forEach(p => {
        profiles[p.openid] = { nickName: p.nickName || '', avatarUrl: p.avatarUrl || '' };
      });
    }

    // 为每个对手补充昵称和头像
    clientView.opponents.forEach(opp => {
      // 先从 profiles 查找，再从 room players 查找，最后兜底
      const profile = profiles[opp.openid] || {};
      const roomPlayer = roomPlayers.find(p => p.openid === opp.openid) || {};
      opp.nickName = profile.nickName || roomPlayer.nickName || '玩家';
      opp.avatarUrl = profile.avatarUrl || roomPlayer.avatarUrl || '';
    });

    return { success: true, data: clientView };
  } catch (e) {
    return { success: false, error: e.message || 'GET_STATE_FAILED' };
  }
};
