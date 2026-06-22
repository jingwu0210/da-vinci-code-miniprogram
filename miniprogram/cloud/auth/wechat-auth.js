/**
 * 微信授权接口封装。
 * 依赖: ../../utils/logger, ../../model/store/app-store
 */

const logger = require('../../utils/logger');
const store = require('../../common/store');

function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          logger.info('WechatAuth', 'Login success');
          resolve(res.code);
        } else {
          logger.error('WechatAuth', 'Login failed: no code');
          reject(new Error('LOGIN_FAILED'));
        }
      },
      fail: (err) => {
        logger.error('WechatAuth', 'Login error', err);
        reject(err);
      },
    });
  });
}

function checkSession() {
  return new Promise((resolve) => {
    wx.checkSession({
      success: () => resolve(true),
      fail: () => resolve(false),
    });
  });
}

function isGuest() {
  return store.get('user')?.isGuest === true;
}

module.exports = { login, checkSession, isGuest };
