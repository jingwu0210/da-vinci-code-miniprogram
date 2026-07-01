/**
 * 大厅页 — 模式选择、房间加入、用户信息。
 */
const RoomManager = require('../../../service/room/room-manager');
const { ROUTES, buildRoute } = require('../../../common/routes');
const store = require('../../../common/store');
const { showToast } = require('../../../common/modal-helper');

Page({
  data: { user: {}, winRate: 0, showJoinModal: false, roomCode: '' },

  onShow() {
    var user = store.get('user') || {};
    var stats = user.stats || {};
    var total = stats.totalGames || 0;
    var wins = stats.wins || 0;
    this.setData({ user, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 });
  },

  onTapAiMode()     { wx.navigateTo({ url: buildRoute(ROUTES.ROOM_CREATE, { mode: 'ai' }) }); },
  onTapFriendsMode(){ wx.navigateTo({ url: buildRoute(ROUTES.ROOM_CREATE, { mode: 'friends' }) }); },
  onTapCreate()     { wx.navigateTo({ url: ROUTES.ROOM_CREATE }); },
  onTapJoin()       { this.setData({ showJoinModal: true, roomCode: '' }); },
  onTapSettings()   { wx.navigateTo({ url: ROUTES.SETTINGS }); },
  onTapTutorial()   { wx.navigateTo({ url: ROUTES.TUTORIAL }); },
  onTapHistory()    { wx.navigateTo({ url: ROUTES.HISTORY }); },
  onRoomCodeInput(e) { this.setData({ roomCode: e.detail.value.toUpperCase() }); },
  onCancelJoin()     { this.setData({ showJoinModal: false }); },

  async onConfirmJoin() {
    const code = this.data.roomCode.trim();
    if (!code || code.length !== 6) { showToast('请输入 6 位房间码'); return; }
    try {
      await RoomManager.joinRoom(code);
      this.setData({ showJoinModal: false });
      wx.navigateTo({ url: buildRoute(ROUTES.ROOM_DETAIL, { roomId: code }) });
    } catch (e) { showToast(e.message || '加入失败'); }
  },

  onTapExit() {
    var login = require('../../../utils/login');
    var u = store.get('user');
    if (store.get('userType') === 'wechat' || (u && !u.isGuest)) login.logout();
    wx.reLaunch({ url: ROUTES.LOGIN });
  },
});
