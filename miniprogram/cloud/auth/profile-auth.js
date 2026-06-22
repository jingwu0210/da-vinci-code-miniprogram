/**
 * 头像/昵称获取封装。
 * 依赖: ../../utils/logger
 */

const logger = require('../../utils/logger');

/**
 * 获取用户公开信息（头像 + 昵称）。
 * 必须在用户主动点击触发后调用。
 * 头像: <button open-type="chooseAvatar" bindchooseavatar="onChooseAvatar">
 * 昵称: <input type="nickname" bindinput="onNicknameInput">
 */

function onChooseAvatar(e, callback) {
  const avatarUrl = e.detail.avatarUrl;
  logger.info('ProfileAuth', 'Avatar chosen', { avatarUrl });
  callback && callback(avatarUrl);
}

function onNicknameInput(e, callback) {
  const nickName = e.detail.value;
  logger.info('ProfileAuth', 'Nickname input', { nickName });
  callback && callback(nickName);
}

module.exports = { onChooseAvatar, onNicknameInput };
