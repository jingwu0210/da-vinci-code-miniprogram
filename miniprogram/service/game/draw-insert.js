/**
 * 摸牌 + 插入逻辑 —— 编排。
 * 依赖: common/constants
 */

const { JOKER_VALUE } = require('../../common/constants');

/**
 * 建议插入位置（启发式 —— 客户端辅助，非强制）。
 * 返回第一个违反排序规则的位置，或手牌末尾。
 */
function suggestInsertPosition(hand, drawnTile) {
  if (!drawnTile || drawnTile.value === JOKER_VALUE) {
    return hand.length; // Joker 建议放末尾
  }

  for (let i = 0; i < hand.length; i++) {
    const t = hand[i];
    if (t.isJoker || t.value === JOKER_VALUE) continue;
    if (drawnTile.value < t.value) return i;
    if (drawnTile.value === t.value && drawnTile.color === 'black' && t.color === 'white') return i;
  }
  return hand.length;
}

module.exports = { suggestInsertPosition };
