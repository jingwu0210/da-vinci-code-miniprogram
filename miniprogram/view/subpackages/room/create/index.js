/**
 * 创建/加入房间页 — 好友联机入口。
 */
var RoomManager = require('../../../../service/room/room-manager');
var { ROUTES, buildRoute } = require('../../../../common/routes');
var { showToast, showLoading, hideLoading } = require('../../../../common/modal-helper');
var store = require('../../../../common/store');

Page({
  data: { playerCount: 2, password: '' },

  onPlayerCount(e) { this.setData({ playerCount: parseInt(e.currentTarget.dataset.n) }); },
  onPasswordInput(e) {
    // 只允许数字，最多4位
    var val = (e.detail.value || '').replace(/[^0-9]/g, '').slice(0, 4);
    this.setData({ password: val });
  },

  async onCreate() {
    var self = this;
    showLoading('创建中…');
    try {
      var room = await RoomManager.createAndJoin({
        mode: 'friends', maxPlayers: self.data.playerCount,
        password: self.data.password ? parseInt(self.data.password) : null,
      });
      showToast('房间已创建');
      wx.redirectTo({ url: buildRoute(ROUTES.ROOM_DETAIL, { roomId: room.roomId }) });
    } catch (e) { showToast(e.message || '创建失败'); }
    hideLoading();
  },

});
