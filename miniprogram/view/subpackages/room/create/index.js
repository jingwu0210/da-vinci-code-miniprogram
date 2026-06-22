/**
 * 创建房间页。
 * 依赖: service/room/room-manager, common/routes, common/modal-helper
 */

const RoomManager = require('../../../../service/room/room-manager');
const { ROUTES, buildRoute } = require('../../../../common/routes');
const { showToast } = require('../../../../common/modal-helper');

Page({
  data: {
    mode:       'ai',       // ai | friends
    playerCount: 2,
    difficulty: 'easy',
    password:   '',
  },

  onLoad(options) {
    const mode = options.mode || 'ai';
    this.setData({ mode });
  },

  onPlayerCountChange(e) {
    this.setData({ playerCount: parseInt(e.detail.value) });
  },

  onDifficultyChange(e) {
    this.setData({ difficulty: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  async onCreateRoom() {
    const { mode, playerCount, difficulty, password } = this.data;
    try {
      const room = await RoomManager.createAndJoin({
        mode,
        maxPlayers: playerCount,
        difficulty: mode === 'ai' ? difficulty : null,
        password: password || '',
      });
      wx.redirectTo({ url: buildRoute(ROUTES.ROOM_DETAIL, { roomId: room.roomId }) });
    } catch (e) {
      showToast(e.message || '创建失败');
    }
  },
});
