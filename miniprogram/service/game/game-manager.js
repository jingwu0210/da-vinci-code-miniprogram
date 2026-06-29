/**
 * 游戏对局管理 —— 编排 Service 层业务逻辑。
 * View 层唯一的游戏入口。
 * 依赖: model/entities/game-state, cloud/cloud-functions/game-call, cloud/watch/game-watcher
 */

const GameState = require('../../model/entities/game-state');
const GameCall = require('../../cloud/cloud-functions/game-call');
const { watchGame } = require('../../cloud/watch/game-watcher');
const logger = require('../../utils/logger');

const GameManager = {
  /**
   * 初始化对局并返回客户端视图。
   */
  async initAndGetState({ roomId, players, mode, difficulty }) {
    const resp = await GameCall.initGame({ roomId, players, mode, difficulty });
    if (!resp.success) throw new Error(resp.error || 'INIT_GAME_FAILED');
    return resp.data; // 云函数已 sanitize 为客户端视图
  },

  /**
   * 获取最新对局状态（断线重连）。
   */
  async getGameState(gameId) {
    const resp = await GameCall.getGameState(gameId);
    if (!resp.success) throw new Error(resp.error || 'GET_STATE_FAILED');
    return resp.data;
  },

  // ── 玩家操作 ──

  async drawTile(gameId, color) {
    this._validate(gameId);
    const resp = await GameCall.drawTile(gameId, color);
    this._handleError(resp);
    return resp.data;
  },

  async insertTile(gameId, position) {
    this._validate(gameId);
    const resp = await GameCall.insertTile(gameId, position);
    this._handleError(resp);
    return resp.data;
  },

  async makeGuess(gameId, targetOpenid, position, value) {
    this._validate(gameId);
    const resp = await GameCall.makeGuess(gameId, targetOpenid, position, value);
    this._handleError(resp);
    return resp.data;
  },

  async passTurn(gameId, reveal) {
    this._validate(gameId);
    const resp = await GameCall.passTurn(gameId, reveal);
    this._handleError(resp);
    return resp.data;
  },

  async quitGame(gameId) {
    const resp = await GameCall.quitGame(gameId);
    this._handleError(resp);
    return resp.data;
  },

  async requestAiMove(gameId, difficulty) {
    const resp = await GameCall.aiMove(gameId, difficulty);
    this._handleError(resp);
    return resp.data;
  },

  /**
   * 订阅对局实时更新。
   */
  subscribe(gameId, onUpdate, onError) {
    return watchGame(gameId, onUpdate, onError);
  },

  // ── 内部 ──

  _validate(gameId) {
    if (!gameId) throw new Error('GAME_NOT_FOUND');
  },

  _handleError(resp) {
    if (!resp.success) {
      logger.error('GameManager', `Operation failed: ${resp.error}`);
      throw new Error(resp.error || 'GAME_OPERATION_FAILED');
    }
  },
};

module.exports = GameManager;
