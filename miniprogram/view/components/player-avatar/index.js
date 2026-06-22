/**
 * player-avatar —— 玩家头像。
 * Props:  src, nickName, size, isReady, isCurrentTurn, isWinner
 */
Component({
  properties: {
    src:            { type: String, value: '' },
    nickName:       { type: String, value: '' },
    size:           { type: String, value: 'medium' },
    isReady:        { type: Boolean, value: false },
    isCurrentTurn:  { type: Boolean, value: false },
    isWinner:       { type: Boolean, value: false },
  },
});
