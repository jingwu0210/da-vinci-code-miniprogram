/**
 * 回合流转管理 —— 状态机驱动。
 * 依赖: common/enums (Phase)
 */

const { Phase } = require('../../common/enums');

/**
 * pass 事件等同于猜错——摸到的牌会被翻开。
 */
const PASS_REVEALS_TILE = true;

/**
 * 获取给定阶段的下一阶段（无副作用，纯判定）。
 * pass 的 nextPhase 为 WAITING（等同猜错），调用方需自行处理 isRevealed 副作用。
 */
function nextPhase(currentPhase, event) {
  const transitions = {
    [Phase.DRAWING]:   { draw: Phase.INSERTING, skip: Phase.GUESSING },
    [Phase.INSERTING]: { insert: Phase.GUESSING },
    [Phase.GUESSING]:  {
      correct: Phase.GUESSING,
      wrong:   Phase.WAITING,
      pass:    Phase.WAITING,     // ← pass = wrong
    },
    [Phase.WAITING]:   { begin: Phase.DRAWING },
  };

  const phaseTransitions = transitions[currentPhase];
  if (!phaseTransitions) return currentPhase;
  return phaseTransitions[event] || currentPhase;
}

/**
 * 判断当前阶段是否为当前玩家的操作阶段。
 */
function isMyActionPhase(phase) {
  return phase !== Phase.WAITING;
}

/**
 * 判断该事件是否导致当前回合结束（进入 WAITING 或 GAME_OVER）。
 */
function endsTurn(currentPhase, event) {
  const next = nextPhase(currentPhase, event);
  return next === Phase.WAITING;
}

module.exports = { nextPhase, isMyActionPhase, endsTurn, PASS_REVEALS_TILE };
