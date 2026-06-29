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

/**
 * 比较两个 sortKey 数组，返回 -1/0/1。
 */
function _compareKey(a, b) {
  if (a[0] < b[0]) return -1;
  if (a[0] > b[0]) return 1;
  if (a[1] < b[1]) return -1;
  if (a[1] > b[1]) return 1;
  return 0;
}

/**
 * 返回手牌中所有合法插入位置索引。
 * 位置 i 合法当且仅当:
 *   (i==0 || sortKey(hand[i-1]) ≤ sortKey(tile))
 *   ∧
 *   (i==len || sortKey(tile) ≤ sortKey(hand[i]))
 *
 * Joker 牌（sortKey → [Infinity, 0]）可在任意位置插入。
 */
function findValidInsertPositions(hand, tile) {
  const positions = [];
  const len = hand.length;

  // Joker 可在任意位置插入
  if (tile.isJoker || tile.value === JOKER_VALUE) {
    for (let i = 0; i <= len; i++) positions.push(i);
    return positions;
  }

  const tk = sortKey(tile);

  for (let i = 0; i <= len; i++) {
    const leftOk = (i === 0) || _compareKey(sortKey(hand[i - 1]), tk) <= 0;
    const rightOk = (i === len) || _compareKey(tk, sortKey(hand[i])) <= 0;
    if (leftOk && rightOk) {
      positions.push(i);
    }
  }
  return positions;
}

module.exports = { sortKey, compare, sortHand, findValidInsertPositions };
