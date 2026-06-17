// pages/create/create.js
const app = getApp();

Page({
  data: {
    logId: '',
    isEdit: false,
    log: {
      date: '',
      weather: '',
      projectName: '',
      location: {
        name: '',
        lat: 0,
        lng: 0
      },
      content: {
        constructionContent: '',
        personnelCount: 0,
        machineryCount: 0,
        progressPercent: 0,
        qualityCheck: '',
        safetyCheck: '',
        issues: '',
        nextPlan: ''
      },
      images: [],
      status: 'draft'
    },
    weatherLoading: false,
    locationLoading: false,
    saving: false,
    currentDate: '',
    // 历史记录相关
    showHistory: false,
    historyList: [],
    historyField: '',
    historyFieldName: ''
  },

  onLoad(options) {
    // 检查是否为编辑模式
    if (options.id) {
      this.setData({ 
        logId: options.id,
        isEdit: true 
      });
      this.loadLogForEdit(options.id);
    } else {
      this.initPage();
    }
  },

  onShow() {
    // TabBar 页面切换时，检查是否需要重置表单
    if (!this.data.isEdit && app.globalData.needResetCreatePage) {
      app.globalData.needResetCreatePage = false;
      this.initPage();
    }
  },

  // 初始化页面（新建模式）- 完整重置所有表单字段
  initPage() {
    // 设置默认日期为今天
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    // 从本地存储读取上次使用的项目名称
    const lastProjectName = wx.getStorageSync('lastProjectName') || '';
    
    // 完整重置表单（清空上次填写的内容）
    this.setData({
      logId: '',
      isEdit: false,
      saving: false,
      'log.date': today,
      'log.weather': '',
      'log.projectName': lastProjectName,
      'log.location.name': '',
      'log.location.lat': 0,
      'log.location.lng': 0,
      'log.content.constructionContent': '',
      'log.content.personnelCount': 0,
      'log.content.machineryCount': 0,
      'log.content.progressPercent': 0,
      'log.content.qualityCheck': '',
      'log.content.safetyCheck': '',
      'log.content.issues': '',
      'log.content.nextPlan': '',
      'log.images': [],
      'log.status': 'draft',
      currentDate: today,
      weatherLoading: false,
      locationLoading: false
    });
  },

  // 加载待编辑的日志
  async loadLogForEdit(logId) {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const db = wx.cloud.database();
      const result = await db.collection('logs').doc(logId).get();
      
      if (result.data) {
        this.setData({
          log: result.data,
          loading: false
        });
      }
      
      wx.hideLoading();
    } catch (err) {
      console.error('加载日志失败', err);
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 获取位置和天气
  async getLocationAndWeather() {
    this.setData({
      weatherLoading: true,
      locationLoading: true
    });

    try {
      // 获取位置（带超时）
      const location = await this.getLocation().catch(() => null);
      
      if (location) {
        this.setData({
          'log.location.name': location.name,
          'log.location.lat': location.latitude,
          'log.location.lng': location.longitude,
          locationLoading: false
        });
      } else {
        // 获取位置失败，使用默认位置
        this.setData({
          'log.location.name': '未获取位置',
          locationLoading: false
        });
      }

      // 获取天气（云开发可用时才调用）
      if (app.globalData.cloudReady) {
        const lat = this.data.log.location.lat || 34.27;  // 默认西安纬度
        const lng = this.data.log.location.lng || 108.93; // 默认西安经度

        const weatherResult = await wx.cloud.callFunction({
          name: 'getWeather',
          data: { lat, lng }
        }).catch(() => null);

        if (weatherResult && weatherResult.result.success) {
          const weather = weatherResult.result.data;
          this.setData({
            'log.weather': `${weather.weather} ${weather.temp}°C`,
            weatherLoading: false
          });
        } else {
          this.setData({ weatherLoading: false });
        }
      } else {
        this.setData({ weatherLoading: false });
      }
    } catch (err) {
      console.error('获取位置或天气失败', err);
      this.setData({ 
        weatherLoading: false,
        locationLoading: false,
        'log.location.name': '未获取位置'
      });
    }
  },

  // 选择位置（打开地图，直接返回地址名称）
  chooseLocation() {
    return new Promise((resolve, reject) => {
      wx.chooseLocation({
        success: (res) => {
          // res 包含：name（位置名称）、address（详细地址）、latitude、longitude
          console.log('[选择位置] 成功', res);
          resolve({
            name: res.name || res.address || '未知位置',
            address: res.address || '',
            latitude: res.latitude,
            longitude: res.longitude
          });
        },
        fail: (err) => {
          console.error('[选择位置] 失败', err);
          // 用户取消选择
          if (err.errMsg && err.errMsg.includes('cancel')) {
            resolve(null);
          } else {
            // 其他错误，使用默认位置
            resolve({
              name: '西安市',
              address: '陕西省西安市',
              latitude: 34.27,
              longitude: 108.93
            });
          }
        }
      });
    });
  },

  // 点击「选择位置」按钮
  async onChooseLocation() {
    this.setData({ locationLoading: true });

    try {
      const location = await this.chooseLocation();
      
      if (location) {
        this.setData({
          'log.location.name': location.name,
          'log.location.address': location.address || '',
          'log.location.lat': location.latitude,
          'log.location.lng': location.longitude,
          locationLoading: false
        });

        // 选择位置后，自动获取天气
        this.getWeatherByLocation(location.latitude, location.longitude);
      } else {
        this.setData({ locationLoading: false });
      }
    } catch (err) {
      console.error('选择位置失败', err);
      this.setData({ locationLoading: false });
      wx.showToast({ title: '选择位置失败', icon: 'none' });
    }
  },

  // 根据位置获取天气
  async getWeatherByLocation(lat, lng) {
    this.setData({ weatherLoading: true });

    try {
      if (!app.globalData.cloudReady) {
        this.setData({ weatherLoading: false });
        return;
      }

      const weatherResult = await wx.cloud.callFunction({
        name: 'getWeather',
        data: { lat, lng }
      }).catch(() => null);

      if (weatherResult && weatherResult.result.success) {
        const weather = weatherResult.result.data;
        this.setData({
          'log.weather': `${weather.weather} ${weather.temp}°C`,
          weatherLoading: false
        });
      } else {
        this.setData({ weatherLoading: false });
      }
    } catch (err) {
      console.error('获取天气失败', err);
      this.setData({ weatherLoading: false });
    }
  },

  // 日期选择变化
  onDateChange(e) {
    this.setData({
      'log.date': e.detail.value
    });
  },

  // 项目名称输入
  onProjectNameInput(e) {
    this.setData({
      'log.projectName': e.detail.value
    });
  },

  // 施工内容输入
  onConstructionContentInput(e) {
    this.setData({
      'log.content.constructionContent': e.detail.value
    });
  },

  // 施工人数输入
  onPersonnelCountInput(e) {
    this.setData({
      'log.content.personnelCount': parseInt(e.detail.value) || 0
    });
  },

  // 机械台数输入
  onMachineryCountInput(e) {
    this.setData({
      'log.content.machineryCount': parseInt(e.detail.value) || 0
    });
  },

  // 进度百分比输入
  onProgressPercentInput(e) {
    let value = parseInt(e.detail.value) || 0;
    if (value < 0) value = 0;
    if (value > 100) value = 100;
    this.setData({
      'log.content.progressPercent': value
    });
  },

  // 质量检查输入
  onQualityCheckInput(e) {
    this.setData({
      'log.content.qualityCheck': e.detail.value
    });
  },

  // 安全检查输入
  onSafetyCheckInput(e) {
    this.setData({
      'log.content.safetyCheck': e.detail.value
    });
  },

  // 存在问题输入
  onIssuesInput(e) {
    this.setData({
      'log.content.issues': e.detail.value
    });
  },

  // 明日计划输入
  onNextPlanInput(e) {
    this.setData({
      'log.content.nextPlan': e.detail.value
    });
  },
  
  // 点击"历史"按钮，显示历史记录
  showHistory(e) {
    const field = e.currentTarget.dataset.field;
    const fieldNames = {
      'constructionContent': '施工内容',
      'personnelCount': '施工人数',
      'machineryCount': '机械台数',
      'progressPercent': '进度百分比',
      'qualityCheck': '质量检查',
      'safetyCheck': '安全检查',
      'issues': '存在问题',
      'nextPlan': '明日计划'
    };
    
    // 先收起键盘
    wx.hideKeyboard();
    
    // 延迟显示历史面板（确保键盘已经收起）
    setTimeout(() => {
      // 从本地存储加载历史记录
      const historyKey = `history_${field}`;
      const historyList = wx.getStorageSync(historyKey) || [];
      
      this.setData({
        showHistory: true,
        historyList: historyList,
        historyField: field,
        historyFieldName: fieldNames[field] || field
      });
    }, 100);
  },
  
  // 关闭历史记录面板
  closeHistory() {
    this.setData({
      showHistory: false,
      historyList: [],
      historyField: '',
      historyFieldName: ''
    });
  },
  
  // 选择历史记录（追加到末尾，而不是替换）
  selectHistory(e) {
    const value = e.currentTarget.dataset.value;
    const field = this.data.historyField;
    
    // 获取当前值
    const currentValue = this.data.log.content[field] || '';
    
    // 根据字段类型处理
    if (field === 'personnelCount' || field === 'machineryCount' || field === 'progressPercent') {
      // 数字字段直接替换
      this.setData({
        [`log.content.${field}`]: parseInt(value) || 0
      });
    } else {
      // 文本字段：追加到末尾（如果已有内容，加换行）
      let newValue = '';
      if (currentValue && currentValue.trim()) {
        // 已有内容，追加到末尾（加两个换行，表示新的段落）
        newValue = currentValue.trimEnd() + '\n\n' + value;
      } else {
        // 没有内容，直接填充
        newValue = value;
      }
      
      this.setData({
        [`log.content.${field}`]: newValue
      });
    }
    
    // 关闭历史面板
    this.closeHistory();
    
    wx.showToast({
      title: '已追加到末尾',
      icon: 'success',
      duration: 1000
    });
  },
  
  // 删除历史记录
  deleteHistory(e) {
    const index = e.currentTarget.dataset.index;
    const field = this.data.historyField;
    const historyKey = `history_${field}`;
    
    let historyList = this.data.historyList;
    historyList.splice(index, 1);
    
    // 更新本地存储
    wx.setStorageSync(historyKey, historyList);
    
    this.setData({
      historyList: historyList
    });
    
    wx.showToast({
      title: '已删除',
      icon: 'success',
      duration: 1000
    });
  },
  
  // 保存历史记录（在保存日志时调用）
  saveFieldHistory(field, value) {
    if (!value || value === 0) return;
    
    const historyKey = `history_${field}`;
    let historyList = wx.getStorageSync(historyKey) || [];
    
    // 如果已存在，移到最前面
    const existIndex = historyList.indexOf(value.toString());
    if (existIndex > -1) {
      historyList.splice(existIndex, 1);
    }
    
    // 添加到最前面
    historyList.unshift(value.toString());
    
    // 最多保留10条历史记录
    if (historyList.length > 10) {
      historyList = historyList.slice(0, 10);
    }
    
    // 保存到本地存储
    wx.setStorageSync(historyKey, historyList);
  },

  // 选择现场照片
  chooseImages() {
    const that = this;
    wx.chooseMedia({
      count: 9 - that.data.log.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFiles = res.tempFiles.map(f => f.tempFilePath);
        that.uploadImages(tempFiles);
      }
    });
  },

  // 上传图片
  async uploadImages(tempFiles) {
    wx.showLoading({ title: '上传中...' });
    
    try {
      const uploadTasks = tempFiles.map(filePath => {
        return wx.cloud.uploadFile({
          cloudPath: `logs/${app.globalData.openid}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: filePath
        });
      });
      
      const results = await Promise.all(uploadTasks);
      const imageUrls = results.map(r => r.fileID);
      
      this.setData({
        'log.images': [...this.data.log.images, ...imageUrls]
      });
      
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
    const images = this.data.log.images;
    images.splice(index, 1);
    this.setData({
      'log.images': images
    });
  },

  // 保存日志（草稿）
  saveAsDraft() {
    this.saveLog('draft');
  },

  // 发布日志
  publishLog() {
    // 表单验证
    if (!this.data.log.projectName) {
      wx.showToast({ title: '请填写项目名称', icon: 'none' });
      return;
    }
    
    if (!this.data.log.content.constructionContent) {
      wx.showToast({ title: '请填写施工内容', icon: 'none' });
      return;
    }
    
    this.saveLog('published');
  },

  // 保存日志
  async saveLog(status) {
    if (this.data.saving) return;

    // 检查云开发是否就绪
    if (!app.globalData.cloudReady) {
      wx.showToast({ title: '请先配置云开发环境', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });
    
    try {
      const { log, logId, isEdit } = this.data;
      log.status = status;
      
      let result;
      
      if (isEdit) {
        // 编辑模式：更新日志
        const db = wx.cloud.database();
        result = await db.collection('logs').doc(logId).update({
          data: {
            ...log,
            updateTime: new Date()
          }
        });
        result = { result: { success: true } };
      } else {
        // 新建模式：创建日志
        result = await wx.cloud.callFunction({
          name: 'createLog',
          data: {
            logData: log
          }
        });
      }
      
      wx.hideLoading();
      this.setData({ saving: false });
      
      if (result.result.success || isEdit) {
        wx.showToast({
          title: status === 'published' ? (isEdit ? '更新成功' : '发布成功') : '草稿保存成功',
          icon: 'success'
        });
        
        // 记住项目名称（保存到本地存储）
        if (log.projectName) {
          wx.setStorageSync('lastProjectName', log.projectName);
        }
        
        // 保存历史记录（用于自动补全）
        if (status === 'published' && !isEdit) {
          this.saveFieldHistory('constructionContent', log.content.constructionContent);
          this.saveFieldHistory('personnelCount', log.content.personnelCount);
          this.saveFieldHistory('machineryCount', log.content.machineryCount);
          this.saveFieldHistory('progressPercent', log.content.progressPercent);
          this.saveFieldHistory('qualityCheck', log.content.qualityCheck);
          this.saveFieldHistory('safetyCheck', log.content.safetyCheck);
          this.saveFieldHistory('issues', log.content.issues);
          this.saveFieldHistory('nextPlan', log.content.nextPlan);
        }
        
        // 设置重置标记（下次进入新建页面时自动清空表单）
        app.globalData.needResetCreatePage = true;
        
        // 设置刷新标记（使用 globalData 传递，兼容 switchTab 和 navigateBack）
        app.globalData.needRefresh = true;
        
        // 导航逻辑：根据页面栈决定如何返回
        const pages = getCurrentPages();
        
        if (pages.length > 1) {
          // 从其他页面跳转过来的（如编辑模式），返回上一页
          wx.navigateBack();
        } else {
          // 从 TabBar 直接打开的，切换到日志列表页
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      } else {
        wx.showToast({
          title: result.result.message || '保存失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('保存日志失败', err);
      wx.hideLoading();
      this.setData({ saving: false });
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '施工日志小程序 - 新建日志',
      path: '/pages/create/create',
      imageUrl: '/images/share-cover.png'
    };
  }
});
