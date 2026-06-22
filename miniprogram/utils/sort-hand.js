/**
 * 手牌排序 —— 纯函数。
 * 排序规则: 从小到大 → 同值黑左白右 → Joker 任意位（不参与排序比较）
 * 依赖: common/enums (Color), common/constants (JOKER_VALUE)
 */

const { Color } = require('../common/enums');
const { JOKER_VALUE } = require('../common/constants');

/**
 * 计算牌的排序键。
 * Joker 返回 Infinity，使其在排序时排到最后（或由调用者自行处理位置）。
 */
function sortKey(tile) {
  if (tile.isJoker || tile.value === JOKER_VALUE) {
    return [Infinity, 0];
  }
  const colorOrder = tile.color === Color.BLACK ? 0 : 1;
  return [tile.value, colorOrder];
}

/**
 * 比较两张牌: -1 (a<b), 0 (相等), 1 (a>b)。
 */
function compare(a, b) {
  const ka = sortKey(a);
  const kb = sortKey(b);
  if (ka[0] < kb[0]) return -1;
  if (ka[0] > kb[0]) return 1;
  if (ka[1] < kb[1]) return -1;
  if (ka[1] > kb[1]) return 1;
  return 0;
}

/**
 * 按规则排序手牌。
 * Joker 牌保持原位置不变，非 Joker 牌按 (value, color) 排序后填入。
 */
function sortHand(hand) {
  const jokerIndices = [];
  const nonJokers = [];

  hand.forEach((tile, i) => {
    if (tile.isJoker || tile.value === JOKER_VALUE) {
      jokerIndices.push(i);
    } else {
      nonJokers.push(tile);
    }
  });

  nonJokers.sort(compare);

  const result = [...hand];
  // Joker 保持原位置
  jokerIndices.forEach((ji) => {
    result[ji] = hand[ji];
  });

  // 非 Joker 按序填入非 Joker 位置
  let ni = 0;
  for (let i = 0; i < result.length; i++) {
    if (!result[i].isJoker && result[i].value !== JOKER_VALUE) {
      result[i] = nonJokers[ni++];
    }
  }

  // 更新 position 字段
  result.forEach((t, i) => { t.position = i; });

  return result;
}

module.exports = { sortKey, compare, sortHand };
