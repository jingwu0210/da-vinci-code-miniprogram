/**
 * 登录工具 — 游客/微信双模式。
 */
var store = require('../common/store');
var historyCache = require('../common/history-cache');

function getTouristId() {
  return getApp().globalData.touristId;
}

function getUserType() {
  return store.get('userType') || 'tourist';
}

/** 微信静默登录 */
async function wxLogin() {
  var UserCall = require('../cloud/cloud-functions/user-call');
  var resp = await UserCall.login();
  if (resp.success) {
    store.set('user', Object.assign({}, resp.data.profile, { isGuest: false }));
    store.set('userType', 'wechat');
    return resp.data.profile;
  }
  throw new Error(resp.error || 'LOGIN_FAILED');
}

/** 退出登录，切回游客 */
function logout() {
  store.set('user', null);
  store.set('userType', 'tourist');
}

/** 游客本地记录读写 */
function getLocalRecords() { return historyCache.load(); }
function saveLocalRecord(record) { historyCache.prepend(record); }

/** 游客转微信：迁移本地缓存到云端 */
async function migrateLocalRecords() {
  var records = historyCache.load();
  if (!records.length) return 0;
  var UserCall = require('../cloud/cloud-functions/user-call');
  var resp = await UserCall.migrateRecords(records);
  if (resp.success) {
    wx.showToast({ title: '已迁移 ' + records.length + ' 条记录', icon: 'success' });
    return records.length;
  }
  return 0;
}

module.exports = {
  getTouristId, getUserType, wxLogin, logout,
  getLocalRecords, saveLocalRecord, migrateLocalRecords,
};
