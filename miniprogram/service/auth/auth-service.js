/**
 * 认证服务 —— 登录/游客/会话管理。
 * 依赖: cloud/auth/wechat-auth, cloud/cloud-functions/user-call, model/store/app-store
 */

const { login, checkSession } = require('../../cloud/auth/wechat-auth');
const UserCall = require('../../cloud/cloud-functions/user-call');
const store = require('../../common/store');
const logger = require('../../utils/logger');

const AuthService = {
  /**
   * 初始化会话: 检查登录态 → 获取用户资料 → 存入 store。
   */
  async initSession() {
    const hasSession = await checkSession();
    if (!hasSession) {
      await login();
    }

    const resp = await UserCall.login();
    if (!resp.success) {
      logger.error('AuthService', 'Login failed', resp.error);
      // 降级为游客
      this.tryGuestMode();
      return;
    }

    const profile = resp.data.profile;
    store.set('user', {
      openid:    profile.openid,
      nickName:  profile.nickName,
      avatarUrl: profile.avatarUrl,
      isGuest:   false,
      stats:     profile.stats,
    });
    store.set('userType', 'wechat');
    logger.info('AuthService', 'Session initialized', { openid: profile.openid });
  },

  /**
   * 游客模式。
   */
  tryGuestMode() {
    var login = require('../../utils/login');
    var tid = login.getTouristId();
    store.set('user', {
      openid:    tid,
      nickName:  '游客' + tid.slice(2, 6),
      avatarUrl: '',
      isGuest:   true,
      stats:     null,
    });
    store.set('userType', 'tourist');
    logger.info('AuthService', 'Guest mode activated');
  },

  /**
   * 更新用户资料（头像/昵称变更时）。
   */
  async updateProfile({ nickName, avatarUrl }) {
    const resp = await UserCall.updateProfile({ nickName, avatarUrl });
    if (resp.success) {
      store.update('user', { nickName, avatarUrl });
    }
    return resp;
  },
};

module.exports = AuthService;
