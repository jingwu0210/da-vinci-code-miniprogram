/**
 * history 云函数 — 对局记录保存 & 查询。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const caller = event.callerOpenid || cloud.getWXContext().OPENID;
  if (!caller) return { success: false, error: 'NOT_AUTHORIZED' };

  switch (event.type) {
    case 'saveRecord': return saveRecord(event, caller, db);
    case 'getRecords': return getRecords(event, caller, db);
    default: return { success: false, error: 'UNKNOWN_TYPE' };
  }
};

// ── saveRecord ──
async function saveRecord(event, caller, db) {
  const { gameId } = event;
  if (!gameId) return { success: false, error: 'INVALID_PARAMS' };

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    // 计算玩家结果
    const players = [];
    const turnOrder = gs.turnOrder || [];
    for (const oid of turnOrder) {
      const hand = (gs.tiles || []).filter(t => t.owner === oid);
      const unrevealed = hand.filter(t => !t.isRevealed).length;
      players.push({
        openid: oid,
        nickName: oid.startsWith('ai_') ? 'AI' : (oid.substring(0, 8)),
        isWinner: oid === gs.winner,
        tilesRemaining: unrevealed,
      });
    }

    // 计算回合数和时长
    const totalTurns = (gs.turnLog || []).filter(l => l.action === 'pass' || l.action === 'quit' || (l.action === 'guess' && !l.isCorrect)).length;
    const duration = gs.createdAt ? Math.floor((Date.now() - new Date(gs.createdAt).getTime()) / 1000) : 0;
    const createdAt = db.serverDate();

    const record = {
      gameId,
      roomId: gs.roomId || '',
      mode: gs.mode || 'ai',
      difficulty: gs.difficulty || null,
      players,
      totalTurns,
      duration,
      winner: gs.winner || null,
      createdAt,
    };

    await db.collection('game_records').add({ data: record });

    // 更新每个参与玩家的 stats（跳过 AI）
    for (const p of players) {
      if (p.openid.startsWith('ai_')) continue;
      try {
        const playerDoc = await db.collection('players').where({ openid: p.openid }).get();
        if (playerDoc.data.length > 0) {
          const stats = playerDoc.data[0].stats || { totalGames: 0, wins: 0, losses: 0 };
          stats.totalGames = (stats.totalGames || 0) + 1;
          if (p.isWinner) stats.wins = (stats.wins || 0) + 1;
          else stats.losses = (stats.losses || 0) + 1;
          await db.collection('players').doc(playerDoc.data[0]._id).update({ data: { stats, updatedAt: db.serverDate() } });
        }
      } catch (e) { /* 非关键路径，静默失败 */ }
    }

    return { success: true, data: { record } };
  } catch (e) {
    return { success: false, error: e.message || 'SAVE_RECORD_FAILED' };
  }
}

// ── getRecords ──
async function getRecords(event, caller, db) {
  const page = event.page || 1;
  const pageSize = event.pageSize || 20;

  try {
    // 查 caller 参与的所有对局
    const totalResult = await db.collection('game_records')
      .where({ 'players.openid': caller })
      .count();
    const total = totalResult.total;

    if (total === 0) return { success: true, data: { records: [], total: 0, page, pageSize, hasMore: false } };

    const result = await db.collection('game_records')
      .where({ 'players.openid': caller })
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      success: true,
      data: {
        records: result.data,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    };
  } catch (e) {
    return { success: false, error: e.message || 'GET_RECORDS_FAILED' };
  }
}
