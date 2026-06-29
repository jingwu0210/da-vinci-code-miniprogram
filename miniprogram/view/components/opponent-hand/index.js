/**
 * opponent-hand —— 对手手牌（暗牌）。
 * Props:  tiles, playerName, isCurrentTarget
 * Events: tileSelected → { position }
 */
Component({
  properties: {
    tiles:           { type: Array, value: [] },
    playerName:      { type: String, value: '' },
    playerOpenid:    { type: String, value: '' },
    isCurrentTarget: { type: Boolean, value: false },
    interactive:     { type: Boolean, value: true },
    drawnTileId:     { type: String, value: '' },
  },

  data: {
    selectedPosition: -1,
  },

  observers: {
    'interactive': function(val) {
      if (!val) this.setData({ selectedPosition: -1 });
    },
  },

  methods: {
    onTileTap(e) {
      if (!this.properties.interactive) return;
      const pos = Number(e.currentTarget.dataset.position);
      const tile = (this.properties.tiles || []).find(t => t.position === pos);
      if (tile && tile.isRevealed) return;
      this.setData({ selectedPosition: pos });
      this.triggerEvent('tileSelected', { position: pos, openid: this.properties.playerOpenid });
    },

    clearSelection() {
      this.setData({ selectedPosition: -1 });
    },
  },
});
