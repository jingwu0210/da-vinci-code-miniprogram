/**
 * 创建房间页。
 */
const RoomManager = require('../../../../service/room/room-manager');
const { ROUTES, buildRoute } = require('../../../../common/routes');
const { showToast, showLoading, hideLoading } = require('../../../../common/modal-helper');
const store = require('../../../../common/store');

Page({
  data: { mode: 'ai', playerCount: 2, difficulty: 'easy', password: '' },
  onLoad(options) { this.setData({ mode: options.mode || 'ai' }); },
  onSwitchMode(e) { this.setData({ mode: e.currentTarget.dataset.mode }); },
  onPlayerCount(e) { this.setData({ playerCount: parseInt(e.currentTarget.dataset.n) }); },
  onDifficulty(e) { this.setData({ difficulty: e.currentTarget.dataset.d }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },
  async onCreate() {
    const { mode, playerCount, difficulty, password } = this.data;
    showLoading('创建中…');
    try {
      const room = await RoomManager.createAndJoin({ mode, maxPlayers: playerCount, difficulty: mode === 'ai' ? difficulty : null, password });
      store.set('currentRoom', room);

      if (mode === 'ai') {
        // AI 模式：直接开始游戏
        const result = await RoomManager.startGame(room.roomId);
        hideLoading();
        wx.redirectTo({ url: buildRoute(ROUTES.BOARD, { gameId: result.gameId, roomId: room.roomId }) });
      } else {
        // 好友模式：进入等待室
        hideLoading();
        wx.redirectTo({ url: buildRoute(ROUTES.ROOM_DETAIL, { roomId: room.roomId }) });
      }
    } catch (e) {
      hideLoading();
      showToast(e.message || '创建失败');
    }
  },
});
