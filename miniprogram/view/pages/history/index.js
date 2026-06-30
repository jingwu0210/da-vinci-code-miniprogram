/**
 * 历史对局页。
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
      const app = getApp();
      const myOpenid = app.globalData?.myOpenid || '';
      const result = await HistoryService.getRecords(page, 20);
      const records = page === 1 ? result.records : [...this.data.records, ...result.records];

      // 计算统计
      let wins = 0;
      records.forEach(r => {
        const me = (r.players || []).find(p => p.openid === myOpenid);
        if (me && me.isWinner) wins++;
      });
      const stats = {
        totalGames: records.length,  // 本地 count，后续可从云端获取总计数
        wins,
        winRate: records.length > 0 ? (wins / records.length * 100).toFixed(0) + '%' : '0%',
      };

      this.setData({
        records,
        stats,
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
