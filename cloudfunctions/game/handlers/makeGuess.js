/**
 * makeGuess ★ 核心 —— 猜测对手某张牌的数字。
 * 输入: { gameId, targetOpenid, position, value }
 * value = -1 表示猜 Joker，0~11 普通数字。
 * 颜色已由牌背可见，无需猜测。
 */
const E = require('./_engine');

module.exports = async function (event, caller, db) {
  const { gameId, targetOpenid, position, value } = event;
  if (!gameId || !targetOpenid || position === undefined || value === undefined) {
    return { success: false, error: 'INVALID_PARAMS' };
  }

  try {
    const doc = await db.collection('games').doc(gameId).get();
    if (!doc.data) return { success: false, error: 'GAME_NOT_FOUND', errorCode: 'GAME_NOT_FOUND' };
    const gs = doc.data;

    if (gs.status !== 'playing') return { success: false, error: 'GAME_ALREADY_FINISHED', errorCode: 'GAME_ALREADY_FINISHED' };
    if (gs.turnOrder[gs.turnIndex] !== caller) return { success: false, error: 'NOT_YOUR_TURN', errorCode: 'NOT_YOUR_TURN' };
    if (gs.phase !== E.Phase.GUESSING) return { success: false, error: 'WRONG_PHASE', errorCode: 'WRONG_PHASE' };
    if (targetOpenid === caller) return { success: false, error: 'INVALID_TARGET', errorCode: 'INVALID_TARGET' };

    const targetHand = gs.hands[targetOpenid];
    if (!targetHand) return { success: false, error: 'INVALID_TARGET', errorCode: 'INVALID_TARGET' };
    if (position < 0 || position >= targetHand.length) return { success: false, error: 'INVALID_POSITION', errorCode: 'INVALID_POSITION' };

    const targetTile = targetHand[position];
    if (!targetTile) return { success: false, error: 'INVALID_POSITION', errorCode: 'INVALID_POSITION' };
    if (targetTile.isRevealed) return { success: false, error: 'ALREADY_REVEALED', errorCode: 'ALREADY_REVEALED' };

    // ── 核心判定 ──
    const isCorrect = E.isGuessMatch({ value }, targetTile);

    gs.turnLog.push({
      turnNumber: gs.turnLog.length + 1,
      playerOpenid: caller,
      action: 'guess',
      targetOpenid,
      position,
      guessedValue: value,
      isCorrect,
      timestamp: new Date().toISOString(),
    });

    if (isCorrect) {
      // 猜对：翻开对手牌
      targetTile.isRevealed = true;

      if (E.allOpponentsEliminated(gs.hands, caller)) {
        // 所有对手全部翻开 → 获胜
        gs.status = 'finished';
        gs.winner = caller;
        gs.phase = E.Phase.WAITING;

        await db.collection('games').doc(gameId).update({
          data: {
            hands: gs.hands,
            status: gs.status,
            winner: gs.winner,
            phase: gs.phase,
            turnLog: gs.turnLog,
            updatedAt: db.serverDate(),
          },
        });

        return {
          success: true,
          data: {
            isCorrect: true,
            revealedTile: E.toOpponentTile(targetTile),
            gameOver: true,
            winner: caller,
            nextPhase: 'game_over',
          },
        };
      }

      // 还有对手未翻牌 → 可继续猜
      await db.collection('games').doc(gameId).update({
        data: {
          hands: gs.hands,
          turnLog: gs.turnLog,
          updatedAt: db.serverDate(),
        },
      });

      return {
        success: true,
        data: {
          isCorrect: true,
          revealedTile: E.toOpponentTile(targetTile),
          gameOver: false,
          nextPhase: E.Phase.GUESSING,
        },
      };
    } else {
      // 猜错：翻开自己摸的牌 → 回合结束
      const myHand = gs.hands[caller] || [];
      let myRevealedTile = null;
      if (gs.drawnTileId) {
        const dt = myHand.find(t => t.id === gs.drawnTileId);
        if (dt) {
          dt.isRevealed = true;
          myRevealedTile = E.toSelfTile(dt);
        }
      }

      gs.drawnTileId = null;
      gs.phase = E.Phase.WAITING;
      const nextIdx = (gs.turnIndex + 1) % gs.turnOrder.length;
      gs.turnIndex = nextIdx;

      await db.collection('games').doc(gameId).update({
        data: {
          hands: gs.hands,
          phase: gs.phase,
          turnIndex: gs.turnIndex,
          drawnTileId: null,
          turnLog: gs.turnLog,
          updatedAt: db.serverDate(),
        },
      });

      return {
        success: true,
        data: {
          isCorrect: false,
          myRevealedTile,
          gameOver: false,
          nextPhase: E.Phase.WAITING,
          nextTurnOpenid: gs.turnOrder[nextIdx],
        },
      };
    }
  } catch (e) {
    return { success: false, error: e.message || 'GUESS_FAILED' };
  }
};
