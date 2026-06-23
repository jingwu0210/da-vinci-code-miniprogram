/**
 * room 云函数入口 —— 房间管理。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const caller = cloud.getWXContext().OPENID;
  if (!caller) return { success: false, error: 'NOT_AUTHORIZED', errorCode: 'NOT_AUTHORIZED' };

  switch (event.type) {
    case 'createRoom':   return require('./handlers/createRoom')(event, caller, db);
    case 'joinRoom':     return require('./handlers/joinRoom')(event, caller, db);
    case 'leaveRoom':    return require('./handlers/leaveRoom')(event, caller, db);
    case 'toggleReady':  return require('./handlers/toggleReady')(event, caller, db);
    case 'startGame':    return require('./handlers/startGame')(event, caller, db);
    default: return { success: false, error: 'UNKNOWN_TYPE', errorCode: 'INVALID_PARAMS' };
  }
};
