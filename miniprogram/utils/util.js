// utils/util.js - 通用工具函数

class Util {
  // 格式化日期
  static formatDate(date, format = 'YYYY-MM-DD') {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second);
  }

  // 获取今天日期
  static getToday() {
    return this.formatDate(new Date());
  }

  // 获取本月第一天
  static getMonthFirstDay() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // 验证手机号
  static validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  }

  // 验证邮箱
  static validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // 显示加载提示
  static showLoading(title = '加载中...') {
    wx.showLoading({
      title: title,
      mask: true
    });
  }

  // 隐藏加载提示
  static hideLoading() {
    wx.hideLoading();
  }

  // 显示成功提示
  static showSuccess(title) {
    wx.showToast({
      title: title,
      icon: 'success'
    });
  }

  // 显示错误提示
  static showError(title) {
    wx.showToast({
      title: title,
      icon: 'none'
    });
  }

  // 显示确认对话框
  static showConfirm(title, content) {
    return new Promise((resolve, reject) => {
      wx.showModal({
        title: title,
        content: content,
        success: (res) => {
          if (res.confirm) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        fail: () => {
          reject(new Error('用户取消'));
        }
      });
    });
  }

  // 防抖函数
  static debounce(fn, delay = 300) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  }

  // 节流函数
  static throttle(fn, delay = 300) {
    let lastTime = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastTime >= delay) {
        lastTime = now;
        fn.apply(this, args);
      }
    };
  }

  // 深拷贝
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const clonedObj = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = this.deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

module.exports = Util;
