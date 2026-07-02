/**
 * history 云函数调用封装。
 */

const logger = require('../../utils/logger');
var { getErrorMsg } = require('../../common/error-msg');

const FUNCTION_NAME = 'history';

async function call(type, data = {}) {
  try {
    const resp = await wx.cloud.callFunction({
      name: FUNCTION_NAME,
      data: { type, ...data },
    });
    const result = resp.result || {};
    if (!result.success && result.error) {
      result.error = getErrorMsg(result.error);
    }
    return result;
  } catch (e) {
    logger.error('HistoryCall', `type=${type} failed`, e);
    return { success: false, error: getErrorMsg(e.errMsg || 'CLOUD_CALL_FAILED') };
  }
}

module.exports = {
  saveRecord: (gameId) => call('saveRecord', { gameId }),
  getRecords: (page = 1, pageSize = 20) => call('getRecords', { page, pageSize }),
};
