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
      var record = resp.data.record;
      var isWinner = record.winner === myOpenid;
      // WXML 不支持 .toFixed()，在 JS 中预格式化
      var dur = record.duration || 0;
      record.durStr = dur >= 60 ? Math.floor(dur / 60) + '分' + (dur % 60) + '秒' : dur + '秒';
      record.diffStr = record.difficulty === 'easy' ? '简单' : record.difficulty === 'medium' ? '中等' : record.difficulty === 'hard' ? '困难' : '';
      this.setData({ record: record, isWinner: isWinner, loading: false });
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
