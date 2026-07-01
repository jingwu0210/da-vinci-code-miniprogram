/**
 * game 云函数入口 —— 达芬奇密码核心游戏逻辑。
 * 遵循 quickstartFunctions 的 switch(event.type) 分发模式。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  // 游客优先用 touristId（wx.login 后 OPENID 仍有值，不能用 OPENID 区分）
  var isTourist = event.userType === 'tourist';
  var caller = event.callerOpenid || (isTourist ? event.touristId : cloud.getWXContext().OPENID);
  if (!caller) return { success: false, error: 'NOT_AUTHORIZED' };
  // 游客 ID 格式校验
  if (isTourist && event.touristId && !/^t_[a-z0-9]{10,20}$/.test(event.touristId)) {
    return { success: false, error: 'INVALID_TOURIST_ID' };
  }

  switch (event.type) {
    case 'initGame':     return require('./handlers/initGame')(event, caller, db);
    case 'getGameState': return require('./handlers/getGameState')(event, caller, db);
    case 'drawTile':     return require('./handlers/drawTile')(event, caller, db);
    case 'insertTile':   return require('./handlers/insertTile')(event, caller, db);
    case 'makeGuess':    return require('./handlers/makeGuess')(event, caller, db);
    case 'passTurn':     return require('./handlers/passTurn')(event, caller, db);
    case 'quitGame':     return require('./handlers/quitGame')(event, caller, db);
    case 'aiMove':       return require('./handlers/aiMove')(event, caller, db);
    default:
      return { success: false, error: 'UNKNOWN_TYPE', errorCode: 'INVALID_PARAMS' };
  }
};
