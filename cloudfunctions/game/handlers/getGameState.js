/**
 * getGameState —— 获取对局状态（sanitized 客户端视图）。
 * 用于进入对局页和断线重连。对手未翻牌仅暴露颜色+位置，不暴露数字。
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId } = event;
  if (!gameId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND', errorCode: 'GAME_NOT_FOUND' };

    const clientView = E.getClientView(doc.data, caller);
    return { success: true, data: clientView };
  } catch (e) {
    return { success: false, error: e.message || 'GET_STATE_FAILED' };
  }
};
