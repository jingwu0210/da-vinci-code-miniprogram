/**
 * drawTile —— 从指定颜色牌池摸一张牌。
 * 输入: { gameId, color: 'black'|'white' }
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId, color } = event;
  if (!gameId || !color) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND', errorCode: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    if (gs.status !== 'playing') return { success: false, error: 'GAME_ALREADY_FINISHED', errorCode: 'GAME_ALREADY_FINISHED' };
    if (gs.turnOrder[gs.turnIndex] !== caller) return { success: false, error: 'NOT_YOUR_TURN', errorCode: 'NOT_YOUR_TURN' };
    if (gs.phase !== E.Phase.DRAWING) return { success: false, error: 'WRONG_PHASE', errorCode: 'WRONG_PHASE' };
    if (gs.drawnTileId) return { success: false, error: 'NO_DRAWN_TILE', errorCode: 'NO_DRAWN_TILE' }; // 已摸过

    const { tile, pool } = E.drawFromPool(gs.pool, color);
    if (!tile) {
      // 该颜色池空，返回提示
      const remaining = E.poolRemaining(gs.pool);
      return {
        success: true,
        data: {
          drawnTile: null,
          poolRemaining: remaining,
          empty: true,
          message: remaining.total > 0
            ? `该颜色牌已抽完，请选择${color === 'black' ? '白色' : '黑色'}`
            : '牌池已空',
        },
      };
    }

    // 加入手牌末尾
    const hand = gs.hands[caller] || [];
    tile.position = hand.length;
    hand.push(tile);
    gs.hands[caller] = hand;

    gs.drawnTileId = tile.id;
    gs.pool = pool;
    gs.phase = E.Phase.INSERTING;
    gs.turnLog.push({ turnNumber: gs.turnLog.length + 1, playerOpenid: caller, action: 'draw', color, timestamp: new Date().toISOString() });

    await db.collection('games').doc(gameId).update({
      data: {
        hands: gs.hands,
        pool: gs.pool,
        phase: gs.phase,
        drawnTileId: gs.drawnTileId,
        turnLog: gs.turnLog,
        updatedAt: db.serverDate(),
      },
    });

    return {
      success: true,
      data: {
        drawnTile: E.toSelfTile(tile),
        poolRemaining: E.poolRemaining(pool),
      },
    };
  } catch (e) {
    return { success: false, error: e.message || 'DRAW_FAILED' };
  }
};
