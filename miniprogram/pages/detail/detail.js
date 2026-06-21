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
    // create 是 TabBar 页面，不能用 navigateTo，改用 switchTab + globalData 传参
    app.globalData.editLogId = this.data.logId;
    app.globalData.editMode = true;
    wx.switchTab({
      url: '/pages/create/create'
    });
  },

  // 删除日志（调用云函数）
  async deleteLog() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条日志吗？\n\n删除后不可恢复，请谨慎操作。',
      confirmText: '删除',
      confirmColor: '#FA5151',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 振动反馈
            wx.vibrateShort({ type: 'heavy' });
            
            wx.showLoading({ title: '正在删除...' });
            
            console.log('[删除] 准备调用deleteLog云函数，logId:', this.data.logId);
            
            // 调用云函数删除（云函数有管理员权限）
            const result = await wx.cloud.callFunction({
              name: 'deleteLog',
              data: { logId: this.data.logId }
            });
            
            console.log('[删除] 云函数返回结果:', JSON.stringify(result));
            
            wx.hideLoading();
            
            if (result.result && result.result.success) {
              // 成功反馈：振动 + 提示
              wx.vibrateShort({ type: 'medium' });
              
              wx.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 1500
              });
              
              // 设置刷新标记（使用 globalData，index.js 的 onShow 会检查）
              app.globalData.needRefresh = true;
              
              // 延迟返回，让用户看到成功提示
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } else {
              // 删除失败
              wx.vibrateShort({ type: 'heavy' });
              
              wx.showModal({
                title: '删除失败',
                content: result.result?.message || '未知错误，请重试',
                showCancel: false,
                confirmText: '我知道了'
              });
            }
          } catch (err) {
            console.error('删除日志失败', err);
            console.error('[删除] 错误详情:', JSON.stringify(err));
            wx.hideLoading();
            
            // 振动反馈
            wx.vibrateShort({ type: 'heavy' });
            
            // 提供更详细的错误信息
            let errorMsg = '删除失败，请重试';
            if (err.errMsg && err.errMsg.includes('timeout')) {
              errorMsg = '请求超时，请检查网络连接后重试';
            } else if (err.errMsg && err.errMsg.includes('fail')) {
              errorMsg = '网络请求失败，请检查网络设置';
            } else if (err.message) {
              errorMsg = err.message;
            }
            
            wx.showModal({
              title: '删除失败',
              content: errorMsg,
              showCancel: false,
              confirmText: '我知道了'
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
