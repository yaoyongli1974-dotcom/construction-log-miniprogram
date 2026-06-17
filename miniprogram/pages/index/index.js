// pages/index/index.js
const app = getApp();

Page({
  data: {
    logs: [],
    loading: false,
    loadingMore: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    currentDate: '',
    searchDate: '',
    searchProject: '',
    showSearch: false
  },

  onLoad() {
    this.setCurrentDate();
    this.loadLogs();
  },

  onShow() {
    // 每次显示页面时，检查是否需要刷新列表
    if (app.globalData.needRefresh) {
      this.setData({
        page: 1,
        logs: [],
        hasMore: true
      });
      this.loadLogs();
      app.globalData.needRefresh = false;
    } else if (this.data.logs.length === 0 && !this.data.loading) {
      // 列表为空且不在加载中，尝试加载（处理云开发延迟就绪的情况）
      this.loadLogs();
    }
  },

  // 设置当前日期
  setCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.setData({
      currentDate: `${year}-${month}-${day}`
      // 注意：不设置 searchDate，让初始加载不带日期筛选
      // 只有用户主动选择日期后才会设置 searchDate
    });
  },

  // 加载日志列表
  async loadLogs() {
    if (this.data.loading || !this.data.hasMore) return;

    // 检查云开发是否就绪
    if (!app.globalData.cloudReady) {
      console.log('[提示] 云开发未配置，使用演示模式');
      this.setData({ loading: false, logs: [] });
      return;
    }

    this.setData({ loading: true });
    
    try {
      const { page, pageSize, searchDate, searchProject } = this.data;
      
      const result = await wx.cloud.callFunction({
        name: 'getLogs',
        data: {
          page: page,
          pageSize: pageSize,
          startDate: searchDate || '',
          endDate: searchDate || '',
          projectName: searchProject || ''
        }
      });
      
      if (result.result.success) {
        const newLogs = result.result.data;
        this.setData({
          logs: page === 1 ? newLogs : [...this.data.logs, ...newLogs],
          hasMore: result.result.hasMore,
          loading: false
        });
      } else {
        wx.showToast({
          title: result.result.message || '加载失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('加载日志失败', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      page: 1,
      logs: [],
      hasMore: true
    });
    this.loadLogs().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    
    this.setData({
      page: this.data.page + 1,
      loadingMore: true
    });
    this.loadLogs().then(() => {
      this.setData({ loadingMore: false });
    });
  },

  // 查看日志详情
  viewLogDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // 创建新日志
  createNewLog() {
    wx.switchTab({
      url: '/pages/create/create'
    });
  },

  // 搜索日期变化
  onDateChange(e) {
    this.setData({
      searchDate: e.detail.value,
      page: 1,
      logs: [],
      hasMore: true
    });
    this.loadLogs();
  },

  // 搜索项目名变化
  onProjectInput(e) {
    this.setData({
      searchProject: e.detail.value
    });
  },

  // 执行搜索
  onSearch() {
    this.setData({
      page: 1,
      logs: [],
      hasMore: true
    });
    this.loadLogs();
  },

  // 切换搜索面板
  toggleSearch() {
    this.setData({
      showSearch: !this.data.showSearch
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '施工日志小程序 - 让工程管理更简单',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  onShareTimeline() {
    return {
      title: '施工日志小程序',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
});
