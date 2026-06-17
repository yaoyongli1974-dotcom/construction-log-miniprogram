// pages/detail/detail.js
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
      this.loadLogDetail(options.id);
    } else {
      this.setData({ 
        loading: false,
        error: true 
      });
    }
  },

  // 加载日志详情
  async loadLogDetail(logId) {
    this.setData({ loading: true, error: false });

    // 检查云开发是否就绪
    if (!app.globalData.cloudReady) {
      console.log('[提示] 云开发未配置，无法加载详情');
      this.setData({ loading: false, error: true });
      return;
    }

    try {
      const db = wx.cloud.database();
      const result = await db.collection('logs').doc(logId).get();
      
      if (result.data) {
        this.setData({
          log: result.data,
          loading: false
        });
      } else {
        this.setData({ 
          loading: false,
          error: true 
        });
      }
    } catch (err) {
      console.error('加载日志详情失败', err);
      this.setData({ 
        loading: false,
        error: true 
      });
    }
  },

  // 编辑日志
  editLog() {
    wx.navigateTo({
      url: `/pages/create/create?id=${this.data.logId}&mode=edit`
    });
  },

  // 删除日志
  async deleteLog() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条日志吗？删除后不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            
            const db = wx.cloud.database();
            await db.collection('logs').doc(this.data.logId).remove();
            
            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            // 返回首页并刷新
            const pages = getCurrentPages();
            if (pages.length > 1) {
              const prevPage = pages[pages.length - 2];
              prevPage.setData({ needRefresh: true });
            }
            wx.navigateBack();
          } catch (err) {
            console.error('删除日志失败', err);
            wx.hideLoading();
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    const urls = this.data.log.images || [];
    
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  // 分享日志
  onShareAppMessage() {
    const { log } = this.data;
    return {
      title: `${log.projectName} ${log.date} 施工日志`,
      path: `/pages/detail/detail?id=${this.data.logId}`,
      imageUrl: log.images && log.images.length > 0 ? log.images[0] : '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { log } = this.data;
    return {
      title: `${log.projectName} ${log.date} 施工日志`,
      query: `id=${this.data.logId}`,
      imageUrl: log.images && log.images.length > 0 ? log.images[0] : '/images/share-cover.png'
    };
  }
});
