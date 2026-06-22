/**
 * 分享功能统一配置。
 * 依赖: ../../common/routes
 */

const { ROUTES, buildRoute } = require('../../common/routes');

const DEFAULT_SHARE_TITLE = '来和我玩达芬奇密码！你能猜出我的密码吗？';
const DEFAULT_SHARE_IMAGE = 'https://cdn.example.com/share-card.png';

function roomShareConfig(roomId) {
  return {
    title:    DEFAULT_SHARE_TITLE,
    path:     buildRoute(ROUTES.ROOM_DETAIL, { roomId }),
    imageUrl: DEFAULT_SHARE_IMAGE,
  };
}

function resultShareConfig() {
  return {
    title:    '我在达芬奇密码中获胜了！来挑战我吧！',
    path:     ROUTES.LOBBY,
    imageUrl: DEFAULT_SHARE_IMAGE,
  };
}

module.exports = { roomShareConfig, resultShareConfig };
