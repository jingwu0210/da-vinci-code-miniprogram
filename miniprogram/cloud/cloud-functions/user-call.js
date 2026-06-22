/**
 * user 云函数调用封装。
 */

const logger = require('../../utils/logger');

const FUNCTION_NAME = 'user';

async function call(type, data = {}) {
  try {
    const resp = await wx.cloud.callFunction({
      name: FUNCTION_NAME,
      data: { type, ...data },
    });
    return resp.result;
  } catch (e) {
    logger.error('UserCall', `type=${type} failed`, e);
    return { success: false, error: e.errMsg || 'CLOUD_CALL_FAILED' };
  }
}

module.exports = {
  login:          () => call('login'),
  getProfile:     (openid) => call('getProfile', { openid }),
  updateProfile:  (data) => call('updateProfile', data),
};
