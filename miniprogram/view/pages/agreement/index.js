Page({
  data: { type: 'user_agreement' },
  onLoad(options) {
    if (options.type) this.setData({ type: options.type });
    wx.setNavigationBarTitle({
      title: options.type === 'privacy' ? '隐私政策' : '用户协议'
    });
  },
});
