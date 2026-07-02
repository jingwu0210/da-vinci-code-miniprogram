/**
 * 游戏主界面 - 核心对局 UI
 */
const GameManager = require('../../../service/game/game-manager');
const { ROUTES, buildRoute } = require('../../../common/routes');
const { showConfirm, showToast } = require('../../../common/modal-helper');
var audio = require('../../../utils/audio');
var logger = require('../../../utils/logger');
const store = require('../../../common/store');
const { Phase, Difficulty } = require('../../../common/enums');
const { findValidInsertPositions } = require('../../../utils/sort-hand');
const { AI_ACTION_INTERVAL } = require('../../../common/constants');

Page({
  data: {
    statusBarHeight: 44,
    navBarRight: 16,
    phase: Phase.WAITING,
    myHand: [],
    opponents: [],
    game: {},
    loading: true,
    offline: false,
    guessTarget: null,
    canEndTurn: false,
    aiGuessPosition: -1,
    notifyMsg: '',
  },

  _notifyTimer: null,

  _notify(msg, duration) {
    if (this._notifyTimer) clearTimeout(this._notifyTimer);
    this.setData({ notifyMsg: msg });
    var self = this;
    this._notifyTimer = setTimeout(function() { self.setData({ notifyMsg: '' }); }, duration || 2000);
  },

  _gameId: null,
  _roomId: null,
  _watcher: null,
  _isAi: false,
  _aiPending: false,
  _guessedCorrectly: false,
  _alive: false,
  _lastLogLen: 0,
  _guessBlockUntil: 0,
  _gameOver: false,

  async onLoad(options) {
    this._alive = true;
    this._gameId = options.gameId;
    this._roomId = options.roomId;
    var sys = wx.getSystemInfoSync();
    var menuBtn = wx.getMenuButtonBoundingClientRect();
    this.setData({
      statusBarHeight: sys.statusBarHeight || 44,
      navBarRight: sys.windowWidth - menuBtn.left + 8,
    });

    const room = store.get('currentRoom') || {};
    this._isAi = room.mode === 'ai' || options.mode === 'ai';

    // 兜底：如果没传 gameId，通过 roomId 从房间文档中获取
    if (!this._gameId && this._roomId) {
      try {
        var RoomCall = require('../../../cloud/cloud-functions/room-call');
        var roomResp = await RoomCall.getRoom(this._roomId);
        if (roomResp.success && roomResp.data && roomResp.data.room && roomResp.data.room.gameId) {
          this._gameId = roomResp.data.room.gameId;
        }
      } catch (e) { /* fall through to error below */ }
    }

    try {
      const state = await GameManager.getGameState(this._gameId);
      // 兜底：对手 openid 含 'ai' 即为 AI 模式
      if (!this._isAi && state.opponents && state.opponents.length > 0) {
        for (var i = 0; i < state.opponents.length; i++) {
          if (state.opponents[i].openid && state.opponents[i].openid.indexOf('ai') === 0) {
            this._isAi = true;
            break;
          }
        }
      }
      logger.debug('[board] _isAi=', this._isAi, 'myTurn=', state.game.myTurn, 'phase=', state.game.phase, 'poolRemaining=', JSON.stringify(state.game.poolRemaining));
      this._applyState(state);
      // 如果 AI 先手 → 触发 AI
      if (!state.game.myTurn && this._isAi) this._triggerAi();
      this._watcher = GameManager.subscribe(
        this._gameId,
        function (doc) { this._onWatchUpdate(doc); }.bind(this),
        function () { this._onWatchError(); }.bind(this)
      );
    } catch (e) {
      showToast('加载对局失败');
    }
    this.setData({ loading: false });
  },

  onUnload() {
    this._alive = false;
    if (this._watcher) { this._watcher.close(); this._watcher = null; }
  },

  onSelectColor(e) {
    var color = e.currentTarget.dataset.color;
    if (!color) return;
    this._guessedCorrectly = false;
    this.setData({ canEndTurn: false, guessTarget: null });
    try { wx.vibrateShort({ type: 'light' }); } catch(e) {}
    audio.play('draw');
    var self = this;
    GameManager.drawTile(this._gameId, color).then(function (result) {
      // 池空跳过摸牌 → 直接刷新进入猜测
      return GameManager.getGameState(self._gameId);
    }).then(function (state) {
      self._applyState(state);
      if (state.game.poolRemaining.total === 0) {
        wx.showToast({ title: '牌池已空，直接猜测', icon: 'none', duration: 1500 });
      }
    }).catch(function (err) {
      showToast(err.message || '摸牌失败');
    });
  },

  onTapInsertSlot(e) {
    var pos = e.detail.position;
    if (pos === undefined || pos === null) return;
    var drawnTile = this.data.game.myDrawnTile;
    if (drawnTile) {
      var valid = findValidInsertPositions(this.data.myHand, drawnTile);
      if (valid.indexOf(pos) === -1) {
        showToast('请按从小到大的顺序插入');
        return;
      }
    }
    try { wx.vibrateShort({ type: 'light' }); } catch(e) {}
    var self = this;
    GameManager.insertTile(this._gameId, pos).then(function () {
      return GameManager.getGameState(self._gameId);
    }).then(function (state) {
      self._applyState(state);
      // Joker 放置后若切到 AI 回合 → 触发 AI
      if (self._alive && !state.game.myTurn && self._isAi) self._triggerAi();
    }).catch(function (err) {
      showToast(err.message || '插牌失败');
    });
  },

  onOpponentTileSelected(e) {
    var pos = e.detail.position;
    var openid = e.detail.openid;
    if (pos === undefined || !openid) return;
    var opponent = this.data.opponents.find(function (o) { return o.openid === openid; });
    if (!opponent) return;
    var tile = opponent.hand.find(function (t) { return t.position === pos; });
    if (!tile || tile.isRevealed) return;
    this.setData({ guessTarget: { openid: openid, position: pos, color: tile.color } });
  },

  onConfirmGuess(e) {
    var detail = e.detail || {};
    var targetOpenid = detail.targetOpenid;
    var position = detail.position;
    var value = detail.value;
    if (!targetOpenid || position === undefined || value === undefined) return;
    try { wx.vibrateShort({ type: 'light' }); } catch(e) {}
    var self = this;
    GameManager.makeGuess(this._gameId, targetOpenid, position, value).then(function (result) {
      if (result.isCorrect) audio.play('guess_correct');
      if (result.gameOver) {
        wx.showToast({ title: '你赢了！', icon: 'success', duration: 2000 });
        setTimeout(function () { self._goResult(result.winner); }, 2000);
        return;
      }
      return GameManager.getGameState(self._gameId).then(function (state) {
        self._applyState(state);
        if (result.isCorrect) {
          self._guessedCorrectly = true;
          wx.showToast({ title: '猜对了！', icon: 'success', duration: 1000 });
          self.setData({ guessTarget: null, canEndTurn: true });
        } else {
          self._guessedCorrectly = false;
          wx.showToast({ title: '猜错了！', icon: 'none', duration: 2000 });
          self.setData({ guessTarget: null });
          // 猜错 → 触发 AI
          if (self._alive && !state.game.myTurn && self._isAi) setTimeout(function () { self._triggerAi(); }, 800);
        }
      });
    }).catch(function (err) {
      showToast(err.message || '猜测失败');
    });
  },

  onCancelGuess() {
    this.setData({ guessTarget: null });
  },

  onContinueGuessing() {
    this.setData({ canEndTurn: false, guessTarget: null });
  },

  onTapPass() {
    var reveal = !this._guessedCorrectly;
    var self = this;
    GameManager.passTurn(this._gameId, reveal).then(function () {
      return GameManager.getGameState(self._gameId);
    }).then(function (state) {
      self._guessedCorrectly = false;
      self._applyState(state);
      self.setData({ guessTarget: null });
      wx.showToast({ title: '回合结束', icon: 'none', duration: 1000 });
      // 玩家回合结束 → 触发 AI
      if (self._alive && !state.game.myTurn && self._isAi) self._triggerAi();
    }).catch(function (err) {
      showToast(err.message || '回合结束失败');
    });
  },

  onTapQuit() {
    var self = this;
    showConfirm('退出对局', '退出本局游戏，将不计入历史对局。确定？').then(function (ok) {
      if (!ok) return;
      self._alive = false;  // 阻止 watcher 在退出过程中再触发 AI
      self._aiPending = false;
      GameManager.quitGame(self._gameId).then(function () {}).catch(function () {});
      wx.redirectTo({ url: ROUTES.LOBBY });
    });
  },

  _triggerAi() {
    if (!this._alive || this._aiPending) return;
    this._aiPending = true;
    wx.showToast({ title: 'AI思考中...', icon: 'none', duration: 2000 });
    this._requestAiMove();
  },

  _requestAiMove() {
    var self = this;
    var difficulty = (store.get('currentRoom') && store.get('currentRoom').difficulty) || 'easy';
    this._aiStep(difficulty);
  },

  _aiStep(difficulty) {
    var self = this;
    GameManager.requestAiMove(this._gameId, difficulty).then(function (result) {
      var actions = (result && result.actions) || [];
      if (actions.length === 0) {
        // 无动作 → 检查是否回合结束
        return GameManager.getGameState(self._gameId).then(function (state) {
          self._applyState(state);
          if (!state.game.myTurn && self._isAi) {
            // AI 还需要继续
            setTimeout(function () { self._aiStep(difficulty); }, 500);
          } else {
            self._aiPending = false;
          }
        });
      }
      var a = actions[0];
      logger.debug('[AI-TOAST] action=' + a.action + ' ' + JSON.stringify(a));
      if (a.action === 'draw') {
        wx.showToast({ title: 'AI 摸了' + (a.color === 'black' ? ' 黑色' : ' 白色') + '牌', icon: 'none', duration: 1500 });
      } else if (a.action === 'guess') {
        wx.showToast({ title: 'AI 猜你第' + ((a.position||0)+1) + '张牌为 ' + (a.value === -1 ? 'Joker' : a.value), icon: 'none', duration: 1200 });
        // 高亮被猜的牌
        self.setData({ aiGuessPosition: a.position });
        setTimeout(function() { self.setData({ aiGuessPosition: -1 }); }, 2000);
        setTimeout(function() {
          wx.showToast({ title: a.isCorrect ? '猜对了！' : '猜错了', icon: 'none', duration: 1200 });
        }, 1600);
        if (a.gameOver) {
          // AI 获胜 → 传入 AI openid 作为 winner
          var aiWinner = self._getAiOpenid();
          setTimeout(function () { self._goResult(aiWinner); }, 2000);
          return;
        }
      } else if (a.action === 'pass') {
        wx.showToast({ title: 'AI 结束回合', icon: 'none', duration: 1000 });
      }
      logger.debug('[AI-REFRESH] after toast, before getGameState');
      setTimeout(function () {
        GameManager.getGameState(self._gameId).then(function (state) {
          logger.debug('[AI-STATE] phase=' + state.game.phase + ' myTurn=' + state.game.myTurn);
          self._applyState(state);
          if (!state.game.myTurn && self._isAi) {
            logger.debug('[AI-NEXT] still AI turn, next step in 1s');
            setTimeout(function () { self._aiStep(difficulty); }, 1000);
          } else {
            logger.debug('[AI-DONE] turn over');
            self._aiPending = false;
          }
        });
      }, 1500);
    }).catch(function () {
      self._aiPending = false;
    });
  },

  _onWatchUpdate(doc) {
    if (!this._alive || this._aiPending) return;
    var self = this;

    // 快路径：直接从 watch 推送的 doc 检测对手猜测/退出（零额外网络调用）
    var myOpenid = (store.get('user') && store.get('user').openid) || getApp().globalData.touristId;
    var log = doc.turnLog || [];
    if (log.length > self._lastLogLen) {
      for (var i = self._lastLogLen; i < log.length; i++) {
        var entry = log[i];
        if (entry.action === 'draw' && entry.playerOpenid !== myOpenid) {
          var c = entry.color === 'black' ? '黑色' : '白色';
          self._notify('对手摸了' + c + '牌', 1500);
        } else if (entry.action === 'guess' && entry.targetOpenid === myOpenid) {
          var posLabel = '第' + (entry.position + 1) + '张牌';
          var valLabel = entry.guessedValue === -1 ? 'Joker' : String(entry.guessedValue);
          var resultLabel = entry.isCorrect ? '猜对了！' : '猜错了';
          self.setData({ aiGuessPosition: entry.position });
          self._notify('对手猜了你的' + posLabel + '为 ' + valLabel + '，' + resultLabel, 2500);
          self._guessBlockUntil = Date.now() + 2500;
          setTimeout(function() { self.setData({ aiGuessPosition: -1 }); }, 2000);
        } else if (entry.action === 'quit') {
          wx.showModal({ title: '对手已退出', content: '对方退出了对局，你获胜了！', showCancel: false, confirmText: '查看结算' });
        }
      }
      self._lastLogLen = log.length;
    }

    // 慢路径：全量状态刷新（getClientView 消毒数据）
    GameManager.getGameState(self._gameId).then(function (state) {
      if (!self._alive || self._aiPending) return;
      // 对手刚猜了你的牌 → 延迟展示回合切换，让用户有时间看通知
      if (state.game.myTurn && self._guessBlockUntil && Date.now() < self._guessBlockUntil) {
        var remaining = self._guessBlockUntil - Date.now();
        setTimeout(function() {
          if (!self._alive) return;
          self._applyState(state);
          if (state.game.winner) self._goResult(state.game.winner);
        }, remaining);
        return;
      }
      self._guessBlockUntil = 0;
      self._applyState(state);
      if (state.game.winner) self._goResult(state.game.winner);
    }).catch(function () {});
  },

  _onWatchError() {
    this.setData({ offline: true });
  },

  _applyState(state) {
    // DEBUG: 打印完整游戏状态
    var me = state.self.hand.map(function(t){return (t.isJoker?'J':t.value)+t.color[0]+(t.isRevealed?'✓':'');}).join(' ');
    var ai = (state.opponents[0]||{}).hand||[];
    var aiShow = ai.map(function(t){return t.isRevealed?(t.isJoker?'J':t.value)+t.color[0]:'≤'+t.color[0];}).join(' ');
    var dt = state.game.myDrawnTile;
    var dtShow = dt ? (dt.isJoker?'J':dt.value)+dt.color[0] : '-';
    logger.debug('[DEBUG] phase='+state.game.phase+' myTurn='+state.game.myTurn+' pool=b'+state.game.poolRemaining.black+'/w'+state.game.poolRemaining.white+' drawn='+dtShow);
    logger.debug('[DEBUG] 我: ['+me+']');
    logger.debug('[DEBUG] AI: ['+aiShow+']');

    // 池空自动跳到猜测（无摸牌时触发）
    if (state.game.myTurn && state.game.poolRemaining.total === 0 && !state.game.myDrawnTile && (state.game.phase === 'drawing' || state.game.phase === 'waiting')) {
      this._guessedCorrectly = false;
      this.setData({ canEndTurn: false, guessTarget: null });
      GameManager.drawTile(this._gameId, 'black');
    }

    var drawnId = state.game.myDrawnTile ? state.game.myDrawnTile.id : null;
    var myHand = drawnId ? state.self.hand.filter(function (t) { return t.id !== drawnId; }) : state.self.hand;
    // 给对手添加昵称
    var opponents = (state.opponents || []).map(function(o) {
      o.nickName = (o.openid && o.openid.indexOf('ai_') === 0) ? 'AI' : (o.nickName || '对手');
      return o;
    });
    this.setData({
      phase: state.game.phase,
      myHand: myHand,
      opponents: opponents,
      game: state.game,
      offline: false,
    });
    // AI 触发已移至玩家动作（onTapPass / onConfirmGuess wrong）和 onLoad 初始检测
  },

  _getAiOpenid() {
    var opponents = this.data.opponents || [];
    for (var i = 0; i < opponents.length; i++) {
      if (opponents[i].openid && opponents[i].openid.indexOf('ai_') === 0) return opponents[i].openid;
    }
    return '';
  },

  _goResult(winner) {
    if (this._gameOver) return;
    this._gameOver = true;
    wx.redirectTo({ url: buildRoute(ROUTES.RESULT, { gameId: this._gameId, winner: winner || '' }) });
  },
});
