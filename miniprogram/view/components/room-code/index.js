/**
 * room-code —— 房间码展示+复制。
 * Props:  code
 */
Component({
  properties: {
    code: { type: String, value: '' },
  },
  methods: {
    onCopy() {
      wx.setClipboardData({
        data: this.properties.code,
        success: () => wx.showToast({ title: '已复制', icon: 'success' }),
      });
    },
  },
});
