/**
 * Fisher-Yates 洗牌算法 —— 纯函数。
 * 依赖: common/constants (DECK_SIZE)
 */

const { DECK_SIZE } = require('../common/constants');

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 创建完整 26 张牌组（未洗牌）。
 * 返回数组元素为 { id, color, value, isJoker }。
 */
function createDeck() {
  const deck = [];
  let idx = 0;
  const colors = ['black', 'white'];
  for (const color of colors) {
    for (let v = 0; v <= 11; v++) {
      deck.push({ id: `t_${idx++}`, color, value: v, isJoker: false });
    }
    deck.push({ id: `t_${idx++}`, color, value: -1, isJoker: true });
  }
  return deck;
}

/**
 * 创建并洗牌一副完整牌组。
 */
function createShuffledDeck() {
  return shuffle(createDeck());
}

module.exports = { shuffle, createDeck, createShuffledDeck };
