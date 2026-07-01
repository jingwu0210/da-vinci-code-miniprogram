/**
 * 全局常量 —— 所有层公用。
 * 禁止在此文件中 import 任何其他层。
 */

module.exports = {
  /** 牌组 */
  DECK_SIZE:          26,
  TOTAL_BLACK_TILES:  13,       // 0~11 + 1 Joker
  TOTAL_WHITE_TILES:  13,
  MIN_VALUE:          0,
  MAX_VALUE:          11,
  JOKER_VALUE:        -1,

  /** 玩家数量 */
  MIN_PLAYERS:        2,
  MAX_PLAYERS:        4,
  HAND_SIZE_2_3:      4,        // 2~3 人每手 4 张
  HAND_SIZE_4:        3,        // 4 人每手 3 张

  /** 计时 */
  MAX_TURN_TIME_MS:   60000,    // 回合超时
  RECONNECT_GRACE_MS: 300000,   // 断线重连宽限期 5 分钟

  /** 房间 */
  ROOM_CODE_LENGTH:   6,
  MAX_PASSWORD_LEN:   6,
  MAX_NICKNAME_LEN:   20,

  /** 分页 */
  DEFAULT_PAGE_SIZE:  20,

  /** 缓存 */
  MAX_LOCAL_HISTORY:  10,       // 本地历史记录上限（游客用）
  MAX_CACHE_AGE_MS:   7 * 24 * 3600 * 1000,  // 缓存有效期 7 天

  /** 动画 */
  FLIP_ANIM_DURATION: 900,      // 推倒动画总时长 ms
  AI_ACTION_INTERVAL: 800,      // AI 动作间隔 ms

  /** 激励视频 */
  MAX_DAILY_REWARD_ADS: 3,
};
