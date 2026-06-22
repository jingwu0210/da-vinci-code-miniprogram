/**
 * 本地存储 key 常量。
 * 所有 key 集中管理，避免散落各处导致冲突。
 */

module.exports = Object.freeze({
  // 用户
  USER_PROFILE:     'user_profile',
  AUTH_RECORD:      'auth_record',

  // 设置
  SETTINGS:         'app_settings',

  // 历史
  LOCAL_HISTORY:    'local_history',

  // 房间（断线重连用）
  LAST_ROOM_ID:     'last_room_id',
  LAST_GAME_ID:     'last_game_id',

  // 教程
  TUTORIAL_SEEN:    'tutorial_seen',
});
