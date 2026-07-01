/**
 * 大厅页 — 模式选择、房间加入、用户信息。
 */
var GameCall = require('../../../cloud/cloud-functions/game-call');
var { ROUTES, buildRoute } = require('../../../common/routes');
var store = require('../../../common/store');
var { showToast } = require('../../../common/modal-helper');

Page({
  data: {
    user: {}, winRate: 0,
    showDifficulty: false, selectedDifficulty: 'medium',
  },

  onShow() {
    var user = store.get('user') || {};
    if (user && !user.isGuest && user.openid && !user.openid.startsWith('t_')) {
      var UserCall = require('../../../cloud/cloud-functions/user-call');
      UserCall.login().then(function(resp) {
        if (resp.success && resp.data.profile) {
          store.set('user', Object.assign({}, user, resp.data.profile, { isGuest: false }));
        }
      }).catch(function() {});
    }
    var stats = user.stats || {};
    var total = stats.totalGames || 0;
    var wins = stats.wins || 0;
    this.setData({ user, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 });
  },

  // ── 人机对战 ──
  onTapAi() { this.setData({ showDifficulty: true, selectedDifficulty: 'medium' }); },
  onSelectDifficulty(e) { this.setData({ selectedDifficulty: e.currentTarget.dataset.diff }); },
  onCancelDifficulty() { this.setData({ showDifficulty: false }); },

  async onConfirmAi() {
    var self = this;
    var diff = this.data.selectedDifficulty;
    this.setData({ showDifficulty: false });
    try {
      // 直接 initGame 跳过 room/create 页面
      var playerId = store.get('user') && store.get('user').openid;
      if (!playerId) playerId = getApp().globalData.touristId;
      showToast('创建对局中…');
      var resp = await GameCall.initGame({
        roomId: 'ai_' + Date.now().toString(36),
        players: [{ openid: playerId }, { openid: 'ai_1', isAI: true }],
        mode: 'ai', difficulty: diff,
      });
      if (resp.success && resp.data) {
        store.set('currentGameId', resp.data.gameId);
        store.set('currentRoom', { mode: 'ai', difficulty: diff });
        wx.redirectTo({ url: buildRoute(ROUTES.BOARD, { gameId: resp.data.gameId, roomId: 'ai_' + Date.now().toString(36) }) });
      } else { showToast(resp.error || '创建失败'); }
    } catch (e) { showToast(e.message || '创建失败'); }
  },

  // ── 好友联机 → room/create 页面 ──
  onTapFriends() { wx.navigateTo({ url: buildRoute(ROUTES.ROOM_CREATE, { mode: 'friends' }) }); },

  // ── 通用 ──
  onTapSettings()   { wx.navigateTo({ url: ROUTES.SETTINGS }); },
  onTapTutorial()   { wx.navigateTo({ url: ROUTES.TUTORIAL }); },
  onTapHistory()    { wx.navigateTo({ url: ROUTES.HISTORY }); },

  onTapExit() {
    var login = require('../../../utils/login');
    var u = store.get('user');
    if (store.get('userType') === 'wechat' || (u && !u.isGuest)) login.logout();
    wx.reLaunch({ url: ROUTES.LOGIN });
  },
});
