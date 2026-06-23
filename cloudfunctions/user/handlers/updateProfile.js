/**
 * updateProfile —— 更新自己的昵称/头像。
 */
module.exports = async function (event, caller, db) {
  const { nickName, avatarUrl } = event;

  try {
    const res = await db.collection('players').where({ openid: caller }).get();
    if (res.data.length === 0) return { success: false, error: 'USER_NOT_FOUND', errorCode: 'USER_NOT_FOUND' };

    const updateData = {};
    if (nickName !== undefined) {
      if (nickName.length > 20) return { success: false, error: 'NICKNAME_TOO_LONG', errorCode: 'NICKNAME_TOO_LONG' };
      updateData.nickName = nickName;
    }
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    if (Object.keys(updateData).length === 0) return { success: false, error: 'INVALID_PARAMS' };

    await db.collection('players').doc(res.data[0]._id).update({ data: updateData });

    return {
      success: true,
      data: {
        profile: { openid: caller, nickName: nickName ?? res.data[0].nickName, avatarUrl: avatarUrl ?? res.data[0].avatarUrl },
      },
    };
  } catch (e) {
    return { success: false, error: e.message || 'UPDATE_PROFILE_FAILED' };
  }
};
