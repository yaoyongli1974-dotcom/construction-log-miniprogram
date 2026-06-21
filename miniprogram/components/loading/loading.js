// components/loading/loading.js
Component({
  properties: {
    // 加载提示文字
    text: {
      type: String,
      value: '加载中...'
    },
    // 是否显示
    show: {
      type: Boolean,
      value: true
    },
    // 加载类型：circle（圆形）、dots（点状）、pulse（脉冲）
    type: {
      type: String,
      value: 'circle'
    }
  },

  data: {
    animating: true
  },

  methods: {
    // 显示加载动画
    showLoading() {
      this.setData({ show: true, animating: true });
    },

    // 隐藏加载动画
    hideLoading() {
      this.setData({ animating: false });
      // 等待动画完成后隐藏
      setTimeout(() => {
        this.setData({ show: false });
      }, 300);
    }
  }
});
