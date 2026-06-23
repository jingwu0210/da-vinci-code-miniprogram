/**
 * user 云函数入口 —— 用户管理。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const caller = cloud.getWXContext().OPENID;
  if (!caller) return { success: false, error: 'NOT_AUTHORIZED', errorCode: 'NOT_AUTHORIZED' };

  switch (event.type) {
    case 'login':          return require('./handlers/login')(event, caller, db);
    case 'getProfile':     return require('./handlers/getProfile')(event, caller, db);
    case 'updateProfile':  return require('./handlers/updateProfile')(event, caller, db);
    default: return { success: false, error: 'UNKNOWN_TYPE', errorCode: 'INVALID_PARAMS' };
  }
};
