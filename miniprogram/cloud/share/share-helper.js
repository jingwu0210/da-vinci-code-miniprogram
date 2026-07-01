/**
 * 分享功能统一配置。
 * 依赖: ../../common/routes
 */

const { ROUTES, buildRoute } = require('../../common/routes');

const DEFAULT_SHARE_TITLE = '来和我玩达芬奇密码！你能猜出我的密码吗？';

function roomShareConfig(roomId) {
  return {
    title: DEFAULT_SHARE_TITLE,
    path:  buildRoute(ROUTES.ROOM_DETAIL, { roomId, join: '1' }),
  };
}

function resultShareConfig(isWinner) {
  return {
    title: isWinner ? '我在达芬奇密码中获胜了！来挑战我吧！' : '来和我玩达芬奇密码！你能猜出我的密码吗？',
    path:  ROUTES.LOBBY,
  };
}

module.exports = { roomShareConfig, resultShareConfig };
