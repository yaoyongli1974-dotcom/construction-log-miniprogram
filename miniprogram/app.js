// app.js - 施工日志小程序全局逻辑
App({
  onLaunch() {
    // 初始化全局数据
    this.globalData = {
      userInfo: null,
      openid: '',
      isLogin: false,
      cloudReady: false,  // 云开发是否就绪
      needRefresh: false,  // 是否需要刷新列表
      needResetCreatePage: false,  // 是否需要重置新建页面表单
      editLogId: '',  // 编辑日志时的日志ID
      editMode: false  // 是否处于编辑模式
    };

    // 初始化云开发（容错处理，不阻塞启动）
    this.initCloud();
  },

  // 初始化云开发（带容错和超时处理）
  initCloud() {
    if (!wx.cloud) {
      console.warn('[提示] 当前基础库版本不支持云开发，部分功能将不可用');
      this.globalData.cloudReady = false;
      return;
    }

    try {
      wx.cloud.init({
        env: 'cloud1-d3gnw41wh36ebbd00', // 云开发环境ID
        traceUser: true
      });
      this.globalData.cloudReady = true;
      console.log('[成功] 云开发初始化完成');

      // 延迟获取用户信息（不阻塞启动，避免超时错误）
      setTimeout(() => {
        this.getUserInfo();
      }, 2000);
    } catch (err) {
      console.warn('[警告] 云开发初始化失败，请检查环境ID配置', err);
      this.globalData.cloudReady = false;
    }
  },

  // 获取用户信息
  getUserInfo() {
    const that = this;

    // 检查是否已登录
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.userInfo']) {
          // 已授权
          wx.getUserInfo({
            success(userRes) {
              that.globalData.userInfo = userRes.userInfo;
              that.globalData.isLogin = true;

              // 如果云开发可用，延迟调用登录（带超时保护）
              if (that.globalData.cloudReady) {
                setTimeout(() => {
                  that.cloudLogin();
                }, 1000);
              }
            }
          });
        } else {
          that.globalData.isLogin = false;
        }
      }
    });
  },

  // 云开发登录（带超时保护）
  cloudLogin() {
    const that = this;

    wx.cloud.callFunction({
      name: 'login',
      data: {},
      // 设置超时时间为10秒（避免默认超时导致红色报错）
      timeout: 10000
    }).then(res => {
      if (res.result && res.result.openid) {
        that.globalData.openid = res.result.openid;
        console.log('[成功] 用户openid:', res.result.openid);
      }
    }).catch(err => {
      // 登录失败不影响小程序使用，下次操作时会重试
      console.warn('[提示] 登录请求异常（可能网络问题），不影响使用:', err.errMsg || err.message || err);
    });
  },

  globalData: {}
});
