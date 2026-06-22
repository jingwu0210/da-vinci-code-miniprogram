/**
 * 登录页 —— 微信授权、游客模式、用户协议。
 * 依赖: service/auth/auth-service, common/modal-helper, common/routes, model/store/app-store
 */

const AuthService = require('../../../service/auth/auth-service');
const { showToast } = require('../../../common/modal-helper');
const { ROUTES, buildRoute } = require('../../../common/routes');
const store = require('../../../common/store');

Page({
  data: {
    loading: true,
    roomId: null,         // 分享进入时透传
  },

  onLoad(options) {
    this._roomId = options.roomId || null;
    this._checkExistingAuth();
  },

  async _checkExistingAuth() {
    const user = store.get('user');
    if (user && !user.isGuest) {
      this._goLobby();
      return;
    }
    this.setData({ loading: false });
  },

  async onTapLogin() {
    this.setData({ loading: true });
    try {
      await AuthService.initSession();
      this._goLobby();
    } catch (e) {
      showToast('登录失败，请重试');
      this.setData({ loading: false });
    }
  },

  onTapGuest() {
    AuthService.tryGuestMode();
    this._goLobby();
  },

  onTapUserAgreement() {
    wx.navigateTo({ url: '/pages/webview/index?type=user_agreement' });
  },

  onTapPrivacyPolicy() {
    wx.navigateTo({ url: '/pages/webview/index?type=privacy_policy' });
  },

  _goLobby() {
    const path = this._roomId
      ? buildRoute(ROUTES.LOBBY, { roomId: this._roomId })
      : ROUTES.LOBBY;
    wx.redirectTo({ url: path });
  },
});
