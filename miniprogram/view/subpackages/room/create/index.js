/**
 * 创建/加入房间页 — 好友联机入口。
 */
var RoomManager = require('../../../../service/room/room-manager');
var { ROUTES, buildRoute } = require('../../../../common/routes');
var { showToast, showLoading, hideLoading } = require('../../../../common/modal-helper');
var store = require('../../../../common/store');

Page({
  data: { tab: 'create', playerCount: 2, password: '', roomCode: '' },

  onSwitchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }); },
  onPlayerCount(e) { this.setData({ playerCount: parseInt(e.currentTarget.dataset.n) }); },
  onPasswordInput(e) {
    // 只允许数字
    var val = (e.detail.value || '').replace(/[^0-9]/g, '').slice(0, 6);
    this.setData({ password: val });
  },
  onRoomCodeInput(e) { this.setData({ roomCode: e.detail.value.toUpperCase() }); },

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

  async onJoin() {
    var code = this.data.roomCode.trim();
    if (!code || code.length !== 6) { showToast('请输入 6 位房间码'); return; }
    try {
      await RoomManager.joinRoom(code);
      wx.redirectTo({ url: buildRoute(ROUTES.ROOM_DETAIL, { roomId: code }) });
    } catch (e) { showToast(e.message || '加入失败'); }
  },
});
