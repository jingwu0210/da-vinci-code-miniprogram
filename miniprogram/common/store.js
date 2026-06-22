/**
 * 轻量全局 Event Store —— 发布订阅模式。
 * 所有跨页面的共享状态集中管理于此。
 * 依赖: 无。
 */

class AppStore {
  constructor() {
    this._state = {
      user: null,            // { openid, nickName, avatarUrl, isGuest }
      currentRoom: null,     // ClientRoom | null
      currentGameId: null,   // String | null
      settings: {
        soundEnabled: true,
        vibrationEnabled: true,
        animationSpeed: 'normal',
      },
    };
    this._listeners = {};
  }

  get(key) {
    return this._state[key];
  }

  set(key, value) {
    const prev = this._state[key];
    this._state[key] = value;
    if (prev !== value) {
      this._emit(key, value, prev);
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
