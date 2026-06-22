/**
 * 房间等待室。
 * 依赖: service/room/room-manager, common/routes, common/modal-helper, model/store/app-store
 */

const RoomManager = require('../../../../service/room/room-manager');
const { ROUTES, buildRoute } = require('../../../../common/routes');
const { showToast, showConfirm } = require('../../../../common/modal-helper');
const store = require('../../../../common/store');

Page({
  data: {
    room: null,
  },

  _roomId: null,
  _watcher: null,

  async onLoad(options) {
    this._roomId = options.roomId;
    try {
      const room = await RoomManager.joinRoom(this._roomId);
      this.setData({ room });
      store.set('currentRoom', room);

      // 订阅实时更新
      this._watcher = RoomManager.subscribe(this._roomId, (doc) => {
        this.setData({ room: doc });
        if (doc.status === 'playing') {
          wx.redirectTo({ url: buildRoute(ROUTES.BOARD, { roomId: doc.roomId }) });
        }
      });
    } catch (e) {
      showToast(e.message || '加入房间失败');
    }
  },

  onUnload() {
    if (this._watcher) this._watcher.close();
  },

  async onToggleReady() {
    const isReady = !(this.data.room.players.find(p => !p.isAI)?.isReady);
    try {
      await RoomManager.toggleReady(this._roomId, !isReady);
    } catch (e) {
      showToast(e.message);
    }
  },

  async onStartGame() {
    try {
      const result = await RoomManager.startGame(this._roomId);
      // watch 回调会触发跳转
    } catch (e) {
      showToast(e.message);
    }
  },

  async onLeaveRoom() {
    const ok = await showConfirm('离开房间', '确定离开当前房间？');
    if (ok) {
      await RoomManager.leaveRoom(this._roomId);
      wx.navigateBack();
    }
  },

  onShareAppMessage() {
    return RoomManager.getShareConfig(this._roomId);
  },
});
