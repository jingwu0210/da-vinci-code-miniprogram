/**
 * game 云函数入口 —— 达芬奇密码核心游戏逻辑。
 * 遵循 quickstartFunctions 的 switch(event.type) 分发模式。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const caller = event.callerOpenid || cloud.getWXContext().OPENID;
  if (!caller) {
    return { success: false, error: 'NOT_AUTHORIZED', errorCode: 'NOT_AUTHORIZED' };
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
