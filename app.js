// app.js - 全局逻辑（静默登录方案）
App({
  async onLaunch() {
    // 静默登录：不弹窗，直接通过云函数获取 openid
    await this.silentLogin();
  },

  // 静默登录：调用云函数获取用户 openid，不请求头像/昵称权限
  async silentLogin() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });

      if (res.result && res.result.openid) {
        this.globalData.openid = res.result.openid;
        this.globalData.isLogin = true;
        this.globalData.cloudReady = true;
        console.log('[登录] 静默登录成功', res.result.openid);
      }
    } catch (err) {
      console.error('[登录] 云登录失败', err);
      this.globalData.isLogin = false;
      this.globalData.cloudReady = false;
    }
  },

  globalData: {
    userInfo: null,   // 用户资料（从云数据库加载，非 getUserInfo）
    openid: '',       // 用户唯一标识
    isLogin: false,   // 登录状态
    cloudReady: false  // 云开发是否就绪
  }
});
