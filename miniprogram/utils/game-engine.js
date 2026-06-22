/**
 * 游戏引擎 —— 纯逻辑函数统一入口。
 * 收拢 shuffle / sort-hand / game-state / guess-handler 为一个模块。
 * 供云函数和前端共同使用。
 */

const { shuffle, createDeck, createShuffledDeck } = require('../utils/shuffle');
const { sortKey, compare, sortHand } = require('../utils/sort-hand');
const { Phase } = require('../common/enums');
const {
  createInitialState,
  update,
  drawFromPool,
  poolRemaining,
  getClientView,
  findTileById,
  countUnrevealed,
  allOpponentsEliminated,
} = require('../model/entities/game-state');
const { isGuessMatch, validateGuess } = require('./game/guess-handler');

const GameEngine = {
  // ── 牌组 ──
  createDeck,
  createShuffledDeck,
  shuffle,

  // ── 排序 ──
  sortKey,
  compare,
  sortHand,

  // ── 发牌 & 初始化 ──
  createInitialState,

  // ── 摸牌 (颜色分池) ──
  drawFromPool,
  poolRemaining,

  // ── 猜测 ──
  isGuessMatch,
  validateGuess,

  // ── 胜负 ──
  countUnrevealed,
  allOpponentsEliminated,

  // ── 工具 ──
  update,
  getClientView,
  findTileById,
};

module.exports = GameEngine;
