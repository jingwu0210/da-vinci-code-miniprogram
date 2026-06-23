/**
 * 登录页 — 微信授权、游客模式、头像昵称设置。
 */
const AuthService = require('../../../service/auth/auth-service');
const { showToast } = require('../../../common/modal-helper');
const { ROUTES, buildRoute } = require('../../../common/routes');
const store = require('../../../common/store');

const DEFAULT_AVATAR = '/images/avatar.png';

Page({
  data: {
    loading: true,
    loggedIn: false,
    avatarUrl: DEFAULT_AVATAR,
    nickName: '',
    roomId: null,
  },

  onLoad(options) {
    this._roomId = options.roomId || null;
    const user = store.get('user');
    if (user && !user.isGuest) { this._goLobby(); return; }
    this.setData({ loading: false });
  },

  // ── 微信一键登录 ──
  async onTapLogin() {
    this.setData({ loading: true });
    try {
      await AuthService.initSession();
      this.setData({ loggedIn: true, loading: false });
    } catch (e) {
      showToast('登录失败，请重试');
      this.setData({ loading: false });
    }
  },

  // ── 头像昵称 ──
  onChooseAvatar(e) {
    // 保存微信临时路径，在 onConfirmProfile 时上传到云存储
    this._tempAvatarPath = e.detail.avatarUrl;
    this.setData({ avatarUrl: this._tempAvatarPath });
  },

  onNicknameInput(e) {
    this.setData({ nickName: e.detail.value });
  },

  async onConfirmProfile() {
    const { nickName } = this.data;
    let cloudAvatarUrl = DEFAULT_AVATAR;

    // 上传头像到云存储（微信临时文件不能持久化）
    if (this._tempAvatarPath) {
      try {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`,
          filePath: this._tempAvatarPath,
        });
        cloudAvatarUrl = uploadRes.fileID;
      } catch (e) {
        console.warn('[Login] avatar upload failed, using default', e);
      }
    }

    try {
      if (cloudAvatarUrl !== DEFAULT_AVATAR || nickName.trim()) {
        await AuthService.updateProfile({ avatarUrl: cloudAvatarUrl, nickName: nickName.trim() });
      }
    } catch (e) { /* 非关键，静默失败 */ }
    this._goLobby();
  },

  // ── 游客模式 ──
  onTapGuest() {
    AuthService.tryGuestMode();
    this._goLobby();
  },

  onTapAgreement() { wx.navigateTo({ url: '/view/pages/agreement/index?type=user_agreement' }); },
  onTapPrivacy()  { wx.navigateTo({ url: '/view/pages/agreement/index?type=privacy' }); },

  _goLobby() {
    wx.redirectTo({ url: this._roomId ? buildRoute(ROUTES.LOBBY, { roomId: this._roomId }) : ROUTES.LOBBY });
  },
});
