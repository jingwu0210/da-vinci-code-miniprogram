/**
 * 路由表 —— 所有页面路径集中管理。
 * 禁止硬编码路径字符串在页面之间跳转。
 */

const ROUTES = Object.freeze({
  // 主包
  LOGIN:    '/pages/login/index',
  LOBBY:    '/pages/lobby/index',
  BOARD:    '/pages/board/index',
  TUTORIAL: '/pages/tutorial/index',
  HISTORY:  '/pages/history/index',
  SETTINGS: '/pages/settings/index',

  // 分包 - 房间
  ROOM_CREATE: '/subpackages/room/create/index',
  ROOM_DETAIL: '/subpackages/room/detail/index',

  // 分包 - 结算
  RESULT: '/subpackages/result/index',
});

/**
 * 构建带 query 的页面路径。
 * 用法: buildRoute(ROUTES.BOARD, { gameId: 'xxx', roomId: 'yyy' })
 * 返回: '/pages/board/index?gameId=xxx&roomId=yyy'
 */
function buildRoute(path, params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `${path}?${qs}` : path;
}

module.exports = { ROUTES, buildRoute };
