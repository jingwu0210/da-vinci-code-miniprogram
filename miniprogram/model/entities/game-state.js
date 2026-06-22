/**
 * GameState 实体 —— 对局状态的不可变更新。
 * 依赖: common/enums, common/constants, ../entities/tile, ../../utils/shuffle
 */

const { Phase, GameMode } = require('../../common/enums');
const { HAND_SIZE_2_3, HAND_SIZE_4 } = require('../../common/constants');
const Tile = require('./tile');
const { shuffle } = require('../../utils/shuffle');
const { sortHand } = require('../../utils/sort-hand');

/**
 * 创建初始对局状态。
 */
function createInitialState({ roomId, players, mode, difficulty = null }) {
  // 1. 创建 + 洗牌
  const deck = shuffle(Tile.createDeckTiles());

  // 2. 发牌
  const playerCount = players.length;
  const handSize = playerCount === 4 ? HAND_SIZE_4 : HAND_SIZE_2_3;
  const hands = {};
  let cursor = 0;

  for (const p of players) {
    const rawHand = deck.slice(cursor, cursor + handSize);
    const sortedHand = sortHand(rawHand);
    sortedHand.forEach((t, i) => { t.position = i; });
    hands[p.openid] = sortedHand;
    cursor += handSize;
  }

  const pool = deck.slice(cursor);

  // 3. 确定先手（最小数字牌）
  let firstPlayer = players[0];
  let minValue = Infinity;
  for (const p of players) {
    const vals = hands[p.openid]
      .filter(t => !t.isJoker)
      .map(t => t.value);
    const localMin = vals.length > 0 ? Math.min(...vals) : Infinity;
    if (localMin < minValue) {
      minValue = localMin;
      firstPlayer = p;
    }
  }

  const turnOrder = players.map(p => p.openid);
  const startIdx = turnOrder.indexOf(firstPlayer.openid);

  return {
    roomId,
    mode,
    difficulty,
    status: 'playing',
    phase: Phase.DRAWING,
    turnOrder,
    turnIndex: startIdx,
    pool,
    hands,
    drawnTileId: null,
    winner: null,
    turnLog: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 不可变更新对局状态。
 */
function update(gameState, changes) {
  return { ...gameState, ...changes, updatedAt: new Date().toISOString() };
}

/**
 * 计算相对于某玩家的客户端视图。
 */
function getClientView(gameState, playerOpenid) {
  const selfHand = (gameState.hands[playerOpenid] || []).map(Tile.toSelfTile);

  const opponents = [];
  for (const [oid, hand] of Object.entries(gameState.hands)) {
    if (oid === playerOpenid) continue;
    opponents.push({
      openid: oid,
      hand: hand.map(t => Tile.toOpponentTile(t)),
      revealedCount: hand.filter(t => t.isRevealed).length,
    });
  }

  return {
    gameId: gameState.roomId, // 实际应为 gameId，此处简化
    roomId: gameState.roomId,
    status: gameState.status,
    self: { hand: selfHand, revealedCount: selfHand.filter(t => t.isRevealed).length },
    opponents,
    game: {
      phase:              gameState.phase,
      currentTurnOpenid:  gameState.turnOrder[gameState.turnIndex],
      turnNumber:         gameState.turnLog.length + 1,
      poolRemaining:      gameState.pool.length,
      myTurn:             gameState.turnOrder[gameState.turnIndex] === playerOpenid,
      winner:             gameState.winner,
      myDrawnTile:        gameState.drawnTileId
        ? Tile.toSelfTile(findTileById(gameState.hands[playerOpenid], gameState.drawnTileId))
        : null,
    },
  };
}

function findTileById(hand, tileId) {
  return hand.find(t => t.id === tileId) || null;
}

function countUnrevealed(hand) {
  return hand.filter(t => !t.isRevealed).length;
}

function allOpponentsEliminated(gameState, playerOpenid) {
  for (const [oid, hand] of Object.entries(gameState.hands)) {
    if (oid === playerOpenid) continue;
    if (countUnrevealed(hand) > 0) return false;
  }
  return true;
}

module.exports = {
  createInitialState,
  update,
  getClientView,
  findTileById,
  countUnrevealed,
  allOpponentsEliminated,
};
