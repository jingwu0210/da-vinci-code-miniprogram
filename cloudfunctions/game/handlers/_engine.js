/**
 * 云函数内游戏引擎 —— 纯逻辑函数。
 * 每张牌有 owner 字段: 'pool' | openid，从根本上杜绝重复。
 */
const HAND_SIZE_2_3 = 4;
const HAND_SIZE_4 = 3;

const Color = { BLACK: 'black', WHITE: 'white' };
const Phase = { DRAWING: 'drawing', INSERTING: 'inserting', GUESSING: 'guessing', WAITING: 'waiting' };

// ── 洗牌 ──
function shuffle(arr) { const r = [...arr]; for (let i = r.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [r[i],r[j]]=[r[j],r[i]]; } return r; }

// ── 创建 26 张唯一牌 ──
function createDeckTiles() {
  const tiles = []; let idx = 0;
  for (const color of [Color.BLACK, Color.WHITE]) {
    for (let v = 0; v <= 11; v++) tiles.push({ id: `t_${idx++}`, color, value: v, isJoker: false });
    tiles.push({ id: `t_${idx++}`, color, value: -1, isJoker: true });
  }
  return tiles;
}

// ── 排序 ──
function sortKey(tile) {
  if (tile.isJoker || tile.value === -1) return [Infinity, 0];
  return [tile.value, tile.color === Color.BLACK ? 0 : 1];
}
function compareTile(a, b) { const ka=sortKey(a),kb=sortKey(b); return ka[0]<kb[0]?-1:ka[0]>kb[0]?1:ka[1]<kb[1]?-1:ka[1]>kb[1]?1:0; }
function sortHand(hand) {
  const non=[], jok=[];
  hand.forEach(t=>(t.isJoker||t.value===-1?jok:non).push(t));
  non.sort(compareTile);
  const r=[...non,...jok];
  r.forEach((t,i)=>{t.position=i;});
  return r;
}

// ── tiles 辅助 ──
function getPlayerHand(tiles, openid) {
  return tiles.filter(t => t.owner === openid).sort((a,b) => a.position - b.position);
}

function poolRemaining(tiles) {
  const poolTiles = tiles.filter(t => t.owner === 'pool');
  return {
    black: poolTiles.filter(t => t.color === Color.BLACK).length,
    white: poolTiles.filter(t => t.color === Color.WHITE).length,
    total: poolTiles.length,
  };
}

// ── 创建对局 ──
function createInitialState({ roomId, players, mode, difficulty }) {
  const deck = shuffle(createDeckTiles());
  const count = players.length;
  const handSize = count === 4 ? HAND_SIZE_4 : HAND_SIZE_2_3;
  let cursor = 0;

  // 发牌：设置 owner 和 position
  for (const p of players) {
    const raw = deck.slice(cursor, cursor + handSize);
    const sorted = sortHand(raw);
    sorted.forEach((t, i) => { t.owner = p.openid; t.position = i; });
    cursor += handSize;
  }
  // 剩余牌归池
  for (let i = cursor; i < deck.length; i++) {
    deck[i].owner = 'pool';
    deck[i].position = null;
  }

  // 先手判定
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
    turnOrder, turnIndex, tiles: deck, drawnTileId: null, winner: null, turnLog: [] };
}

// ── 测试用：定牌 ──
function createControlledState({ roomId, players, mode, difficulty, hands: inputHands, firstPlayer, poolTiles }) {
  const openids = players.map(p => p.openid);
  const allTiles = [];
  const usedKeys = new Set();

  // 构建手牌（先不设 position，等排序后再设）
  const handsByOid = {};
  for (const oid of openids) {
    const specs = inputHands[oid] || [];
    handsByOid[oid] = specs.map((s, i) => {
      const v = s.isJoker ? -1 : (s.value != null ? s.value : 0);
      const key = `${s.color}_${v}_${!!s.isJoker}`;
      if (usedKeys.has(key)) throw new Error(`Duplicate in testHands: ${key}`);
      usedKeys.add(key);
      return { id: `t_${oid}_${i}`, color: s.color, value: v, isJoker: !!s.isJoker, owner: oid, position: 0, isRevealed: false };
    });
  }

  // 排序每副手牌并设 position
  for (const oid of openids) {
    const hand = handsByOid[oid];
    const sorted = sortHand(hand);
    sorted.forEach((t, i) => { t.position = i; });
    allTiles.push(...sorted);
  }

  // 池：指定 poolTiles → 只用指定牌；否则从完整牌组取余牌
  if (poolTiles) {
    for (const s of poolTiles) {
      var v = s.isJoker ? -1 : (s.value != null ? s.value : 0);
      var key = s.color + '_' + v + '_' + !!s.isJoker;
      if (usedKeys.has(key)) throw new Error('Duplicate in poolTiles: ' + key);
      usedKeys.add(key);
      allTiles.push({ id: 't_pool_' + allTiles.length, color: s.color, value: v, isJoker: !!s.isJoker, owner: 'pool', position: null, isRevealed: false });
    }
  } else {
    var fullDeck = createDeckTiles();
    for (var ti = 0; ti < fullDeck.length; ti++) {
      var t = fullDeck[ti];
      var key = t.color + '_' + t.value + '_' + t.isJoker;
      if (!usedKeys.has(key)) {
        allTiles.push(Object.assign({}, t, { owner: 'pool', position: null, isRevealed: false }));
      }
    }
  }

  const turnOrder = firstPlayer ? [firstPlayer, ...openids.filter(o => o !== firstPlayer)] : openids;

  // 牌数守恒断言（仅完整牌组时检查，poolTiles 测试场景跳过）
  if (!poolTiles) {
    var poolCount = allTiles.filter(function(t) { return t.owner === 'pool'; }).length;
    var handCount = allTiles.filter(function(t) { return t.owner !== 'pool'; }).length;
    if (poolCount + handCount !== 26) throw new Error('INVARIANT: pool=' + poolCount + ' + hands=' + handCount + ' != 26');
  }

  return { roomId, mode, difficulty, status: 'playing', phase: Phase.DRAWING,
    turnOrder, turnIndex: 0, tiles: allTiles, drawnTileId: null, winner: null, turnLog: [] };
}

