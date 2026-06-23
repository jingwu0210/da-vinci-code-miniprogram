/**
 * 创建房间页。
 */
const RoomManager = require('../../../../service/room/room-manager');
const { ROUTES, buildRoute } = require('../../../../common/routes');
const { showToast } = require('../../../../common/modal-helper');

Page({
  data: { mode: 'ai', playerCount: 2, difficulty: 'easy', password: '' },
  onLoad(options) { this.setData({ mode: options.mode || 'ai' }); },
  onSwitchMode(e) { this.setData({ mode: e.currentTarget.dataset.mode }); },
  onPlayerCount(e) { this.setData({ playerCount: parseInt(e.currentTarget.dataset.n) }); },
  onDifficulty(e) { this.setData({ difficulty: e.currentTarget.dataset.d }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },
  async onCreate() {
    const { mode, playerCount, difficulty, password } = this.data;
    try {
      const room = await RoomManager.createAndJoin({ mode, maxPlayers: playerCount, difficulty: mode === 'ai' ? difficulty : null, password });
      wx.redirectTo({ url: buildRoute(ROUTES.ROOM_DETAIL, { roomId: room.roomId }) });
    } catch (e) { showToast(e.message || '创建失败'); }
  },
});
