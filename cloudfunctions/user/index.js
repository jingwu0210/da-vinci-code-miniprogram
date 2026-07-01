/**
 * user 云函数入口 —— 用户管理。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const caller = cloud.getWXContext().OPENID;

  switch (event.type) {
    case 'getOpenid':      return { success: true, data: { openid: caller || null } };
    case 'login':          if (!caller) return { success: false, error: 'NOT_AUTHORIZED' }; return require('./handlers/login')(event, caller, db);
    case 'getProfile':     if (!caller) return { success: false, error: 'NOT_AUTHORIZED' }; return require('./handlers/getProfile')(event, caller, db);
    case 'updateProfile':  if (!caller) return { success: false, error: 'NOT_AUTHORIZED' }; return require('./handlers/updateProfile')(event, caller, db);
    case 'migrateRecords': if (!caller) return { success: false, error: 'NOT_AUTHORIZED' }; return migrateRecords(event, caller, db);
    default: return { success: false, error: 'UNKNOWN_TYPE' };
  }
};

/** 游客转微信：批量迁移本地缓存对局到云端 */
async function migrateRecords(event, caller, db) {
  var records = event.records || [];
  if (!records.length) return { success: true, data: { migrated: 0 } };
  var count = 0;
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    try {
      // 确保记录属于当前微信用户
      var doc = Object.assign({}, r, { openid: caller, createdAt: db.serverDate() });
      await db.collection('game_records').add({ data: doc });
      count++;
    } catch (e) { /* skip duplicate/failed */ }
  }
  return { success: true, data: { migrated: count } };
}
