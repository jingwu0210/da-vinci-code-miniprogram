/**
 * 房间等待室。
 */
const RoomManager = require('../../../../service/room/room-manager');
const { ROUTES, buildRoute } = require('../../../../common/routes');
const { showToast, showConfirm } = require('../../../../common/modal-helper');
const store = require('../../../../common/store');

Page({
  data: { room: null, isReady: false, isCreator: false, canStart: false },
  _roomId: null, _watcher: null,

  async onLoad(options) {
    this._roomId = options.roomId;
    const myOpenid = store.get('user')?.openid;
    const isJoining = options.join === '1'; // share link: join first

    try {
      let room;
      if (isJoining) {
        // Share link entry — join the room
        room = await RoomManager.joinRoom(this._roomId);
      } else {
        // Creator or already joined — fetch room info
        room = await RoomManager.getRoom(this._roomId);
      }

      this.setData({
        room, isCreator: room.creatorOpenid === myOpenid,
        isReady: room.players.find(p => p.openid === myOpenid)?.isReady || false,
        canStart: this._checkCanStart(room),
      });
      store.set('currentRoom', room);

      this._watcher = RoomManager.subscribe(this._roomId, (doc) => {
        this.setData({ room: doc, canStart: this._checkCanStart(doc) });
        if (doc.status === 'playing') {
          wx.redirectTo({ url: buildRoute(ROUTES.BOARD, { roomId: doc.roomId }) });
        }
      });
    } catch (e) { showToast(e.message || '加载房间失败'); }
  },

  onUnload() { if (this._watcher) this._watcher.close(); },

  async onToggleReady() {
    try {
      await RoomManager.toggleReady(this._roomId, !this.data.isReady);
    } catch (e) { showToast(e.message); }
  },

  async onStartGame() {
    try {
      await RoomManager.startGame(this._roomId);
    } catch (e) { showToast(e.message); }
  },

  async onLeave() {
    const ok = await showConfirm('离开房间', '确定离开当前房间？');
    if (ok) { await RoomManager.leaveRoom(this._roomId); wx.navigateBack(); }
  },

  onCopy() {
    wx.setClipboardData({ data: this.data.room.roomId, success: () => showToast('已复制') });
  },


  onShareAppMessage() {
    return RoomManager.getShareConfig(this._roomId);
  },

  _checkCanStart(room) {
    const humans = room.players.filter(p => !p.isAI);
    const allReady = humans.every(p => p.isReady);
    return allReady && humans.length >= 2;
  },
});
