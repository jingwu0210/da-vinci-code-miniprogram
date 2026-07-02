/**
 * 房间等待室。
 */
const RoomManager = require('../../../../service/room/room-manager');
const { ROUTES, buildRoute } = require('../../../../common/routes');
const { showToast, showConfirm } = require('../../../../common/modal-helper');
const store = require('../../../../common/store');

Page({
  data: {
    room: null, isReady: false, isCreator: false, canStart: false,
    // 密码弹窗
    showPasswordModal: false, joinPassword: '', joinError: '',
  },
  _roomId: null, _pollTimer: null,

  async onLoad(options) {
    this._roomId = (options.roomId || '').toUpperCase();
    var myOpenid = (store.get('user') && store.get('user').openid) || getApp().globalData.touristId;
    var isJoining = options.join === '1';

    try {
      let room;
      if (isJoining) {
        // Share link entry — first fetch room info to check for password
        room = await RoomManager.getRoom(this._roomId);

        // Check if user is already in the room (e.g. rejoining)
        var alreadyInRoom = room.players.some(function(p) { return p.openid === myOpenid; });

        if (!alreadyInRoom && room.password) {
          // Room has password and user is not in room — show password modal
          this.setData({ room: room, showPasswordModal: true });
          this._startPolling();
          return;
        }

        // No password or already in room — join directly
        if (!alreadyInRoom) {
          room = await RoomManager.joinRoom(this._roomId);
        }
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

      this._startPolling();
    } catch (e) { showToast(e.message || '加载房间失败'); }
  },

  // 简单轮询 — 每 2 秒拉取房间最新状态
  _startPolling() {
    if (this._pollTimer) return;
    var self = this;
    this._pollTimer = setInterval(async function() {
      try {
        var room = await RoomManager.getRoom(self._roomId);
        var oid = (store.get('user') && store.get('user').openid) || getApp().globalData.touristId;
        var me = room.players.find(function(p) { return p.openid === oid; });
        self.setData({ room: room, canStart: self._checkCanStart(room), isReady: me ? me.isReady : false });
        if (room.status === 'playing') {
          self._stopPolling();
          wx.redirectTo({ url: buildRoute(ROUTES.BOARD, { roomId: room.roomId, gameId: room.gameId }) });
        }
      } catch (e) { /* network hiccup, retry next poll */ }
    }, 1500);
  },

  _stopPolling() {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
  },

  // ── 密码弹窗 ──
  onJoinPasswordInput(e) {
    this.setData({ joinPassword: e.detail.value, joinError: '' });
  },

  async onConfirmJoinWithPassword() {
    var password = this.data.joinPassword.trim();
    if (!password) {
      this.setData({ joinError: '请输入房间密码' });
      return;
    }
    try {
      var room = await RoomManager.joinRoom(this._roomId, password);
      this.setData({
        showPasswordModal: false, joinPassword: '', joinError: '',
        room: room,
        isCreator: room.creatorOpenid === ((store.get('user') && store.get('user').openid) || getApp().globalData.touristId),
        isReady: false,
        canStart: this._checkCanStart(room),
      });
      store.set('currentRoom', room);
      this._startPolling();
    } catch (e) {
      this.setData({ joinError: e.message || '密码错误' });
    }
  },

  onCancelJoinPassword() {
    this.setData({ showPasswordModal: false, joinPassword: '', joinError: '' });
    wx.navigateBack();
  },

  onUnload() { this._stopPolling(); },

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
      var result = await RoomManager.startGame(this._roomId);
      this._stopPolling();
      wx.redirectTo({ url: buildRoute(ROUTES.BOARD, { roomId: this._roomId, gameId: result.gameId }) });
    } catch (e) { showToast(e.message || '开始游戏失败'); }
  },

  async onLeave() {
    const ok = await showConfirm('离开房间', '确定离开当前房间？');
    if (!ok) return;
    try {
      await RoomManager.leaveRoom(this._roomId);
      wx.navigateBack();
    } catch (e) { showToast(e.message); }
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
