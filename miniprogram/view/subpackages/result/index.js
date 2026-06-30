/**
 * 结算页。
 */
const HistoryService = require('../../../service/history/history-service');
const { ROUTES } = require('../../../common/routes');
const { resultShareConfig } = require('../../../cloud/share/share-helper');

Page({
  data: {
    record: null,
    isWinner: false,
    loading: true,
  },

  async onLoad(options) {
    const app = getApp();
    const myOpenid = app.globalData?.myOpenid || '';
    try {
      const resp = await HistoryService.saveRecord(options.gameId);
      const record = resp.data.record;
      const isWinner = record.winner === myOpenid;
      this.setData({ record, isWinner, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onTapLobby() {
    wx.reLaunch({ url: ROUTES.LOBBY });
  },

  onShareAppMessage() {
    const cfg = resultShareConfig();
    return { title: cfg.title, path: cfg.path };
  },
});
