/**
 * 卡牌推倒动画（三段式）。
 * 依赖: ../../common/constants (FLIP_ANIM_DURATION)
 */
const { FLIP_ANIM_DURATION } = require('../../common/constants');

/**
 * 阶段一：晃动 (0~350ms)
 */
function sway(element, callback) {
  const animation = wx.createAnimation({ duration: 350, timingFunction: 'ease-in-out' });
  // 晃动 3 次: 0→8→-5→3→-2→1→0
  animation.rotate(8).step()
    .rotate(-5).step()
    .rotate(3).step()
    .rotate(-2).step()
    .rotate(0).step();
  element.animation = animation.export();
  setTimeout(callback, 350);
}

/**
 * 阶段二：推倒 (0~300ms)
 */
function pushOver(element, callback) {
  const animation = wx.createAnimation({
    duration: 300,
    timingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  });
  animation.scaleX(1.15).scaleY(0.08).translateY(30).opacity(0.6).step();
  element.animation = animation.export();
  setTimeout(callback, 300);
}

/**
 * 阶段三：落定 (0~250ms)
 */
function settle(element, callback) {
  const animation = wx.createAnimation({ duration: 250, timingFunction: 'ease-out' });
  animation.scaleX(1.0).scaleY(1.0).translateY(0).opacity(1).step();
  element.animation = animation.export();
  setTimeout(callback, 250);
}

/**
 * 完整推倒动画 (三段串行, ~900ms)
 * 返回 Promise，动画完成后 resolve。
 */
function flipTile(element) {
  return new Promise((resolve) => {
    sway(element, () => {
      pushOver(element, () => {
        settle(element, resolve);
      });
    });
  });
}

module.exports = { sway, pushOver, settle, flipTile };
