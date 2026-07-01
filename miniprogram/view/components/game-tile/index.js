/**
 * game-tile —— 单张牌组件。
 */
Component({
  properties: {
    tile:      { type: Object, value: {} },
    faceUp:    { type: Boolean, value: false },
    size:      { type: String, value: 'medium' },
    selected:  { type: Boolean, value: false },
    disabled:  { type: Boolean, value: false },
    drawn:     { type: Boolean, value: false },
    position:  { type: Number, value: 0 },
  },

  data: {
    animData: null,
    showOverlay: false,
    wasRevealed: false,
  },

  observers: {
    'tile.isRevealed': function(isRevealed) {
      if (isRevealed && !this.data.wasRevealed) {
        this.setData({ showOverlay: true, wasRevealed: true });
      }
    },
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', {
        tileId: this.properties.tile.id,
        position: this.properties.position,
      });
    },
  },
});
