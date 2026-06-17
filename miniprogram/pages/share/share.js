// pages/share/share.js
const app = getApp();

Page({
  data: {
    logId: '',
    log: null,
    loading: true,
    error: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ logId: options.id });
      this.loadSharedLog(options.id);
    } else {
      this.setData({ 
        loading: false,
        error: true 
      });
    }
  },

  // 加载分享的日志
  async loadSharedLog(logId) {
    this.setData({ loading: true, error: false });

    // 检查云开发是否就绪
    if (!app.globalData.cloudReady) {
      console.log('[提示] 云开发未配置，无法加载分享日志');
      this.setData({ loading: false, error: true });
      return;
    }

    try {
      // 使用专门的云函数获取单条日志详情
      const result = await wx.cloud.callFunction({
        name: 'getLogDetail',
        data: {
          logId: logId
        }
      });
      
      if (result.result.success) {
        this.setData({
          log: result.result.data,
          loading: false
        });
      } else {
        this.setData({ 
          loading: false,
          error: true 
        });
      }
    } catch (err) {
      console.error('加载分享日志失败', err);
      this.setData({ 
        loading: false,
        error: true 
      });
    }
  },

  // 查看日志详情
  viewLogDetail() {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${this.data.logId}`
    });
  },

  // 使用小程序
  useMiniProgram() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 分享
  onShareAppMessage() {
    const { log } = this.data;
    return {
      title: `${log.projectName} ${log.date} 施工日志`,
      path: `/pages/share/share?id=${this.data.logId}`,
      imageUrl: log.images && log.images.length > 0 ? log.images[0] : '/images/share-cover.png'
    };
  }
});
