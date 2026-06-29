/**
 * GameState 实体 —— 每张牌有 owner 字段: 'pool' | openid。
 */
const { Phase, Color } = require('../../common/enums');
const { HAND_SIZE_2_3, HAND_SIZE_4 } = require('../../common/constants');
const Tile = require('./tile');
const { shuffle } = require('../../utils/shuffle');
const { sortHand } = require('../../utils/sort-hand');

// ── 手牌提取 ──
function getPlayerHand(tiles, openid) {
  return tiles.filter(t => t.owner === openid).sort((a, b) => a.position - b.position);
}

// ── 创建对局 ──
function createInitialState({ roomId, players, mode, difficulty = null }) {
  const deck = shuffle(Tile.createDeckTiles());
  const count = players.length;
  const handSize = count === 4 ? HAND_SIZE_4 : HAND_SIZE_2_3;
  let cursor = 0;

  for (const p of players) {
    const raw = deck.slice(cursor, cursor + handSize);
    const sorted = sortHand(raw);
    sorted.forEach((t, i) => { t.owner = p.openid; t.position = i; });
    cursor += handSize;
  }
  for (let i = cursor; i < deck.length; i++) {
    deck[i].owner = 'pool';
    deck[i].position = null;
  }

  let first = players[0], minV = Infinity;
  for (const p of players) {
    const hand = getPlayerHand(deck, p.openid);
    const vs = hand.filter(t => !t.isJoker).map(t => t.value);
    const m = vs.length > 0 ? Math.min(...vs) : Infinity;
    if (m < minV) { minV = m; first = p; }
  }
  const turnOrder = players.map(p => p.openid);
  const turnIndex = turnOrder.indexOf(first.openid);

  return { roomId, mode, difficulty, status: 'playing', phase: Phase.DRAWING,
    turnOrder, turnIndex, tiles: deck, drawnTileId: null, winner: null, turnLog: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

function update(gameState, changes) {
  return { ...gameState, ...changes, updatedAt: new Date().toISOString() };
}

// ── 摸牌 ──
function drawFromPool(tiles, color, callerOpenid) {
  const poolTiles = tiles.filter(t => t.owner === 'pool' && t.color === color);
  if (poolTiles.length === 0) return { tile: null, tiles };
  const idx = Math.floor(Math.random() * poolTiles.length);
  const picked = poolTiles[idx];
  const newPos = tiles.filter(t => t.owner === callerOpenid).length;
  return {
    tile: picked,
    tiles: tiles.map(t => t.id !== picked.id ? t : { ...t, owner: callerOpenid, position: newPos }),
  };
}

function poolRemaining(tiles) {
  const pool = tiles.filter(t => t.owner === 'pool');
  return { black: pool.filter(t => t.color === Color.BLACK).length,
    white: pool.filter(t => t.color === Color.WHITE).length, total: pool.length };
}

// ── 客户端视图 ──
function getClientView(gameState, playerOpenid) {
  const tiles = gameState.tiles || [];
  // 已排序手牌（排除未插入的摸牌，摸牌单独在 myDrawnTile 显示）
  const selfHand = getPlayerHand(tiles, playerOpenid)
    .filter(t => t.id !== gameState.drawnTileId)
    .map(Tile.toSelfTile);

  const opponents = [];
  const oppIds = [...new Set(tiles.filter(t => t.owner !== 'pool' && t.owner !== playerOpenid).map(t => t.owner))];
  for (const oid of oppIds) {
    const hand = getPlayerHand(tiles, oid);
    opponents.push({ openid: oid, hand: hand.map(Tile.toOpponentTile), revealedCount: hand.filter(t => t.isRevealed).length });
  }

  return {
    gameId: gameState.roomId, roomId: gameState.roomId, status: gameState.status,
    self: { hand: selfHand, revealedCount: selfHand.filter(t => t.isRevealed).length },
    opponents,
    game: {
      phase: gameState.phase,
      currentTurnOpenid: gameState.turnOrder[gameState.turnIndex],
      turnNumber: (gameState.turnLog || []).filter(function(l) { return l.action === 'pass' || l.action === 'quit' || (l.action === 'guess' && !l.isCorrect); }).length + 1,
      poolRemaining: poolRemaining(tiles),
      myTurn: gameState.turnOrder[gameState.turnIndex] === playerOpenid,
      winner: gameState.winner,
      myDrawnTile: gameState.drawnTileId
        ? (function() {
            var dt = tiles.find(function(t) { return t.id === gameState.drawnTileId; });
            return (dt && dt.owner === playerOpenid) ? Tile.toSelfTile(dt) : null;
          })()
        : null,
    },
  };
}

function findTileById(tiles, tileId) {
  return tiles.find(t => t.id === tileId) || null;
}

function countUnrevealed(hand) {
  return hand.filter(t => !t.isRevealed).length;
}

function allOpponentsEliminated(tiles, playerOpenid) {
  const oppIds = [...new Set(tiles.filter(t => t.owner !== 'pool' && t.owner !== playerOpenid).map(t => t.owner))];
  for (const oid of oppIds) {
    if (countUnrevealed(getPlayerHand(tiles, oid)) > 0) return false;
  }
  return true;
}

module.exports = {
  createInitialState, update, drawFromPool, poolRemaining,
  getPlayerHand, getClientView, findTileById, countUnrevealed, allOpponentsEliminated,
};
