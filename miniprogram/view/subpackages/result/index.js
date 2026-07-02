/**
 * 结算页。
 */
const HistoryService = require('../../../service/history/history-service');
const GameCall = require('../../../cloud/cloud-functions/game-call');
const store = require('../../../common/store');
const login = require('../../../utils/login');
const { ROUTES } = require('../../../common/routes');
const { resultShareConfig } = require('../../../cloud/share/share-helper');
var audio = require('../../../utils/audio');
var logger = require('../../../utils/logger');

Page({
  data: {
    record: null,
    isWinner: false,
    loading: true,
    userType: 'tourist',
    pageHeight: '100vh',
  },

  async onLoad(options) {
    var userType = login.getUserType();
    // 真机 100vh 不准确，用系统窗口高度
    var sys = wx.getSystemInfoSync();
    this.setData({ userType: userType, pageHeight: sys.windowHeight + 'px' });

    // 微信用户: 云端存档
    if (userType === 'wechat') {
      try {
        var resp = await HistoryService.saveRecord(options.gameId);
        var record = resp.data.record;
        var isWinner = resp.data.isWinner;
        audio.play(isWinner ? 'victory' : 'defeat');
        var user = store.get('user') || {};
        var s = user.stats || { totalGames: 0, wins: 0, losses: 0 };
        s.totalGames = (s.totalGames || 0) + 1;
        if (isWinner) s.wins = (s.wins || 0) + 1; else s.losses = (s.losses || 0) + 1;
        store.set('user', Object.assign({}, user, { stats: s }));
        record.durStr = _fmtDur(record.duration);
        record.diffStr = _fmtDiff(record.difficulty);
        this.setData({ record: record, isWinner: isWinner, loading: false });
      } catch (e) { this.setData({ loading: false }); }
      return;
    }

    // 游客: 用 getGameState 的 settlement 数据本地构造 record
    try {
      var gsResp = await GameCall.getGameState(options.gameId);
      if (gsResp.success) {
        var s = gsResp.data.settlement;
        var rec = s ? _buildLocalRecord(s, options.winner) : _buildMinimalRecord(gsResp.data, options.winner);
        login.saveLocalRecord(rec);
        logger.debug('[result] saved local record, total=' + login.getLocalRecords().length);
        rec.durStr = _fmtDur(rec.duration);
        rec.diffStr = _fmtDiff(rec.difficulty);
        // 游客: 比较 winner 与自己 touristId
        var myId = login.getTouristId();
        var won = options.winner === myId;
        audio.play(won ? 'victory' : 'defeat');
        this.setData({ record: rec, isWinner: won, loading: false });
      } else { this.setData({ loading: false }); }
    } catch (e) { this.setData({ loading: false }); }
  },

  onTapLobby() {
    wx.reLaunch({ url: ROUTES.LOBBY });
  },

  onShareAppMessage() {
    var cfg = resultShareConfig(this.data.isWinner);
    return { title: cfg.title, path: cfg.path };
  },
});

function _fmtDur(dur) {
  dur = dur || 0;
  return dur >= 60 ? Math.floor(dur / 60) + '分' + (dur % 60) + '秒' : dur + '秒';
}
function _fmtDiff(d) {
  return d === 'easy' ? '简单' : d === 'medium' ? '中等' : d === 'hard' ? '困难' : '';
}
function _mockRecord(isWin) {
  return {
    mode: 'ai', difficulty: 'hard', totalTurns: 12, duration: 245,
    durStr: '4分5秒', diffStr: '困难',
    players: [
      { openid: 'me', nickName: '玩家', isWinner: isWin, tilesRemaining: isWin ? 0 : 3 },
      { openid: 'ai_X', nickName: 'AI', isWinner: !isWin, tilesRemaining: isWin ? 3 : 0 },
    ],
  };
}
// settlement 未部署时的兜底（从 self + opponents 提取基本信息）
function _buildMinimalRecord(data, winner) {
  var myName = (store.get('user') && store.get('user').nickName) || '玩家';
  var players = [];
  var won = winner && winner !== 'null' && winner !== '';
  players.push({ openid: 'me', nickName: myName, isWinner: won, tilesRemaining: data.self ? data.self.revealedCount : 0 });
  (data.opponents || []).forEach(function(o) {
    players.push({ openid: o.openid, nickName: o.openid.startsWith('ai_') ? 'AI' : '对手', isWinner: false, tilesRemaining: o.revealedCount });
  });
  players.forEach(function(p) { p.isWinner = won ? (p.nickName === myName) : (p.nickName !== myName && p.nickName !== 'AI'); });
  players.sort(function(a, b) { return a.isWinner ? -1 : 1; });
  var turns = data.game ? data.game.turnNumber : 0;
  if (!turns && data.turnLog) { turns = data.turnLog.length; }
  return { mode: 'ai', difficulty: null, totalTurns: turns, duration: 0, players: players };
}

function _buildLocalRecord(s, winner) {
  var myName = (store.get('user') && store.get('user').nickName) || '玩家';
  var players = [];
  (s.turnOrder || []).forEach(function(oid) {
    var hand = (s.tiles || []).filter(function(t){ return t.owner === oid; });
    var unrevealed = hand.filter(function(t){ return !t.isRevealed; }).length;
    players.push({ openid: oid, nickName: oid.startsWith('ai_') ? 'AI' : myName, isWinner: oid === winner, tilesRemaining: unrevealed });
  });
  // 胜者排第一，其余按剩余暗牌数升序
  players.sort(function(a, b) {
    if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
    return a.tilesRemaining - b.tilesRemaining;
  });
  var turns = (s.turnLog || []).filter(function(l){ return l.action==='pass'||l.action==='quit'||(l.action==='guess'&&!l.isCorrect); }).length;
  var dur = s.createdAt ? Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 1000) : 0;
  return { _id: 'local_' + Date.now(), mode: s.mode||'ai', difficulty: s.difficulty, createdAt: s.createdAt, totalTurns: turns, duration: dur, players: players };
}
