/**
 * EASY AI — 随机决策。
 */
const C = require('./ai-common');

exports.pickColor = function(pool, gs, aiPlayer) {
  if (pool.black > 0 && pool.white > 0) return Math.random() < 0.5 ? 'black' : 'white';
  return pool.black > 0 ? 'black' : 'white';
};

exports.pickGuess = function(gs, aiPlayer) {
  var opps = C.getOpponents(gs.tiles, aiPlayer);
  if (!opps.length) return null;
  var target = opps[Math.floor(Math.random() * opps.length)];
  var tHand = C.getHand(gs.tiles, target).filter(function(t) { return !t.isRevealed; });
  if (!tHand.length) return null;
  var pos = tHand[Math.floor(Math.random() * tHand.length)].position;
  var val = Math.random() < 0.03 ? -1 : Math.floor(Math.random() * 12);
  return { target: target, position: pos, value: val };
};

// Easy: 猜对后 30% 概率继续，无连猜次数上限
exports.shouldContinue = function(gs, aiPlayer, consecutiveCorrect) {
  return Math.random() < 0.3;
};
