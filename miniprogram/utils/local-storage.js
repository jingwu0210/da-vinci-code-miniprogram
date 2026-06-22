/**
 * 本地存储统一封装 —— try/catch 兜底 + key 常量管理。
 * 依赖: 无。
 */

function get(key, defaultValue = null) {
  try {
    const raw = wx.getStorageSync(key);
    return raw !== '' && raw !== undefined ? raw : defaultValue;
  } catch (e) {
    console.warn(`[Storage] get failed for key: ${key}`, e);
    return defaultValue;
  }
}

function set(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (e) {
    console.error(`[Storage] set failed for key: ${key}`, e);
    return false;
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (e) {
    console.error(`[Storage] remove failed for key: ${key}`, e);
    return false;
  }
}

function clear() {
  try {
    wx.clearStorageSync();
    return true;
  } catch (e) {
    console.error('[Storage] clear failed', e);
    return false;
  }
}

function getInfo() {
  try {
    return wx.getStorageInfoSync();
  } catch (e) {
    return { keys: [], currentSize: 0, limitSize: 10240 };
  }
}

module.exports = { get, set, remove, clear, getInfo };
