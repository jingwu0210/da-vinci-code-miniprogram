/**
 * AI 控制器 —— 入口，按难度选择策略。
 * 依赖: ./strategy-easy, ./strategy-medium, ./strategy-hard, common/enums
 */

const { Difficulty } = require('../../common/enums');
const EasyAI = require('./strategy-easy');
const MediumAI = require('./strategy-medium');
const HardAI = require('./strategy-hard');

const STRATEGIES = {
  [Difficulty.EASY]:   EasyAI,
  [Difficulty.MEDIUM]: MediumAI,
  [Difficulty.HARD]:   HardAI,
};

/**
 * 执行一次完整 AI 回合，返回动作序列。
 */
function executeTurn(gameState, aiOpenid, difficulty = Difficulty.EASY) {
  const strategy = STRATEGIES[difficulty] || EasyAI;
  return strategy.execute(gameState, aiOpenid);
}

module.exports = { executeTurn };
