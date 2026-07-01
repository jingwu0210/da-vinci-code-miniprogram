/**
 * 轻量全局 Event Store —— 发布订阅模式。
 * 所有跨页面的共享状态集中管理于此。
 * 依赖: 无。
 */

class AppStore {
  constructor() {
    // 从 storage 恢复持久化字段
    var saved = {};
    try { saved = wx.getStorageSync('app_user') || {}; } catch (e) {}

    this._state = {
      user: saved.user || null,
      userType: saved.userType || 'tourist',
      currentRoom: null,
      currentGameId: null,
      settings: {
        soundEnabled: true,
        vibrationEnabled: true,
        animationSpeed: 'normal',
      },
    };
    this._listeners = {};
    this._persistKeys = ['user', 'userType'];  // 这些 key 写入时自动持久化
  }

  get(key) {
    return this._state[key];
  }

  set(key, value) {
    var prev = this._state[key];
    this._state[key] = value;
    if (prev !== value) {
      this._emit(key, value, prev);
    }
    // 自动持久化
    if (this._persistKeys.indexOf(key) >= 0) {
      try { wx.setStorageSync('app_user', Object.assign({}, wx.getStorageSync('app_user') || {}, this._state)); } catch (e) {}
    }
  }

  update(key, partial) {
    const prev = this._state[key];
    this._state[key] = { ...prev, ...partial };
    this._emit(key, this._state[key], prev);
  }

  on(key, callback) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(callback);
    // 返回取消订阅函数
    return () => {
      this._listeners[key] = (this._listeners[key] || []).filter(cb => cb !== callback);
    };
  }

  _emit(key, value, prev) {
    (this._listeners[key] || []).forEach(cb => {
      try { cb(value, prev); } catch (e) { console.error('[Store] listener error', e); }
    });
  }

  reset() {
    this._state.currentRoom = null;
    this._state.currentGameId = null;
  }
}

// 单例
const store = new AppStore();

module.exports = store;
