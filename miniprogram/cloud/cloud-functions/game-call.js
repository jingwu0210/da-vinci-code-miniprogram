/**
 * game 云函数调用封装。
 * 依赖: ../../utils/logger, ../../common/enums (ErrorCode)
 */

const logger = require('../../utils/logger');

const FUNCTION_NAME = 'game';

var login = require('../../utils/login');

async function call(type, data) {
  data = data || {};
  data.touristId = login.getTouristId();
  data.userType = login.getUserType();
  try {
    logger.debug('GameCall', 'type=' + type, data);
    var resp = await wx.cloud.callFunction({
      name: FUNCTION_NAME,
      data: Object.assign({ type: type }, data),
    });
    return resp.result;
  } catch (e) {
    logger.error('GameCall', `type=${type} failed`, e);
    return { success: false, error: e.errMsg || 'CLOUD_CALL_FAILED' };
  }
}

module.exports = {
  initGame:      (data) => call('initGame', data),
  getGameState:  (gameId) => call('getGameState', { gameId }),
  drawTile:      (gameId, color) => call('drawTile', { gameId, color }),
  insertTile:    (gameId, position) => call('insertTile', { gameId, position }),
  makeGuess:     (gameId, targetOpenid, position, value) =>
                   call('makeGuess', { gameId, targetOpenid, position, value }),
  passTurn:      (gameId, reveal) => call('passTurn', { gameId, reveal }),
  quitGame:      (gameId) => call('quitGame', { gameId }),
  aiMove:        (gameId, difficulty) => call('aiMove', { gameId, difficulty }),
};
