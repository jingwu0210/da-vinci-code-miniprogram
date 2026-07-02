/**
 * 错误码 → 用户友好提示映射。
 * 所有云函数错误码统一在此翻译为中文。
 */

var ERROR_MSG = {
  // ── 房间相关 ──
  ROOM_NOT_FOUND: '房间不存在或已解散',
  WRONG_PASSWORD: '房间密码错误',
  ROOM_STARTED: '房间已经开始游戏',
  ROOM_ALREADY_STARTED: '房间已经开始游戏',
  ROOM_FULL: '房间已满',
  ALREADY_IN_ROOM: '你已在房间中',
  NOT_ROOM_CREATOR: '只有房主可以执行此操作',
  NOT_ALL_READY: '还有玩家未准备',
  NOT_IN_ROOM: '你不在这个房间中',
  ROOM_NOT_WAITING: '房间状态异常，请刷新',
  NOT_AUTHORIZED: '请先登录',

  // ── 游戏相关 ──
  GAME_NOT_FOUND: '游戏不存在或已结束',
  NOT_YOUR_TURN: '不是你的回合',
  WRONG_PHASE: '当前阶段不能执行此操作',
  INVALID_TARGET: '无效的猜测目标',
  ALREADY_REVEALED: '这张牌已经被翻开',
  INVALID_POSITION: '无效的位置',
  GAME_ALREADY_FINISHED: '游戏已结束',
  ALREADY_DRAWN: '已经摸过牌了',
  NO_DRAWN_TILE: '没有待插入的牌',

  // ── 通用 ──
  INVALID_PARAMS: '参数错误，请重试',
  INVALID_MODE: '无效的游戏模式',
  INVALID_PLAYER_COUNT: '玩家数量须为 2~4 人',
  UNKNOWN_TYPE: '未知操作类型',
  INVALID_TOURIST_ID: '游客身份无效，请重新进入',

  // ── 用户相关 ──
  USER_NOT_FOUND: '用户不存在',
  NICKNAME_TOO_LONG: '昵称不能超过 20 个字',
  LOGIN_FAILED: '登录失败，请重试',

  // ── 网络 ──
  CLOUD_CALL_FAILED: '网络异常，请稍后重试',
  INTERNAL_ERROR: '服务器繁忙，请稍后重试',
};

/**
 * 获取友好错误提示。
 * - 如果匹配到预定义错误码，返回中文消息
 * - 否则返回原消息或兜底文案
 */
function getErrorMsg(errCode) {
  if (!errCode) return '操作失败，请重试';
  if (ERROR_MSG[errCode]) return ERROR_MSG[errCode];
  // 兜底：如果已经是中文句子则直接返回，否则尝试翻译常见英文短语
  if (/[一-龥]/.test(errCode)) return errCode;
  return '操作失败（' + errCode + '）';
}

module.exports = { ERROR_MSG, getErrorMsg };
