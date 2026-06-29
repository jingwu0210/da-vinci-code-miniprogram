/**
 * drawTile —— 从指定颜色牌池摸一张牌。owner='pool' → owner=caller。
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId, color } = event;
  if (!gameId || !color) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND', errorCode: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    if (gs.status !== 'playing') return { success: false, error: 'GAME_ALREADY_FINISHED' };
    if (gs.turnOrder[gs.turnIndex] !== caller) return { success: false, error: 'NOT_YOUR_TURN' };
    if (gs.phase === E.Phase.WAITING) gs.phase = E.Phase.DRAWING; // 新回合自动开始
    if (gs.phase !== E.Phase.DRAWING) return { success: false, error: 'WRONG_PHASE' };
    if (gs.drawnTileId) return { success: false, error: 'ALREADY_DRAWN' };

    const { tile, tiles } = E.drawFromPool(gs.tiles, color, caller);
    if (!tile) {
      const remaining = E.poolRemaining(gs.tiles);
      // 池空 → 跳过摸牌，直接进入猜测
      if (remaining.total === 0) {
        gs.drawnTileId = null;
        gs.phase = E.Phase.GUESSING;
        gs.turnLog.push({ turnNumber: gs.turnLog.length+1, playerOpenid: caller, action: 'draw_skip', timestamp: new Date().toISOString() });
        await db.collection('games').doc(gameId).update({ data: { phase: gs.phase, turnLog: gs.turnLog, updatedAt: db.serverDate() }});
      }
      return { success: true, data: { drawnTile: null, poolRemaining: remaining, empty: true,
        message: remaining.total > 0 ? `该颜色已空，请选${color==='black'?'白色':'黑色'}` : '牌池已空' }};
    }

    gs.tiles = tiles;
    gs.drawnTileId = tile.id;
    gs.phase = E.Phase.GUESSING;
    gs.turnLog.push({ turnNumber: gs.turnLog.length+1, playerOpenid: caller, action: 'draw', color, timestamp: new Date().toISOString() });

    await db.collection('games').doc(gameId).update({ data: {
      tiles: gs.tiles, phase: gs.phase, drawnTileId: gs.drawnTileId, turnLog: gs.turnLog, updatedAt: db.serverDate(),
    }});

    return { success: true, data: { drawnTile: E.toSelfTile(tile), poolRemaining: E.poolRemaining(tiles) }};
  } catch (e) {
    return { success: false, error: e.message || 'DRAW_FAILED' };
  }
};
