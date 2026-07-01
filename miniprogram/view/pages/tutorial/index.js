/**
 * 教程页 — 6 步滑动引导。
 */
const { ROUTES } = require('../../../common/routes');

Page({
  data: { step: 0 },
  onStepChange(e) { this.setData({ step: e.detail.current }); },
  onTapLobby() { wx.navigateBack({ fail: function() { wx.redirectTo({ url: ROUTES.LOBBY }); } }); },
});
