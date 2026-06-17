// components/photo-upload/photo-upload.js
Component({
  properties: {
    images: {
      type: Array,
      value: []
    },
    maxCount: {
      type: Number,
      value: 9
    }
  },

  data: {},

  methods: {
    // 选择图片
    chooseImages() {
      const remaining = this.properties.maxCount - this.properties.images.length;
      
      if (remaining <= 0) {
        wx.showToast({
          title: `最多上传${this.properties.maxCount}张图片`,
          icon: 'none'
        });
        return;
      }
      
      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: (res) => {
          const tempFiles = res.tempFiles.map(f => f.tempFilePath);
          this.uploadImages(tempFiles);
        }
      });
    },

    // 上传图片
    async uploadImages(tempFiles) {
      wx.showLoading({ title: '上传中...' });
      
      try {
        const app = getApp();
        const uploadTasks = tempFiles.map(filePath => {
          return wx.cloud.uploadFile({
            cloudPath: `logs/${app.globalData.openid}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
            filePath: filePath
          });
        });
        
        const results = await Promise.all(uploadTasks);
        const imageUrls = results.map(r => r.fileID);
        
        // 触发父组件更新
        this.triggerEvent('upload', { images: [...this.properties.images, ...imageUrls] });
        
        wx.hideLoading();
        wx.showToast({ title: '上传成功', icon: 'success' });
      } catch (err) {
        console.error('上传图片失败', err);
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    },

    // 删除图片
    deleteImage(e) {
      const { index } = e.currentTarget.dataset;
      const images = [...this.properties.images];
      images.splice(index, 1);
      
      this.triggerEvent('delete', { images });
    },

    // 预览图片
    previewImage(e) {
      const { url } = e.currentTarget.dataset;
      const urls = this.properties.images;
      
      wx.previewImage({
        current: url,
        urls: urls
      });
    }
  }
});
