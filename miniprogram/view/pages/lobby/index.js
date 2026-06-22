/**
 * 大厅页 —— 模式选择、房间加入、用户信息。
 * 依赖: service/room/room-manager, common/routes, model/store/app-store, common/modal-helper
 */

const RoomManager = require('../../../service/room/room-manager');
const { ROUTES, buildRoute } = require('../../../common/routes');
const store = require('../../../common/store');
const { showToast, showConfirm } = require('../../../common/modal-helper');

Page({
  data: {
    user: null,
    showJoinModal: false,
    roomCode: '',
  },

  onLoad() {
    this.setData({ user: store.get('user') });
  },

  onShow() {
    // 从登录页 redirect 回来时可能存在 options 不可靠，通过 store 取
    this.setData({ user: store.get('user') });
  },

  // ── 模式选择 ──

  onTapAiMode() {
    wx.navigateTo({ url: buildRoute(ROUTES.ROOM_CREATE, { mode: 'ai' }) });
  },

  onTapFriendsMode() {
    wx.navigateTo({ url: buildRoute(ROUTES.ROOM_CREATE, { mode: 'friends' }) });
  },

  // ── 加入房间 ──

  onTapJoinRoom() {
    this.setData({ showJoinModal: true });
  },

  onRoomCodeInput(e) {
    this.setData({ roomCode: e.detail.value.toUpperCase() });
  },

  async onConfirmJoin() {
    const code = this.data.roomCode.trim();
    if (!code || code.length !== 6) {
      showToast('请输入 6 位房间码');
      return;
    }
    try {
      const room = await RoomManager.joinRoom(code);
      this.setData({ showJoinModal: false });
      wx.navigateTo({ url: buildRoute(ROUTES.ROOM_DETAIL, { roomId: room.roomId }) });
    } catch (e) {
      showToast(e.message || '加入失败');
    }
  },

  onCancelJoin() {
    this.setData({ showJoinModal: false, roomCode: '' });
  },

  // ── 底部入口 ──

  onTapTutorial() {
    wx.navigateTo({ url: ROUTES.TUTORIAL });
  },

  onTapHistory() {
    wx.navigateTo({ url: ROUTES.HISTORY });
  },

  onTapSettings() {
    wx.navigateTo({ url: ROUTES.SETTINGS });
  },
});
