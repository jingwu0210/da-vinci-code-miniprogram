/**
 * 单机配置页 — 选择难度后直接开始人机对战。
 */
var GameCall = require('../../../cloud/cloud-functions/game-call');
var store = require('../../../common/store');
var { ROUTES, buildRoute } = require('../../../common/routes');
var { showToast } = require('../../../common/modal-helper');

Page({
  data: {
    selected: 'medium',
  },

  onSelect(e) {
    this.setData({ selected: e.currentTarget.dataset.diff });
  },

  async onStart() {
    var self = this;
    var diff = this.data.selected;

    // AI 对战固定 1v1，难度仅影响 AI 策略
    var playerId = (store.get('user') && store.get('user').openid) || getApp().globalData.touristId;
    var players = [{ openid: playerId }, { openid: 'ai_1', isAI: true }];

    showToast('创建对局中…');
    try {
      var resp = await GameCall.initGame({
        roomId: 'ai_' + Date.now().toString(36),
        players: players,
        mode: 'ai',
        difficulty: diff,
      });
      if (resp.success && resp.data) {
        store.set('currentGameId', resp.data.gameId);
        store.set('currentRoom', { mode: 'ai', difficulty: diff });
        wx.redirectTo({
          url: buildRoute(ROUTES.BOARD, { gameId: resp.data.gameId, roomId: 'ai_' + Date.now().toString(36) }),
        });
      } else {
        showToast(resp.error || '创建失败');
      }
    } catch (e) {
      showToast(e.message || '创建失败');
    }
  },
});
