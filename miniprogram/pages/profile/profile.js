// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    stats: {
      totalLogs: 0,
      thisMonthLogs: 0,
      draftCount: 0
    },
    loading: true
  },

  onLoad() {
    this.loadUserInfo();
    this.loadStats();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadStats();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({ userInfo: userInfo });
    }
  },

  // 加载统计数据
  async loadStats() {
    this.setData({ loading: true });

    // 检查云开发是否就绪
    if (!app.globalData.cloudReady || !app.globalData.openid) {
      console.log('[提示] 云开发未配置，跳过统计数据加载');
      this.setData({ loading: false });
      return;
    }

    try {
      const openid = app.globalData.openid;
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 获取总日志数
      const totalResult = await db.collection('logs')
        .where({ userId: openid })
        .count();
      
      // 获取本月日志数
      const now = new Date();
      const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const thisMonthResult = await db.collection('logs')
        .where({
          userId: openid,
          date: _.gte(thisMonthStart)
        })
        .count();
      
      // 获取草稿数
      const draftResult = await db.collection('logs')
        .where({
          userId: openid,
          status: 'draft'
        })
        .count();
      
      this.setData({
        stats: {
          totalLogs: totalResult.total,
          thisMonthLogs: thisMonthResult.total,
          draftCount: draftResult.total
        },
        loading: false
      });
    } catch (err) {
      console.error('加载统计数据失败', err);
      this.setData({ loading: false });
    }
  },

  // 查看全部日志
  viewAllLogs() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 查看草稿
  viewDrafts() {
    wx.switchTab({
      url: '/pages/index/index'
    });
    // 实际应该跳转到带筛选的日志列表，这里简化为跳首页
  },

  // 分享小程序
  onShareAppMessage() {
    return {
      title: '施工日志小程序 - 让工程管理更简单',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 联系客服
  contactService() {
    // 这里可以配置客服按钮或使用feedback组件
    wx.showModal({
      title: '联系我们',
      content: '如有问题，请发送邮件至 support@construction-log.com',
      showCancel: false
    });
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({
            title: '缓存已清除',
            icon: 'success'
          });
        }
      }
    });
  }
});
