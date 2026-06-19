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
    showSearch: false,
    // 导出相关
    showExport: false,
    exportStartDate: '',
    exportEndDate: '',
    exportFormat: 'excel',
    exporting: false
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
  },

  // ===== 导出功能 =====
  // 显示导出面板
  showExportPanel() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    // 默认导出最近 30 天
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const startYear = thirtyDaysAgo.getFullYear();
    const startMonth = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
    const startDay = String(thirtyDaysAgo.getDate()).padStart(2, '0');
    const defaultStart = `${startYear}-${startMonth}-${startDay}`;
    
    this.setData({
      showExport: true,
      exportStartDate: defaultStart,
      exportEndDate: today,
      exportFormat: 'excel'
    });
  },

  // 隐藏导出面板
  hideExportPanel() {
    this.setData({ showExport: false });
  },

  // 选择导出格式
  selectExportFormat(e) {
    this.setData({ exportFormat: e.currentTarget.dataset.format });
  },

  // 导出开始日期变化
  onExportStartDateChange(e) {
    this.setData({ exportStartDate: e.detail.value });
  },

  // 导出结束日期变化
  onExportEndDateChange(e) {
    this.setData({ exportEndDate: e.detail.value });
  },

  // 执行导出
  async doExport() {
    const { exportStartDate, exportEndDate, exportFormat } = this.data;
    
    if (!exportStartDate || !exportEndDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }
    
    if (exportStartDate > exportEndDate) {
      wx.showToast({ title: '开始日期不能大于结束日期', icon: 'none' });
      return;
    }
    
    this.setData({ exporting: true });
    
    wx.showLoading({ title: '正在生成文件...', mask: true });
    
    try {
      const cloudPath = `${exportFormat}/${exportStartDate}_${exportEndDate}.${exportFormat === 'excel' ? 'xlsx' : 'pdf'}`;
      
      // 调用云函数生成文件
      const res = await wx.cloud.callFunction({
        name: 'export' + (exportFormat === 'excel' ? 'Excel' : 'PDF'),
        data: {
          startDate: exportStartDate,
          endDate: exportEndDate,
          cloudPath: cloudPath
        }
      });
      
      if (res.result && res.result.success) {
        const fileID = res.result.fileID;
        
        // 下载文件
        const downloadRes = await wx.cloud.downloadFile({
          fileID: fileID
        });
        
        // 分享或保存文件
        wx.shareFileMessage({
          filePath: downloadRes.tempFilePath,
          success: () => {
            wx.showToast({ title: '导出成功', icon: 'success' });
          },
          fail: (err) => {
            // 如果分享失败，提示用户保存
            console.log('[导出] 分享失败，提示保存', err);
            wx.showModal({
              title: '导出成功',
              content: '文件已生成，请点击「保存」按钮保存到本地',
              confirmText: '保存',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openDocument({
                    filePath: downloadRes.tempFilePath,
                    success: () => console.log('[导出] 打开文档成功'),
                    fail: (openErr) => {
                      console.error('[导出] 打开文档失败', openErr);
                      wx.showToast({ title: '打开文件失败', icon: 'none' });
                    }
                  });
                }
              }
            });
          }
        });
      } else {
        throw new Error(res.result.message || '导出失败');
      }
    } catch (err) {
      console.error('[导出] 失败', err);
      wx.showToast({ 
        title: '导出失败：' + (err.message || '未知错误'), 
        icon: 'none',
        duration: 3000
      });
    } finally {
      wx.hideLoading();
      this.setData({ exporting: false });
    }
  }
});
