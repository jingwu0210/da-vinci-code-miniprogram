/**
 * 云函数内游戏引擎 —— 纯逻辑函数，从 miniprogram/ 镜像。
 * 云函数无法 require miniprogram/ 下的文件，故独立维护。
 * 与 GAME-MODEL.md 保持一致。
 */

const HAND_SIZE_2_3 = 4;
const HAND_SIZE_4 = 3;

// ── 枚举 ──
const Color = { BLACK: 'black', WHITE: 'white' };
const Phase = { DRAWING: 'drawing', INSERTING: 'inserting', GUESSING: 'guessing', WAITING: 'waiting' };

// ── 洗牌 ──
function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── 创建牌组 ──
function createDeckTiles() {
  const tiles = [];
  let idx = 0;
  for (const color of [Color.BLACK, Color.WHITE]) {
    for (let v = 0; v <= 11; v++) {
      tiles.push({ id: `t_${idx++}`, color, value: v, isJoker: false });
    }
    tiles.push({ id: `t_${idx++}`, color, value: -1, isJoker: true });
  }
  return tiles;
}

// ── 排序 ──
function sortKey(tile) {
  if (tile.isJoker || tile.value === -1) return [Infinity, 0];
  return [tile.value, tile.color === Color.BLACK ? 0 : 1];
}
function compareTile(a, b) {
  const ka = sortKey(a), kb = sortKey(b);
  if (ka[0] < kb[0]) return -1;
  if (ka[0] > kb[0]) return 1;
  if (ka[1] < kb[1]) return -1;
  if (ka[1] > kb[1]) return 1;
  return 0;
}
function sortHand(hand) {
  const nonJokers = [];
  const jokers = [];
  hand.forEach(t => {
    if (t.isJoker || t.value === -1) jokers.push(t);
    else nonJokers.push(t);
  });
  nonJokers.sort(compareTile);
  const result = [...nonJokers, ...jokers];
  result.forEach((t, i) => { t.position = i; });
  return result;
}

// ── 创建对局 ──
function createInitialState({ roomId, players, mode, difficulty }) {
  const deck = shuffle(createDeckTiles());
  const count = players.length;
  const handSize = count === 4 ? HAND_SIZE_4 : HAND_SIZE_2_3;
  const hands = {};
  let cursor = 0;
  for (const p of players) {
    const raw = deck.slice(cursor, cursor + handSize);
    const sorted = sortHand(raw);
    sorted.forEach((t, i) => { t.position = i; });
    hands[p.openid] = sorted;
    cursor += handSize;
  }
  const remaining = deck.slice(cursor);
  const pool = {
    black: remaining.filter(t => t.color === Color.BLACK),
    white: remaining.filter(t => t.color === Color.WHITE),
  };

  let first = players[0];
  let minV = Infinity;
  for (const p of players) {
    const vs = hands[p.openid].filter(t => !t.isJoker).map(t => t.value);
    const m = vs.length > 0 ? Math.min(...vs) : Infinity;
    if (m < minV) { minV = m; first = p; }
  }
  const turnOrder = players.map(p => p.openid);
  const turnIndex = turnOrder.indexOf(first.openid);

  return { roomId, mode, difficulty, status: 'playing', phase: Phase.DRAWING,
    turnOrder, turnIndex, pool, hands, drawnTileId: null, winner: null, turnLog: [] };
}

// ── 摸牌 ──
function drawFromPool(pool, color) {
  const sub = pool[color];
  if (!sub || sub.length === 0) return { tile: null, pool };
  const idx = Math.floor(Math.random() * sub.length);
  const newSub = [...sub];
  const [tile] = newSub.splice(idx, 1);
  return { tile, pool: { ...pool, [color]: newSub } };
}

function poolRemaining(pool) {
  return { black: pool.black.length, white: pool.white.length, total: pool.black.length + pool.white.length };
}

// ── 猜测 ──
function isGuessMatch(guess, tile) {
  return guess.value === tile.value;
}

// ── 胜负 ──
function countUnrevealed(hand) {
  return hand.filter(t => !t.isRevealed).length;
}
function allOpponentsEliminated(hands, playerOpenid) {
  for (const [oid, hand] of Object.entries(hands)) {
    if (oid === playerOpenid) continue;
    if (countUnrevealed(hand) > 0) return false;
  }
  return true;
}

// ── sanitize ──
function toSelfTile(tile) {
  return { id: tile.id, color: tile.color, value: tile.value, isJoker: tile.isJoker, position: tile.position, isRevealed: tile.isRevealed };
}
function toOpponentTile(tile) {
  if (tile.isRevealed) return { position: tile.position, color: tile.color, value: tile.value, isJoker: tile.isJoker, isRevealed: true };
  return { position: tile.position, color: tile.color, isRevealed: false };
}
function findTileById(hand, id) {
  return hand.find(t => t.id === id) || null;
}
function getClientView(gameState, playerOpenid) {
  const selfHand = (gameState.hands[playerOpenid] || []).map(toSelfTile);
  const opponents = [];
  for (const [oid, hand] of Object.entries(gameState.hands)) {
    if (oid === playerOpenid) continue;
    opponents.push({ openid: oid, hand: hand.map(toOpponentTile), revealedCount: countUnrevealed(hand) });
  }
  return {
    gameId: gameState._id || gameState.roomId,
    roomId: gameState.roomId,
    status: gameState.status,
    self: { hand: selfHand, revealedCount: selfHand.filter(t => t.isRevealed).length },
    opponents,
    game: {
      phase: gameState.phase,
      currentTurnOpenid: gameState.turnOrder[gameState.turnIndex],
      turnNumber: (gameState.turnLog || []).length + 1,
      poolRemaining: poolRemaining(gameState.pool),
      myTurn: gameState.turnOrder[gameState.turnIndex] === playerOpenid,
      winner: gameState.winner || null,
      myDrawnTile: gameState.drawnTileId ? toSelfTile(findTileById(gameState.hands[playerOpenid], gameState.drawnTileId)) : null,
    },
  };
}

module.exports = {
  Color, Phase,
  shuffle, createDeckTiles, sortHand,
  createInitialState, drawFromPool, poolRemaining,
  isGuessMatch, countUnrevealed, allOpponentsEliminated,
  toSelfTile, toOpponentTile, findTileById, getClientView,
};
