/**
 * guess-panel —— 猜测操作板（仅数字网格 + 确认/撤销）。
 * Events: confirm → { targetOpenid, position, color, value }, cancel → {}
 */
Component({
  properties: {
    show:           { type: Boolean, value: false },
    opponents:      { type: Array, value: [] },
    targetOpenid:   { type: String, value: '' },
    targetPosition: { type: Number, value: 0 },
    color:          { type: String, value: 'black' },
  },

  data: {
    numbers:      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, -1],
    selectedValue: null,
    targetName:   '',
  },

  observers: {
    'targetOpenid, targetPosition, opponents': function(oid, pos, opponents) {
      if (!oid || !opponents) return;
      const opp = opponents.find(o => o.openid === oid);
      this.setData({ targetName: opp ? (opp.nickName || '玩家') : '对手', selectedValue: null });
    },
    'show': function(show) { if (!show) this.setData({ selectedValue: null }); },
  },

  methods: {
    onSelectValue(e) {
      this.setData({ selectedValue: parseInt(e.currentTarget.dataset.value) });
    },
    onConfirm() {
      if (this.data.selectedValue === null) return;
      this.triggerEvent('confirm', {
        targetOpenid: this.properties.targetOpenid,
        position: this.properties.targetPosition,
        color: this.properties.color,
        value: this.data.selectedValue,
      });
    },
    onCancel() {
      this.setData({ selectedValue: null });
      this.triggerEvent('cancel');
    },
  },
});
