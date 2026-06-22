/**
 * 摸牌入场动画。
 */
function slideIn(element, callback) {
  const animation = wx.createAnimation({ duration: 300, timingFunction: 'ease-out' });
  animation.translateY(-40).opacity(0).step({ duration: 1 })
    .translateY(0).opacity(1).step();
  element.animation = animation.export();
  setTimeout(callback, 300);
}

module.exports = { slideIn };
