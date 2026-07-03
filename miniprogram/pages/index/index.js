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
    // 多选相关
    multiSelect: false,
    selectedLogs: [],
    isAllSelected: false,
    showBatchFormat: false,
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
        const newLogs = result.result.data.map(log => ({
          ...log,
          __id: String(log._id),
          __selected: false
        }));
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

  // 切换多选模式
  toggleMultiSelect() {
    const multiSelect = !this.data.multiSelect;
    const logs = this.data.logs.map(log => ({ ...log, __selected: false }));
    this.setData({
      multiSelect,
      selectedLogs: [],
      isAllSelected: false,
      logs
    });
  },

  // 切换单条选中状态
  toggleSelect(e) {
    const { id } = e.currentTarget.dataset;
    const logs = this.data.logs;
    let selectedLogs = [...this.data.selectedLogs];
    // 用 __id 匹配（确保类型一致都是字符串）
    const idx = logs.findIndex(log => log.__id === id);
    if (idx === -1) return;

    if (logs[idx].__selected) {
      logs[idx].__selected = false;
      selectedLogs = selectedLogs.filter(sid => sid !== id);
    } else {
      logs[idx].__selected = true;
      selectedLogs.push(id);
    }
    const isAllSelected = selectedLogs.length === logs.length;
    this.setData({ logs, selectedLogs, isAllSelected });
  },

  // 全选/取消全选
  toggleSelectAll() {
    const isAllSelected = !this.data.isAllSelected;
    const logs = this.data.logs.map(log => ({ ...log, __selected: isAllSelected }));
    const selectedLogs = isAllSelected ? logs.map(log => log.__id) : [];
    this.setData({ isAllSelected, selectedLogs, logs });
  },

  // 显示批量导出格式选择
  showBatchFormatPicker() {
    if (this.data.selectedLogs.length === 0) {
      wx.showToast({ title: '请先选择日志', icon: 'none' });
      return;
    }
    this.setData({ showBatchFormat: true });
  },

  // 隐藏批量导出格式选择
  hideBatchFormatPicker() {
    this.setData({ showBatchFormat: false });
  },

  // 执行批量导出（带格式参数）
  async doBatchExport(e) {
    const format = e.currentTarget.dataset.format;
    this.setData({ showBatchFormat: false });

    const { selectedLogs, logs } = this.data;
    if (selectedLogs.length === 0) return;

    wx.showLoading({ title: '正在生成文件...', mask: true });

    try {
      const cloudFuncName = format === 'word' ? 'exportWord' : 'exportExcel';
      const fileType = format === 'word' ? 'doc' : 'xlsx';
      const fileExt = format === 'word' ? 'doc' : 'xlsx';

      const res = await wx.cloud.callFunction({
        name: cloudFuncName,
        data: {
          logIds: selectedLogs
        }
      });

      if (res.result && res.result.success) {
        const fileID = res.result.fileID;
        const downloadRes = await wx.cloud.downloadFile({ fileID });
        wx.hideLoading();
        this.setData({ multiSelect: false, selectedLogs: [], isAllSelected: false });
        // 重置选中状态
        const newLogs = logs.map(log => ({ ...log, __selected: false }));
        this.setData({ logs: newLogs });
        wx.openDocument({
          filePath: downloadRes.tempFilePath,
          fileType: fileType,
          showMenu: true,
          success: () => {
            wx.showToast({ title: `导出成功（${selectedLogs.length}条）`, icon: 'success' });
          }
        });
      } else {
        throw new Error(res.result.message || '导出失败');
      }
    } catch (err) {
      console.error('[批量导出] 失败', err);
      wx.showToast({ title: '导出失败：' + (err.message || '未知错误'), icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 批量删除
  async batchDelete() {
    const { selectedLogs } = this.data;
    if (selectedLogs.length === 0) {
      wx.showToast({ title: '请先选择日志', icon: 'none' });
      return;
    }

    const res = await new Promise((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: `确定要删除选中的 ${selectedLogs.length} 条日志吗？删除后不可恢复。`,
        confirmText: '删除',
        confirmColor: '#FF4D4F',
        success: resolve
      });
    });

    if (!res.confirm) return;

    wx.showLoading({ title: '正在删除...', mask: true });
    try {
      // 逐条调用删除云函数
      const promises = selectedLogs.map(id =>
        wx.cloud.callFunction({
          name: 'deleteLog',
          data: { logId: id }
        })
      );
      const results = await Promise.all(promises);
      const failCount = results.filter(r => !r.result || !r.result.success).length;

      wx.hideLoading();
      this.setData({
        multiSelect: false,
        selectedLogs: [],
        isAllSelected: false,
        page: 1,
        logs: [],
        hasMore: true
      });
      this.loadLogs();

      if (failCount > 0) {
        wx.showToast({ title: `删除完成，${failCount}条失败`, icon: 'none' });
      } else {
        wx.showToast({ title: `成功删除${selectedLogs.length}条日志`, icon: 'success' });
      }
    } catch (err) {
      console.error('[批量删除] 失败', err);
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
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
      const cloudPath = `${exportFormat}/${exportStartDate}_${exportEndDate}.${exportFormat === 'excel' ? 'xlsx' : 'doc'}`;
      
      // 调用云函数生成文件
      const res = await wx.cloud.callFunction({
        name: 'export' + (exportFormat === 'excel' ? 'Excel' : 'Word'),
        data: {
          startDate: exportStartDate,
          endDate: exportEndDate
        }
      });
      
      if (res.result && res.result.success) {
        const fileID = res.result.fileID;
        const fileUrl = res.result.fileUrl;
        
        let tempFilePath;
        
        if (fileID) {
          // 用云存储 fileID 下载
          const downloadRes = await wx.cloud.downloadFile({ fileID });
          tempFilePath = downloadRes.tempFilePath;
        } else if (fileUrl) {
          // 用临时链接下载
          const downloadRes = await wx.downloadFile({ url: fileUrl });
          tempFilePath = downloadRes.tempFilePath;
        } else {
          throw new Error('未获取到文件地址');
        }
        
        wx.hideLoading();
        this.setData({ exporting: false, showExport: false });
        
        const count = res.result.count || 0;
        
        // 统一用 wx.openDocument() 打开（Excel 和 Word 都支持）
        wx.openDocument({
          filePath: tempFilePath,
          fileType: exportFormat === 'excel' ? 'xlsx' : 'doc',
          showMenu: true,
          success: () => {
            wx.showToast({ title: '导出成功（共' + count + '条）', icon: 'success' });
          },
          fail: (openErr) => {
            console.error('[导出] 打开文档失败', openErr);
            wx.showToast({ title: '文件已生成', icon: 'none' });
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
