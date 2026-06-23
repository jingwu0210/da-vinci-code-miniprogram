/**
 * login —— 获取 OPENID，查/建玩家文档，返回 profile。
 */
module.exports = async function (event, caller, db) {
  try {
    const res = await db.collection('players').where({ openid: caller }).get();
    let profile;
    let isNewUser = false;

    if (res.data.length > 0) {
      profile = res.data[0];
      // 更新最后登录时间
      await db.collection('players').doc(profile._id).update({
        data: { lastLoginAt: db.serverDate() },
      });
    } else {
      isNewUser = true;
      const newPlayer = {
        openid: caller,
        nickName: '',
        avatarUrl: '',
        stats: { totalGames: 0, wins: 0, losses: 0, bestStreak: 0 },
        createdAt: db.serverDate(),
        lastLoginAt: db.serverDate(),
      };
      const addRes = await db.collection('players').add({ data: newPlayer });
      profile = { ...newPlayer, _id: addRes._id };
    }

    return {
      success: true,
      data: {
        profile: {
          openid: profile.openid,
          nickName: profile.nickName || '',
          avatarUrl: profile.avatarUrl || '',
          stats: profile.stats || { totalGames: 0, wins: 0, losses: 0, bestStreak: 0 },
          createdAt: profile.createdAt,
          lastLoginAt: profile.lastLoginAt,
        },
        isNewUser,
      },
    };
  } catch (e) {
    return { success: false, error: e.message || 'LOGIN_FAILED' };
  }
};
