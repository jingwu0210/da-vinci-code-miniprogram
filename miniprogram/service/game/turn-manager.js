/**
 * 回合流转管理 —— 状态机驱动。
 * 依赖: common/enums (Phase)
 */

const { Phase } = require('../../common/enums');

/**
 * 获取给定阶段的下一阶段（无副作用，纯判定）。
 */
function nextPhase(currentPhase, event) {
  const transitions = {
    [Phase.DRAWING]:   { draw_tile: Phase.INSERTING, skip_draw: Phase.GUESSING },
    [Phase.INSERTING]: { insert: Phase.GUESSING },
    [Phase.GUESSING]:  { guess_correct: Phase.GUESSING, guess_wrong: Phase.WAITING, pass: Phase.WAITING },
    [Phase.WAITING]:   { begin_turn: Phase.DRAWING },
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

module.exports = { nextPhase, isMyActionPhase };
