/**
 * player-hand —— 手牌组件。
 * Props:  tiles, isOwn, interactive, insertMode, drawnTile
 * Events: positionSelected → { position }
 */
Component({
  properties: {
    tiles:       { type: Array, value: [] },
    isOwn:       { type: Boolean, value: false },
    interactive: { type: Boolean, value: false },
    insertMode:  { type: Boolean, value: false },
    drawnTile:   { type: Object, value: null },
  },
  methods: {
    onSlotTap(e) {
      if (!this.properties.insertMode) return;
      this.triggerEvent('positionSelected', { position: e.currentTarget.dataset.position });
    },
  },
});
