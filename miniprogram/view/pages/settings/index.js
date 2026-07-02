/**
 * 设置页。
 * 依赖: model/cache/settings-cache, model/store/app-store, service/auth/auth-service, common/modal-helper
 */

const settingsCache = require('../../../common/settings-cache');
const store = require('../../../common/store');
const AuthService = require('../../../service/auth/auth-service');
const { showToast, showConfirm } = require('../../../common/modal-helper');
const { ROUTES } = require('../../../common/routes');
const local = require('../../../utils/local-storage');
const loginUtil = require('../../../utils/login');

Page({
  data: {
    settings: settingsCache.load(),
    user:      store.get('user'),
    userType:  store.get('userType') || 'tourist',
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

  async onClearHistory() {
    const ok = await showConfirm('清除缓存', '确定清除本地缓存？设置和历史记录将被清除。');
    if (ok) {
      local.clear();
      settingsCache.save(settingsCache.DEFAULT_SETTINGS);
      showToast('缓存已清除');
    }
  },
  async onClearLocalRecords() {
    var ok = await showConfirm('清除本地记录', '确定清除所有游客模式下的本地对局记录？此操作不可恢复。');
    if (!ok) return;
    wx.removeStorageSync('local_history');
    showToast('本地记录已清除');
  },

  async onTapLogin() {
    try {
      await AuthService.initSession();
      this.setData({ user: store.get('user'), userType: 'wechat' });
      showToast('登录成功');
    } catch (e) { showToast('登录失败'); }
  },

  async onTapMigrate() {
    try {
      var count = await loginUtil.migrateLocalRecords();
      showToast('已迁移 ' + count + ' 条');
    } catch (e) { showToast('迁移失败'); }
  },

  onTapLogout() {
    loginUtil.logout();
    this.setData({ user: null, userType: 'tourist' });
    wx.reLaunch({ url: ROUTES.LOGIN });
  },
});
