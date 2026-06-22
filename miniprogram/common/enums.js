/**
 * 全局枚举定义 —— 所有层唯一公用。
 * 禁止在此文件中 import 任何其他层。
 */

/** 牌颜色 */
const Color = Object.freeze({
  BLACK: 'black',
  WHITE: 'white',
});

/** 游戏阶段 */
const Phase = Object.freeze({
  WAITING:   'waiting',    // 等待他人回合
  DRAWING:   'drawing',    // 摸牌中
  INSERTING: 'inserting',  // 插牌中
  GUESSING:  'guessing',   // 猜测中
});

/** 游戏模式 */
const GameMode = Object.freeze({
  AI:      'ai',
  FRIENDS: 'friends',
});

/** 房间状态 */
const RoomStatus = Object.freeze({
  WAITING:  'waiting',
  PLAYING:  'playing',
  FINISHED: 'finished',
});

/** AI 难度 */
const Difficulty = Object.freeze({
  EASY:   'easy',
  MEDIUM: 'medium',
  HARD:   'hard',
});

/** 回合动作类型 */
const ActionType = Object.freeze({
  DRAW:   'draw',
  INSERT: 'insert',
  GUESS:  'guess',
  PASS:   'pass',
  QUIT:   'quit',
});

/** 错误码 */
const ErrorCode = Object.freeze({
  OK:                     'OK',
  INVALID_PARAMS:         'INVALID_PARAMS',
  NOT_AUTHORIZED:         'NOT_AUTHORIZED',
  NOT_YOUR_TURN:          'NOT_YOUR_TURN',
  WRONG_PHASE:            'WRONG_PHASE',
  GAME_NOT_FOUND:         'GAME_NOT_FOUND',
  ROOM_NOT_FOUND:         'ROOM_NOT_FOUND',
  USER_NOT_FOUND:         'USER_NOT_FOUND',
  ROOM_FULL:              'ROOM_FULL',
  ROOM_STARTED:           'ROOM_STARTED',
  ALREADY_IN_ROOM:        'ALREADY_IN_ROOM',
  ALREADY_REVEALED:       'ALREADY_REVEALED',
  WRONG_PASSWORD:         'WRONG_PASSWORD',
  NOT_ROOM_CREATOR:       'NOT_ROOM_CREATOR',
  NOT_ALL_READY:          'NOT_ALL_READY',
  NOT_IN_ROOM:            'NOT_IN_ROOM',
  INVALID_TARGET:         'INVALID_TARGET',
  INVALID_POSITION:       'INVALID_POSITION',
  INVALID_MODE:           'INVALID_MODE',
  INVALID_PLAYER_COUNT:   'INVALID_PLAYER_COUNT',
  NO_DRAWN_TILE:          'NO_DRAWN_TILE',
  GAME_ALREADY_FINISHED:  'GAME_ALREADY_FINISHED',
  ROOM_NOT_WAITING:       'ROOM_NOT_WAITING',
  NICKNAME_TOO_LONG:      'NICKNAME_TOO_LONG',
  RATE_LIMITED:           'RATE_LIMITED',
  INTERNAL_ERROR:         'INTERNAL_ERROR',
});

module.exports = {
  Color,
  Phase,
  GameMode,
  RoomStatus,
  Difficulty,
  ActionType,
  ErrorCode,
};