// ── 摸牌（写 owner）──
function drawFromPool(tiles, color, caller) {
  const poolTiles = tiles.filter(t => t.owner === 'pool' && t.color === color);
  if (poolTiles.length === 0) return { tile: null, tiles };
  const idx = Math.floor(Math.random() * poolTiles.length);
  const picked = poolTiles[idx];
  return {
    tile: picked,
    tiles: tiles.map(t => {
      if (t.id !== picked.id) return t;
      return { ...t, owner: caller, position: getPlayerHand(tiles, caller).length };
    }),
  };
}

// ── 猜测 ──
function isGuessMatch(guess, tile) { return guess.value === tile.value; }

// ── 胜负 ──
function countUnrevealed(hand) { return hand.filter(t => !t.isRevealed).length; }

function allOpponentsEliminated(tiles, playerOpenid) {
  const opponents = [...new Set(tiles.filter(t => t.owner !== 'pool' && t.owner !== playerOpenid).map(t => t.owner))];
  for (const oid of opponents) {
    const hand = getPlayerHand(tiles, oid);
    if (countUnrevealed(hand) > 0) return false;
  }
  return true;
}

// ── 重排手牌 ──
function reorderHand(tiles, openid) {
  const hand = getPlayerHand(tiles, openid);
  return tiles.map(t => {
    if (t.owner !== openid) return t;
    const pos = hand.findIndex(h => h.id === t.id);
    return { ...t, position: pos };
  });
}

// ── sanitize ──
function toSelfTile(tile) {
  return { id: tile.id, color: tile.color, value: tile.value, isJoker: tile.isJoker, position: tile.position, isRevealed: tile.isRevealed };
}
function toOpponentTile(tile) {
  if (tile.isRevealed) return { id: tile.id, position: tile.position, color: tile.color, value: tile.value, isJoker: tile.isJoker, isRevealed: true };
  return { id: tile.id, position: tile.position, color: tile.color, isRevealed: false };
}

function getClientView(gameState, playerOpenid) {
  const tiles = gameState.tiles || [];
  // 已排序手牌（排除未插入的摸牌，摸牌单独在 myDrawnTile 显示）
  const selfHand = getPlayerHand(tiles, playerOpenid)
    .filter(t => t.id !== gameState.drawnTileId)
    .map(toSelfTile);

  const opponents = [];
  const opponentIds = [...new Set(tiles.filter(t => t.owner !== 'pool' && t.owner !== playerOpenid).map(t => t.owner))];
  for (const oid of opponentIds) {
    const hand = getPlayerHand(tiles, oid);
    var drawnId = (gameState.drawnTileId && gameState.tiles.find(function(t) { return t.id === gameState.drawnTileId && t.owner === oid; })) ? gameState.drawnTileId : null;
    opponents.push({ openid: oid, hand: hand.map(toOpponentTile), revealedCount: countUnrevealed(hand), drawnTileId: drawnId });
  }

  // 初始 Joker 摆放阶段用 initialJokerTurn，正式回合用 turnIndex
  var turnIdx = gameState.initialJokerTurn != null ? gameState.initialJokerTurn : gameState.turnIndex;
  return {
    gameId: gameState._id || gameState.roomId,
    roomId: gameState.roomId,
    status: gameState.status,
    self: { hand: selfHand, revealedCount: selfHand.filter(t => t.isRevealed).length },
    opponents,
    game: {
      phase: gameState.phase,
      currentTurnOpenid: gameState.turnOrder[turnIdx],
      turnNumber: (gameState.turnLog || []).filter(function(l) { return l.action === 'pass' || l.action === 'quit' || (l.action === 'guess' && !l.isCorrect); }).length + 1,
      poolRemaining: poolRemaining(tiles),
      myTurn: gameState.turnOrder[turnIdx] === playerOpenid,
      winner: gameState.winner || null,
      myDrawnTile: gameState.drawnTileId
        ? (function() {
            var dt = tiles.find(function(t) { return t.id === gameState.drawnTileId; });
            return (dt && dt.owner === playerOpenid) ? toSelfTile(dt) : null;
          })()
        : null,
    },
    // 结算页数据（游客本地构造 record 使用，不依赖 DB 直读）
    settlement: {
      mode: gameState.mode || 'ai',
      difficulty: gameState.difficulty || null,
      createdAt: gameState.createdAt || null,
      turnOrder: gameState.turnOrder || [],
      tiles: tiles,  // 所有牌（含 owner/isRevealed），用于计算 unrevealed 数量
      turnLog: gameState.turnLog || [],
    },
  };
}

module.exports = {
  Color, Phase,
  shuffle, createDeckTiles, sortKey, sortHand,
  createInitialState, createControlledState,
  drawFromPool, poolRemaining,
  getPlayerHand, reorderHand,
  isGuessMatch, countUnrevealed, allOpponentsEliminated,
  toSelfTile, toOpponentTile, getClientView,
};
