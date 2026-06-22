/**
 * 设置页。
 * 依赖: model/cache/settings-cache, model/store/app-store, service/auth/auth-service, common/modal-helper
 */

const settingsCache = require('../../../common/settings-cache');
const store = require('../../../common/store');
const AuthService = require('../../../service/auth/auth-service');
const { showToast, showConfirm } = require('../../../common/modal-helper');
const local = require('../../../utils/local-storage');

Page({
  data: {
    settings: settingsCache.load(),
    user:      store.get('user'),
  },

  onToggleSound(e) {
    const val = e.detail.value;
    settingsCache.update('soundEnabled', val);
    store.update('settings', { soundEnabled: val });
    this.setData({ 'settings.soundEnabled': val });
  },

  onToggleVibration(e) {
    const val = e.detail.value;
    settingsCache.update('vibrationEnabled', val);
    store.update('settings', { vibrationEnabled: val });
    this.setData({ 'settings.vibrationEnabled': val });
  },

  onAnimationSpeedChange(e) {
    const val = e.detail.value;
    settingsCache.update('animationSpeed', val);
    store.update('settings', { animationSpeed: val });
    this.setData({ 'settings.animationSpeed': val });
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    AuthService.updateProfile({ avatarUrl });
    store.update('user', { avatarUrl });
    this.setData({ 'user.avatarUrl': avatarUrl });
  },

  onNicknameInput(e) {
    const nickName = e.detail.value;
    AuthService.updateProfile({ nickName });
    store.update('user', { nickName });
    this.setData({ 'user.nickName': nickName });
  },

  async onClearCache() {
    const ok = await showConfirm('清除缓存', '确定清除本地缓存？设置和历史记录将被清除。');
    if (ok) {
      local.clear();
      settingsCache.save(settingsCache.DEFAULT_SETTINGS);
      showToast('缓存已清除');
    }
  },
});
