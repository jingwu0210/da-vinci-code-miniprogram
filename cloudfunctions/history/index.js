/**
 * history 云函数 — 对局记录保存 & 查询。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  // history 仅限微信用户（游客走本地缓存，无 cloud.getWXContext().OPENID）
  const caller = cloud.getWXContext().OPENID;
  if (!caller) return { success: false, error: 'NOT_AUTHORIZED', errorCode: 'WECHAT_LOGIN_REQUIRED' };

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

    // 查询玩家昵称
    var playerProfiles = {};
    var humanOids = (gs.turnOrder || []).filter(function(o) { return !o.startsWith('ai_'); });
    if (humanOids.length > 0) {
      var profileRes = await db.collection('players').where({ openid: db.command.in(humanOids) }).get();
      (profileRes.data || []).forEach(function(p) { playerProfiles[p.openid] = p.nickName || ''; });
    }

    // 计算玩家结果
    var players = [];
    var turnOrder = gs.turnOrder || [];
    for (var i = 0; i < turnOrder.length; i++) {
      var oid = turnOrder[i];
      var hand = (gs.tiles || []).filter(function(t) { return t.owner === oid; });
      var unrevealed = hand.filter(function(t) { return !t.isRevealed; }).length;
      var name = oid.startsWith('ai_') ? 'AI' : (playerProfiles[oid] || oid.substring(0, 10));
      players.push({
        openid: oid,
        nickName: name,
        isWinner: oid === gs.winner,
        tilesRemaining: unrevealed,
      });
    }
    // 胜者排第一，其余按剩余暗牌数升序
    players.sort(function(a, b) {
      if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
      return a.tilesRemaining - b.tilesRemaining;
    });

    // 计算回合数和时长
    var totalTurns = (gs.turnLog || []).filter(function(l) { return l.action === 'pass' || l.action === 'quit' || (l.action === 'guess' && !l.isCorrect); }).length;
    var duration = gs.createdAt ? Math.floor((Date.now() - new Date(gs.createdAt).getTime()) / 1000) : 0;
    var createdAt = db.serverDate();

    var record = {
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

    return { success: true, data: { record: record, isWinner: caller === gs.winner } };
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
