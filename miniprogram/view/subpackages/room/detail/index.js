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
    var myOpenid = (store.get('user') && store.get('user').openid) || getApp().globalData.touristId;
    var isJoining = options.join === '1';

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
        var myOpenid = (store.get('user') && store.get('user').openid) || getApp().globalData.touristId;
        var me = doc.players.find(function(p) { return p.openid === myOpenid; });
        this.setData({ room: doc, canStart: this._checkCanStart(doc), isReady: me ? me.isReady : false });
        if (doc.status === 'playing') {
          wx.redirectTo({ url: buildRoute(ROUTES.BOARD, { roomId: doc.roomId }) });
        }
      });
    } catch (e) { showToast(e.message || '加载房间失败'); }
  },

  onUnload() { if (this._watcher) this._watcher.close(); },

  _toggling: false,

  async onToggleReady() {
    if (this._toggling) return;
    this._toggling = true;
    var newVal = !this.data.isReady;
    // 乐观更新按钮文字 + 房间玩家列表
    var room = this.data.room;
    if (room && room.players) {
      var myOpenid = (store.get('user') && store.get('user').openid) || getApp().globalData.touristId;
      var me = room.players.find(function(p) { return p.openid === myOpenid; });
      if (me) me.isReady = newVal;
    }
    this.setData({ isReady: newVal, room: room });
    try {
      await RoomManager.toggleReady(this._roomId, newVal);
    } catch (e) { this.setData({ isReady: !newVal }); showToast(e.message); }
    this._toggling = false;
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

  async onDisband() {
    var ok = await showConfirm('解散房间', '确定解散当前房间？所有玩家将被移出。');
    if (!ok) return;
    try {
      await RoomManager.disbandRoom(this._roomId);
      showToast('房间已解散');
      wx.navigateBack();
    } catch (e) { showToast(e.message); }
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
