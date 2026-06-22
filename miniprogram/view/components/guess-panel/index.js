/**
 * guess-panel —— 猜测操作板。
 * Props:  show, opponents, targetOpenid, targetPosition, color, value
 * Events: confirm → { targetOpenid, position, color, value }, cancel → {}
 */
Component({
  properties: {
    show:           { type: Boolean, value: false },
    opponents:      { type: Array, value: [] },
    targetOpenid:   { type: String, value: '' },
    targetPosition: { type: Number, value: 0 },
    color:          { type: String, value: 'black' },
    value:          { type: Number, value: 0 },
  },
  methods: {
    onSelectColor(e) {
      this.setData({ color: e.currentTarget.dataset.color });
    },
    onSelectValue(e) {
      this.setData({ value: parseInt(e.currentTarget.dataset.value) });
    },
    onConfirm() {
      this.triggerEvent('confirm', {
        targetOpenid: this.properties.targetOpenid,
        position:     this.properties.targetPosition,
        color:        this.properties.color,
        value:        this.properties.value,
      });
    },
    onCancel() {
      this.triggerEvent('cancel');
    },
  },
});
