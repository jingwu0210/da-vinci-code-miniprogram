/**
 * user 云函数调用封装。
 */

const logger = require('../../utils/logger');

const FUNCTION_NAME = 'user';

var login = require('../../utils/login');

async function call(type, data) {
  data = data || {};
  // 游客/微信双模式身份标识
  data.touristId = login.getTouristId();
  data.userType = login.getUserType();
  try {
    var resp = await wx.cloud.callFunction({
      name: FUNCTION_NAME,
      data: Object.assign({ type: type }, data),
    });
    return resp.result;
  } catch (e) {
    logger.error('UserCall', 'type=' + type + ' failed', e);
    return { success: false, error: e.errMsg || 'CLOUD_CALL_FAILED' };
  }
}

module.exports = {
  login:           function () { return call('login'); },
  getProfile:      function (openid) { return call('getProfile', { openid: openid }); },
  updateProfile:   function (data) { return call('updateProfile', data); },
  getOpenid:       function () { return call('getOpenid'); },
  migrateRecords:  function (records) { return call('migrateRecords', { records: records }); },
};
