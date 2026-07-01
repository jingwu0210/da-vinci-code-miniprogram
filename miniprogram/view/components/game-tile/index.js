/**
 * game-tile —— 单张牌组件。
 * 全局 animatedTiles 确保每个 tile id 只播一次推倒动画（组件重建不重置）
 */
var animatedTiles = {};

Component({
  properties: {
    tile:      { type: Object, value: {} },
    faceUp:    { type: Boolean, value: false },
    size:      { type: String, value: 'medium' },
    selected:  { type: Boolean, value: false },
    disabled:  { type: Boolean, value: false },
    drawn:     { type: Boolean, value: false },
    position:  { type: Number, value: 0 },
    isOwn:     { type: Boolean, value: true },
  },

  data: {
    wasRevealed: false,
  },

  observers: {
    'tile.isRevealed': function(isRevealed) {
      var tid = this.properties.tile && this.properties.tile.id;
      if (isRevealed && tid && !animatedTiles[tid]) {
        animatedTiles[tid] = true;
        this.setData({ wasRevealed: true });
        if (this.properties.isOwn) { try { wx.vibrateShort({ type: 'medium' }); } catch(e) {} }
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
