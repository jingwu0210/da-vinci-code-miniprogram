/**
 * 结算页。
 * 依赖: service/history/history-service, common/routes, common/modal-helper
 */

const HistoryService = require('../../../service/history/history-service');
const { ROUTES } = require('../../../common/routes');
const { ROUTES: Routes } = require('../../../common/routes');

Page({
  data: {
    record: null,
    loading: true,
  },

  async onLoad(options) {
    try {
      const resp = await HistoryService.saveRecord(options.gameId);
      this.setData({ record: resp.data.record, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onTapLobby() {
    wx.reLaunch({ url: ROUTES.LOBBY });
  },

  onShareAppMessage() {
    return {
      title: '我在达芬奇密码中获胜了！来挑战我吧！',
      path: ROUTES.LOBBY,
    };
  },
});
