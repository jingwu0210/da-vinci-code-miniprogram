/**
 * 猜测逻辑 —— 判定 + 副作用编排。
 * 依赖: common/constants
 */

const { JOKER_VALUE } = require('../../common/constants');

/**
 * 纯判定 —— 猜测是否匹配实际牌。
 * 牌为有色塑料材质，背面与正面同色。对手暗牌的底色从背面可见，
 * 因此猜测时无需猜测颜色，仅需猜数字（0~11 或 -1 Joker）。
 */
function isGuessMatch(guess, tile) {
  // 仅比较数值 —— Joker(value=-1) 或数字(0~11)
  return guess.value === tile.value;
}

/**
 * 校验猜测合法性（纯函数）。
 */
function validateGuess(guess, gameState, callerOpenid) {
  const errors = [];

  if (!gameState) errors.push('GAME_NOT_FOUND');
  if (guess.targetOpenid === callerOpenid) errors.push('INVALID_TARGET');
  if (!gameState.turnOrder.includes(guess.targetOpenid)) errors.push('INVALID_TARGET');

  const targetHand = gameState.hands[guess.targetOpenid];
  if (!targetHand) errors.push('INVALID_TARGET');
  else {
    const tile = targetHand[guess.position];
    if (!tile) errors.push('INVALID_POSITION');
    else if (tile.isRevealed) errors.push('ALREADY_REVEALED');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { isGuessMatch, validateGuess };
