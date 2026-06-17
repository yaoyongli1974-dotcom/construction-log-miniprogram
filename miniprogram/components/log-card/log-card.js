// components/log-card/log-card.js
Component({
  properties: {
    log: {
      type: Object,
      value: {}
    }
  },

  data: {},

  methods: {
    // 点击日志卡片
    onTap() {
      const { log } = this.properties;
      this.triggerEvent('tap', { log });
    },

    // 预览图片
    previewImage(e) {
      const { url } = e.currentTarget.dataset;
      const urls = this.properties.log.images || [];
      
      wx.previewImage({
        current: url,
        urls: urls
      });
    }
  }
});
