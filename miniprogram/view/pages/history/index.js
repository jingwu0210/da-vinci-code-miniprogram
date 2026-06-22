/**
 * 历史对局页。
 * 依赖: service/history/history-service, common/routes
 */

const HistoryService = require('../../../service/history/history-service');
const { ROUTES } = require('../../../common/routes');

Page({
  data: {
    records: [],
    stats: { totalGames: 0, wins: 0, winRate: '0%' },
    loading: true,
    hasMore: true,
    page: 1,
    empty: false,
  },

  async onLoad() {
    await this._loadPage(1);
  },

  async onReachBottom() {
    if (!this.data.hasMore) return;
    await this._loadPage(this.data.page + 1);
  },

  async onPullDownRefresh() {
    await this._loadPage(1);
    wx.stopPullDownRefresh();
  },

  async _loadPage(page) {
    try {
      const result = await HistoryService.getRecords(page, 20);
      const records = page === 1 ? result.records : [...this.data.records, ...result.records];
      this.setData({
        records,
        hasMore: result.hasMore,
        page: result.page,
        loading: false,
        empty: records.length === 0,
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },
});
