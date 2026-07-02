/**
 * 大厅页 — 模式选择、房间加入、用户信息。
 */
var RoomCall = require('../../../cloud/cloud-functions/room-call');
var { ROUTES, buildRoute } = require('../../../common/routes');
var store = require('../../../common/store');
var { showToast } = require('../../../common/modal-helper');

Page({
  data: {
    user: {}, winRate: 0,
    statusBarHeight: 44,
    navBarRight: 16,
    heroTopPadding: 40,
    // 好友房间弹窗
    showRoomModal: false,
    showJoinInput: false,
    roomCode: '',
    roomPassword: '',
  },

  onLoad() {
    var sys = wx.getSystemInfoSync();
    var menuBtn = wx.getMenuButtonBoundingClientRect();
    // 导航栏右边距 = 屏幕宽度 - 胶囊按钮左边缘
    var navBarRight = sys.windowWidth - menuBtn.left + 8;
    // 顶部留白：剩余高度 / 3，让内容不要堆在顶部
    var navH = menuBtn.height + (menuBtn.top - (sys.statusBarHeight || 44)) * 2;
    var availH = sys.windowHeight - (sys.statusBarHeight || 44) - navH - 40;
    var heroPad = Math.max(24, Math.floor(availH / 4));
    if (heroPad > 80) heroPad = 80;
    this.setData({
      statusBarHeight: sys.statusBarHeight || 44,
      navBarRight: navBarRight,
      heroTopPadding: heroPad,
    });
  },

  onShow() {
    var user = store.get('user') || {};
    var userType = store.get('userType') || 'tourist';

    if (user && !user.isGuest && user.openid && !user.openid.startsWith('t_')) {
      var UserCall = require('../../../cloud/cloud-functions/user-call');
      UserCall.login().then(function(resp) {
        if (resp.success && resp.data.profile) {
          store.set('user', Object.assign({}, user, resp.data.profile, { isGuest: false }));
        }
      }).catch(function() {});
    }

    var stats = user.stats || {};
    // 游客：从本地历史缓存计算战绩（与历史页 _calcStats 对齐逻辑）
    if (userType === 'tourist') {
      var login = require('../../../utils/login');
      var records = login.getLocalRecords();
      var tw = 0;
      records.forEach(function(r) {
        // 找非 AI 的本人玩家（与 history/_calcStats 一致）
        var me = (r.players || []).find(function(p) { return p.nickName !== 'AI'; });
        if (me && me.isWinner) tw++;
      });
      stats = { totalGames: records.length, wins: tw, losses: records.length - tw };
      user = Object.assign({}, user, { stats: stats });
      store.set('user', user);
    }

    var total = stats.totalGames || 0;
    var wins = stats.wins || 0;
    this.setData({ user: user, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 });
  },

  // ── 人机对战 → 单机配置页 ──
  onTapAi() {
    wx.navigateTo({ url: ROUTES.SINGLE_CONFIG });
  },

  // ── 好友房间弹窗 ──
  onTapFriends() {
    this.setData({ showRoomModal: true, showJoinInput: false, roomCode: '', roomPassword: '' });
  },

  onCancelRoomModal() {
    this.setData({ showRoomModal: false, showJoinInput: false });
  },

  onTapCreateRoom() {
    this.setData({ showRoomModal: false });
    wx.navigateTo({ url: buildRoute(ROUTES.ROOM_CREATE, { mode: 'friends' }) });
  },

  onTapShowJoin() {
    this.setData({ showJoinInput: true, roomCode: '', roomPassword: '' });
  },

  onCancelJoinInput() {
    this.setData({ showJoinInput: false });
  },

  onRoomCodeInput(e) {
    this.setData({ roomCode: e.detail.value });
  },

  onRoomPasswordInput(e) {
    this.setData({ roomPassword: e.detail.value });
  },

  async onConfirmJoin() {
    var code = this.data.roomCode.trim();
    if (!code) { showToast('请输入房间码'); return; }
    if (code.length !== 6) { showToast('房间码为6位'); return; }

    var password = this.data.roomPassword.trim();
    // 密码前端校验：最多4位数字
    if (password && (password.length > 4 || !/^\d+$/.test(password))) {
      showToast('密码为最多4位数字'); return;
    }

    showToast('加入房间中…');
    try {
      var resp = await RoomCall.joinRoom(code, password || null);
      if (resp.success) {
        this.setData({ showRoomModal: false, showJoinInput: false });
        wx.navigateTo({ url: buildRoute(ROUTES.ROOM_DETAIL, { roomId: code }) });
      } else {
        showToast(resp.error || '加入失败');
      }
    } catch (e) {
      showToast(e.message || '加入失败');
    }
  },

  // ── 通用 ──
  onTapSettings()   { wx.navigateTo({ url: ROUTES.SETTINGS }); },
  onTapTutorial()   { wx.navigateTo({ url: ROUTES.TUTORIAL }); },
  onTapHistory()    { wx.navigateTo({ url: ROUTES.HISTORY }); },

  onTapExit() {
    var login = require('../../../utils/login');
    var u = store.get('user');
    if (store.get('userType') === 'wechat' || (u && !u.isGuest)) login.logout();
    wx.reLaunch({ url: ROUTES.LOGIN });
  },
});
