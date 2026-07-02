/**
 * 历史对局页。
 */
const HistoryService = require('../../../service/history/history-service');
const { ROUTES } = require('../../../common/routes');
const login = require('../../../utils/login');
const store = require('../../../common/store');
var logger = require('../../../utils/logger');

Page({
  data: {
    records: [],
    stats: { totalGames: 0, wins: 0, winRate: '0%' },
    loading: true,
    hasMore: true,
    page: 1,
    empty: false,
    userType: 'tourist',
  },

  async onLoad() {
    var ut = login.getUserType();
    logger.debug('[history] onLoad userType=' + ut + ' storeUserType=' + (store.get('userType') || '?'));
    this.setData({ userType: ut });
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
      // 游客: 读本地缓存
      if (login.getUserType() === 'tourist') {
        var all = login.getLocalRecords();
        logger.debug('[history] tourist mode, local records=' + all.length);
        var pageSize = 20;
        var paged = all.slice((page - 1) * pageSize, page * pageSize);
        var records = page === 1 ? paged : this.data.records.concat(paged);
        var hasMore = page * pageSize < all.length;
        logger.debug('[history] tourist: all=' + all.length + ' records=' + records.length);
        try {
          var s = _calcStats(records);
          var fmt = _fmtRecords(records);
          logger.debug('[history] fmt ok, count=' + fmt.length);
          this.setData({ records: fmt, stats: s, hasMore: hasMore, page: page, loading: false, empty: records.length === 0 }, function() {
            logger.debug('[history] setData callback, stats=' + JSON.stringify(this.data.stats));
          }.bind(this));
          logger.debug('[history] after setData, stats=' + JSON.stringify(this.data.stats));
        } catch(e) {
          logger.debug('[history] ERROR:', e.message);
        }
        return;
      }

      // 微信用户: 云端查询
      var result = await HistoryService.getRecords(page, 20);
      var records = page === 1 ? result.records : this.data.records.concat(result.records);
      records = _fmtRecords(records);

      logger.debug('[history] records=' + records.length + ' first=' + JSON.stringify(records[0]));
      this.setData({
        records: records,
        stats: _calcStats(records),
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

function _fmtRecords(records) {
  return records.map(function(r) {
    var dur = r.duration || 0;
    // 格式化时间：月月/日日 时时:分分
    var dateStr = '';
    if (r.createdAt) {
      var d = new Date(r.createdAt);
      if (!isNaN(d.getTime())) {
        dateStr = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
                  String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      }
    }
    // 难度/人数标签
    var modeLabel = r.mode === 'ai' ? '人机对战' : '好友联机';
    if (r.mode === 'ai' && r.difficulty) {
      var diffMap = { easy: '简单', medium: '中等', hard: '困难' };
      modeLabel += '（' + (diffMap[r.difficulty] || r.difficulty) + '）';
    } else if (r.mode !== 'ai') {
      var pc = (r.players || []).length || r.playerCount || 0;
      if (pc) modeLabel += '（' + pc + '人）';
    }
    return Object.assign({}, r, {
      durStr: dur >= 60 ? Math.floor(dur / 60) + '分' + (dur % 60) + '秒' : dur + '秒',
      dateStr: dateStr,
      modeLabel: modeLabel,
      myWin: (r.players || []).some(function(p) { return p.isWinner && p.nickName !== 'AI'; }),
    });
  });
}

function _calcStats(records) {
  var wins = 0;
  records.forEach(function(r) {
    var me = (r.players || []).find(function(p) { return p.nickName !== 'AI'; });
    logger.debug('[history] calcStats: me=' + JSON.stringify(me) + ' winner=' + (me && me.isWinner));
    if (me && me.isWinner) wins++;
  });
  var result = {
    totalGames: records.length,
    wins: wins,
    winRate: records.length > 0 ? (wins / records.length * 100).toFixed(0) + '%' : '0%',
  };
  logger.debug('[history] calcStats result:', JSON.stringify(result));
  return result;
}
