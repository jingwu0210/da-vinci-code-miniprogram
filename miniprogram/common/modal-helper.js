/**
 * 通用弹窗封装 —— 所有页面的 wx.showModal / wx.showToast 统一走这里。
 * 仅提供 UI 交互封装，不包含业务逻辑。
 */

function showConfirm(title, content, { confirmText = '确定', cancelText = '取消' } = {}) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText,
      cancelText,
      success: (res) => resolve(res.confirm),
      fail: () => resolve(false),
    });
  });
}

function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration });
}

function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

function hideLoading() {
  wx.hideLoading();
}

function showActionSheet(itemList) {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList,
      success: (res) => resolve(res.tapIndex),
      fail: () => resolve(-1),
    });
  });
}

module.exports = {
  showConfirm,
  showToast,
  showLoading,
  hideLoading,
  showActionSheet,
};
