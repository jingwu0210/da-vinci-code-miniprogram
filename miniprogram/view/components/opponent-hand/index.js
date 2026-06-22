/**
 * opponent-hand —— 对手手牌（暗牌）。
 * Props:  tiles, playerName, isCurrentTarget
 * Events: tileSelected → { position }
 */
Component({
  properties: {
    tiles:           { type: Array, value: [] },
    playerName:      { type: String, value: '' },
    isCurrentTarget: { type: Boolean, value: false },
  },
  methods: {
    onTileTap(e) {
      this.triggerEvent('tileSelected', { position: e.currentTarget.dataset.position });
    },
  },
});
