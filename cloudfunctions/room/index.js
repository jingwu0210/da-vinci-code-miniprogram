/**
 * room 云函数入口 —— 房间管理。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  var isTourist = event.userType === 'tourist';
  var caller = isTourist ? event.touristId : cloud.getWXContext().OPENID;
  if (!caller) return { success: false, error: 'NOT_AUTHORIZED' };
  if (isTourist && event.touristId && !/^t_[a-z0-9]{10,20}$/.test(event.touristId)) {
    return { success: false, error: 'INVALID_TOURIST_ID' };
  }

  switch (event.type) {
    case 'createRoom':   return require('./handlers/createRoom')(event, caller, db);
    case 'getRoom':      return require('./handlers/getRoom')(event, caller, db);
    case 'joinRoom':     return require('./handlers/joinRoom')(event, caller, db);
    case 'leaveRoom':    return require('./handlers/leaveRoom')(event, caller, db);
    case 'disbandRoom':  return require('./handlers/disbandRoom')(event, caller, db);
    case 'toggleReady':  return require('./handlers/toggleReady')(event, caller, db);
    case 'startGame':    return require('./handlers/startGame')(event, caller, db);
    default: return { success: false, error: 'UNKNOWN_TYPE', errorCode: 'INVALID_PARAMS' };
  }
};
