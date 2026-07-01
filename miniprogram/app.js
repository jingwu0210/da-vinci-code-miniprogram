// app.js
App({
  onLaunch: function () {
    this.globalData = {
      env: "testenv001-d7gtpfjahfa6ab5f6",
    };

    // 游客身份初始化（UUID 持久化到 storage）
    var touristId = wx.getStorageSync('touristId');
    if (!touristId) {
      touristId = 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      wx.setStorageSync('touristId', touristId);
    }
    this.globalData.touristId = touristId;

    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
      wx.login({
        success: function (res) {},
        fail: function (err) { console.warn('[App] wx.login failed:', err); },
      });
    }
  },
});
