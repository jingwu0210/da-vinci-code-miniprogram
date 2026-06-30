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
      var records = page === 1 ? result.records : [...this.data.records, ...result.records];

      // 格式化记录（WXML 不支持 .toFixed() 等方法调用）
      records = records.map(function(r) {
        var dur = r.duration || 0;
        var durStr = dur >= 60 ? Math.floor(dur / 60) + '分' + (dur % 60) + '秒' : dur + '秒';
        var dateStr = r.createdAt ? r.createdAt.substring(0, 10) : '';
        // 胜负标记
        var app = getApp();
        var myOid = app.globalData?.myOpenid || '';
        var me = (r.players || []).find(function(p) { return p.openid === myOid; });
        return Object.assign({}, r, { durStr: durStr, dateStr: dateStr, myWin: me && me.isWinner });
      });

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
