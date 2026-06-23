// app.js
App({
  onLaunch: function () {
    this.globalData = {
      env: "testenv001-d7gtpfjahfa6ab5f6",
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
      // 建立用户身份（wx.cloud.init 的 traceUser 在某些情况下不够）
      wx.login({
        success: (res) => {
          console.log('[App] wx.login success, code:', res.code ? 'ok' : 'fail');
        },
        fail: (err) => {
          console.warn('[App] wx.login failed:', err);
        },
      });
    }
  },
});
