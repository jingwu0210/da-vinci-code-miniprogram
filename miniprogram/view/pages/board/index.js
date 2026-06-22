/**
 * 游戏主界面 ★ —— 核心对局 UI。
 * 依赖: service/game/game-manager, common/routes, common/modal-helper, model/store/app-store
 */

const GameManager = require('../../../service/game/game-manager');
const { ROUTES, buildRoute } = require('../../../common/routes');
const { showConfirm, showToast, showLoading, hideLoading } = require('../../../common/modal-helper');
const store = require('../../../common/store');
const { Phase } = require('../../../common/enums');

Page({
  data: {
    // 客户端状态
    phase:       Phase.WAITING,
    myHand:      [],
    opponents:   [],
    game:        {},
    loading:     true,
    offline:     false,

    // 猜测面板
    guessTarget: null,
    guessValue:  0,
  },

  _gameId: null,
  _roomId: null,
  _watcher: null,

  async onLoad(options) {
    this._gameId = options.gameId;
    this._roomId = options.roomId;

    try {
      const state = await GameManager.getGameState(this._gameId);
      this._applyState(state);

      // 订阅实时更新
      this._watcher = GameManager.subscribe(
        this._gameId,
        (doc) => this._onWatchUpdate(doc),
        (err) => this._onWatchError(err)
      );
    } catch (e) {
      showToast('加载对局失败');
    }
    this.setData({ loading: false });
  },

  onUnload() {
    if (this._watcher) this._watcher.close();
  },

  // ── 玩家操作 ──

  async onTapDraw() {
    try {
      const result = await GameManager.drawTile(this._gameId);
      this.setData({ phase: Phase.INSERTING, game: result });
    } catch (e) {
      showToast(e.message);
    }
  },

  async onTapInsertSlot(e) {
    const pos = e.detail.position;
    try {
      const result = await GameManager.insertTile(this._gameId, pos);
      this.setData({ myHand: result.hand, phase: Phase.GUESSING });
    } catch (e) {
      showToast(e.message);
    }
  },

  async onConfirmGuess() {
    const { guessTarget, guessValue } = this.data;
    try {
      const result = await GameManager.makeGuess(
        this._gameId, guessTarget.openid, guessTarget.position, guessValue
      );
      if (result.gameOver) {
        this._goResult(result.winner);
      } else {
        this.setData({ phase: result.nextPhase, game: result, guessTarget: null });
      }
    } catch (e) {
      showToast(e.message);
    }
  },

  async onTapPass() {
    try {
      await GameManager.passTurn(this._gameId);
      this.setData({ phase: Phase.WAITING });
    } catch (e) {
      showToast(e.message);
    }
  },

  // ── 导航 ──

  async onTapLobby() {
    const ok = await showConfirm('返回大厅', '确定返回大厅？当前对局将保留 5 分钟。');
    if (ok) {
      wx.navigateTo({ url: ROUTES.LOBBY });
    }
  },

  async onTapQuit() {
    const ok = await showConfirm('退出', '确定退出？退出后本局将判负。');
    if (ok) {
      await GameManager.quitGame(this._gameId);
      wx.redirectTo({ url: ROUTES.LOBBY });
    }
  },

  // ── AI ──

  async _requestAiMove() {
    const difficulty = store.get('currentRoom')?.difficulty || 'easy';
    try {
      const result = await GameManager.requestAiMove(this._gameId, difficulty);
      // 播放 AI 动作序列动画...
      this.setData({ phase: Phase.WAITING }); // AI 结束后回到自己回合
    } catch (e) {
      showToast(e.message);
    }
  },

  // ── 内部 ──

  _applyState(state) {
    this.setData({
      phase:      state.game.phase,
      myHand:     state.self.hand,
      opponents:  state.opponents,
      game:       state.game,
    });
  },

  _onWatchUpdate(doc) {
    // 由 GameManager 处理并回调，此处简化
  },

  _onWatchError(err) {
    this.setData({ offline: true });
  },

  _goResult(winner) {
    wx.redirectTo({ url: buildRoute(ROUTES.RESULT, { gameId: this._gameId }) });
  },
});
