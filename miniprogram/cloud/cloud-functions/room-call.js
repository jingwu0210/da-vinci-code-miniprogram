/**
 * room 云函数调用封装。
 */

const logger = require('../../utils/logger');
var login = require('../../utils/login');

const FUNCTION_NAME = 'room';

async function call(type, data) {
  data = data || {};
  data.touristId = login.getTouristId();
  data.userType = login.getUserType();
  try {
    var resp = await wx.cloud.callFunction({
      name: FUNCTION_NAME,
      data: Object.assign({ type: type }, data),
    });
    return resp.result;
  } catch (e) {
    logger.error('RoomCall', `type=${type} failed`, e);
    return { success: false, error: e.errMsg || 'CLOUD_CALL_FAILED' };
  }
}

module.exports = {
  createRoom:   (data) => call('createRoom', data),
  getRoom:      (roomId) => call('getRoom', { roomId }),
  joinRoom:     (roomId, password) => call('joinRoom', { roomId, password }),
  leaveRoom:    (roomId) => call('leaveRoom', { roomId }),
  disbandRoom:  (roomId) => call('disbandRoom', { roomId }),
  toggleReady:  (roomId, isReady) => call('toggleReady', { roomId, isReady }),
  startGame:    (roomId) => call('startGame', { roomId }),
};
