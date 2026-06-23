/**
 * getProfile —— 按 openid 查公开资料（对手信息展示）。
 */
module.exports = async function (event, caller, db) {
  const { openid } = event;
  if (!openid) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const res = await db.collection('players').where({ openid }).get();
    if (res.data.length === 0) return { success: false, error: 'USER_NOT_FOUND', errorCode: 'USER_NOT_FOUND' };

    const p = res.data[0];
    return {
      success: true,
      data: {
        profile: {
          openid: p.openid,
          nickName: p.nickName || '',
          avatarUrl: p.avatarUrl || '',
          stats: { totalGames: p.stats?.totalGames || 0, wins: p.stats?.wins || 0 },
        },
      },
    };
  } catch (e) {
    return { success: false, error: e.message || 'GET_PROFILE_FAILED' };
  }
};
