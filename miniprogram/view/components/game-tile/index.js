/**
 * game-tile —— 单张牌组件。
 * Props:  tile, faceUp, size, selected, position
 * Events: tap → { tileId, position }
 */
Component({
  properties: {
    tile:      { type: Object, value: {} },
    faceUp:    { type: Boolean, value: false },
    size:      { type: String, value: 'medium' },   // small | medium | large
    selected:  { type: Boolean, value: false },
    position:  { type: Number, value: 0 },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', {
        tileId:   this.properties.tile.id,
        position: this.properties.position,
      });
    },
  },
});
