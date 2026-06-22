/**
 * game-info-bar —— 顶部回合信息栏。
 * Props:  phase, currentPlayer, isMyTurn, turnNumber, poolRemaining
 */
Component({
  properties: {
    phase:          { type: String, value: 'waiting' },
    currentPlayer:  { type: Object, value: {} },
    isMyTurn:       { type: Boolean, value: false },
    turnNumber:     { type: Number, value: 1 },
    poolRemaining:  { type: Number, value: 0 },
  },
});
