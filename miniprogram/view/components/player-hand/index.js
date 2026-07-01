/**
 * player-hand —— 手牌组件。
 * Props:  tiles, isOwn, interactive, insertMode, drawnTile
 * Events: positionSelected → { position }
 */
const { findValidInsertPositions } = require('../../../utils/sort-hand');

Component({
  properties: {
    tiles:       { type: Array, value: [] },
    isOwn:       { type: Boolean, value: false },
    interactive: { type: Boolean, value: false },
    insertMode:  { type: Boolean, value: false },
    drawnTile:   { type: Object, value: null },
    aiGuessPosition: { type: Number, value: -1 },
  },

  data: {
    validPositions: [],
  },

  observers: {
    'tiles, drawnTile, insertMode': function(tiles, drawnTile, insertMode) {
      if (insertMode && drawnTile) {
        const positions = findValidInsertPositions(tiles, drawnTile);
        this.setData({ validPositions: positions });
      } else {
        this.setData({ validPositions: [] });
      }
    },
  },

  methods: {
    onSlotTap(e) {
      if (!this.properties.insertMode) return;
      const pos = Number(e.currentTarget.dataset.position);
      this.triggerEvent('positionSelected', { position: pos });
    },
  },
});
