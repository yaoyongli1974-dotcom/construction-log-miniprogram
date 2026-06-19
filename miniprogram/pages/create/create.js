// pages/create/create.js
const app = getApp();

Page({
  data: {
    logId: '',
    isEdit: false,
    log: {
      date: '',
      weather: '晴',
      projectName: '',
      location: {
        name: '',
        lat: 0,
        lng: 0
      },
      content: {
        constructionContent: '',
        personnelCount: 0,
        machineryList: [{ type: '', count: '' }],  // 代替 machineryCount
        progressPercent: 0,
        qualityCheck: '',
        safetyCheck: '',
        issues: '',
        nextPlan: ''
      },
      images: [],
      status: 'draft'
    },
    locationLoading: false,
    saving: false,
    currentDate: '',
    // 天气选项（手动选择）
    weatherOptions: ['晴', '多云', '阴', '小雨', '中雨', '大雨', '雷阵雨', '小雪', '中雪', '大雪', '雾', '霾'],
    weatherIndex: 0,
    // 天气下拉菜单
    showWeatherDropdown: false,
    // 语音输入
    voiceField: '',
    isVoiceRecording: false,
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
    
    // 初始化录音管理器
    this.recorderManager = wx.getRecorderManager();
    
    // 初始化光标位置跟踪（实例变量，实时更新）
    this._cursorPositions = {};
    
    this.recorderManager.onStop((res) => {
      console.log('[语音] 录音结束', res);
      this.setData({ isVoiceRecording: false });
      
      // 上传录音文件到云存储，然后调用识别
      this.uploadAndRecognize(res.tempFilePath);
    });
    
    // 录音错误事件
    this.recorderManager.onError((err) => {
      console.error('[语音] 录音失败', err);
      this.setData({ isVoiceRecording: false });
      wx.showToast({ title: '录音失败', icon: 'none' });
    });
  },

  onShow() {
    // 检查是否从详情页点击"编辑"按钮进入（通过 globalData 传参）
    if (app.globalData.editMode && app.globalData.editLogId) {
      const editId = app.globalData.editLogId;
      // 清除 globalData 中的编辑参数（防止重复加载）
      app.globalData.editLogId = '';
      app.globalData.editMode = false;
      
      this.setData({ 
        logId: editId,
        isEdit: true 
      });
      this.loadLogForEdit(editId);
      return;
    }
    
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
      'log.weather': '晴',
      'log.projectName': lastProjectName,
      'log.location.name': '',
      'log.location.lat': 0,
      'log.location.lng': 0,
      'log.content.constructionContent': '',
      'log.content.personnelCount': 0,
      'log.content.machineryList': [{ type: '', count: '' }],  // 代替 machineryCount
      'log.content.progressPercent': 0,
      'log.content.qualityCheck': '',
      'log.content.safetyCheck': '',
      'log.content.issues': '',
      'log.content.nextPlan': '',
      'log.images': [],
      'log.status': 'draft',
      currentDate: today,
      weatherIndex: 0,
      locationLoading: false
    });
  },

  // 加载待编辑的日志
  async loadLogForEdit(logId) {
    try {
      wx.showLoading({ title: '加载中...' });
      console.log('[编辑] 开始加载日志, logId:', logId);
      
      const db = wx.cloud.database();
      const result = await db.collection('logs').doc(logId).get();
      console.log('[编辑] 数据库查询成功');
      
      if (result.data) {
        const logData = result.data;
        
        // 兼容旧数据（machineryCount）和新数据（machineryList）
        if (!logData.content.machineryList || logData.content.machineryList.length === 0) {
          if (logData.content.machineryCount) {
            // 旧数据迁移：machineryCount → machineryList
            logData.content.machineryList = [{ type: '机械', count: logData.content.machineryCount }];
          } else {
            logData.content.machineryList = [{ type: '', count: '' }];
          }
        }
        
        // 根据已保存的天气，设置 weatherIndex
        let weatherIndex = -1;
        if (logData.weather) {
          weatherIndex = this.data.weatherOptions.indexOf(logData.weather);
        }
        
        this.setData({
          log: logData,
          weatherIndex: weatherIndex,
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
      } else {
        this.setData({ locationLoading: false });
      }
    } catch (err) {
      console.error('选择位置失败', err);
      this.setData({ locationLoading: false });
      wx.showToast({ title: '选择位置失败', icon: 'none' });
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
    // 跟踪光标位置（bindinput 事件返回 e.detail.cursor）
    if (e.detail.cursor !== undefined) {
      this._cursorPositions['constructionContent'] = e.detail.cursor;
    }
  },

  // 施工人数输入
  onPersonnelCountInput(e) {
    this.setData({
      'log.content.personnelCount': parseInt(e.detail.value) || 0
    });
  },

  // 机械类型输入
  onMachineryTypeInput(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`log.content.machineryList[${index}].type`]: e.detail.value
    });
  },

  // 机械台班数输入
  onMachineryCountInput(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`log.content.machineryList[${index}].count`]: e.detail.value
    });
  },

  // 新增机械类型
  addMachinery() {
    const list = this.data.log.content.machineryList;
    list.push({ type: '', count: '' });
    this.setData({
      'log.content.machineryList': list
    });
  },

  // 删除机械类型
  removeMachinery(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.log.content.machineryList;
    if (list.length <= 1) return;
    list.splice(index, 1);
    this.setData({
      'log.content.machineryList': list
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

  // 切换天气下拉菜单
  toggleWeatherDropdown() {
    this.setData({
      showWeatherDropdown: !this.data.showWeatherDropdown
    });
  },

  // 关闭天气下拉菜单
  closeWeatherDropdown() {
    this.setData({
      showWeatherDropdown: false
    });
  },

  // 选择天气
  selectWeather(e) {
    const index = e.currentTarget.dataset.index;
    const weather = this.data.weatherOptions[index];
    this.setData({
      weatherIndex: index,
      'log.weather': weather,
      showWeatherDropdown: false
    });
  },
  
  // 质量检查输入
  onQualityCheckInput(e) {
    this.setData({
      'log.content.qualityCheck': e.detail.value
    });
    if (e.detail.cursor !== undefined) {
      this._cursorPositions['qualityCheck'] = e.detail.cursor;
    }
  },

  // 安全检查输入
  onSafetyCheckInput(e) {
    this.setData({
      'log.content.safetyCheck': e.detail.value
    });
    if (e.detail.cursor !== undefined) {
      this._cursorPositions['safetyCheck'] = e.detail.cursor;
    }
  },

  // 存在问题输入
  onIssuesInput(e) {
    this.setData({
      'log.content.issues': e.detail.value
    });
    if (e.detail.cursor !== undefined) {
      this._cursorPositions['issues'] = e.detail.cursor;
    }
  },

  // 明日计划输入
  onNextPlanInput(e) {
    this.setData({
      'log.content.nextPlan': e.detail.value
    });
    if (e.detail.cursor !== undefined) {
      this._cursorPositions['nextPlan'] = e.detail.cursor;
    }
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
    if (field === 'personnelCount' || field === 'progressPercent') {
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
      wx.showModal({
        title: '提示',
        content: '云开发环境未就绪，请确认：\n1. 已在开发者工具中开通云开发\n2. 环境ID配置正确\n3. 云函数已上传到云端',
        showCancel: false
      });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });
    console.log('[保存] 开始, status:', status, 'isEdit:', this.data.isEdit);
    
    try {
      const { log, logId, isEdit } = this.data;
      log.status = status;
      
      // 处理机械列表
      const cleanMachineryList = (log.content.machineryList || []).filter(item => {
        return item.type || item.count;
      }).map(item => ({
        type: item.type,
        count: parseInt(item.count) || 0
      }));
      log.content.machineryList = cleanMachineryList;
      delete log.content.machineryCount;
      
      let result;
      
      if (isEdit) {
        // 编辑模式
        console.log('[保存] 调用updateLog, logId:', logId);
        result = await wx.cloud.callFunction({
          name: 'updateLog',
          data: { logId, logData: log },
          timeout: 15000
        });
        console.log('[保存] updateLog结果:', JSON.stringify(result));
      } else {
        // 新建模式
        console.log('[保存] 调用createLog');
        result = await wx.cloud.callFunction({
          name: 'createLog',
          data: { logData: log },
          timeout: 15000
        });
        console.log('[保存] createLog结果:', JSON.stringify(result));
      }
      
      wx.hideLoading();
      this.setData({ saving: false });
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: status === 'published' ? (isEdit ? '更新成功' : '发布成功') : '草稿保存成功',
          icon: 'success'
        });
        
        if (log.projectName) {
          wx.setStorageSync('lastProjectName', log.projectName);
        }
        
        if (status === 'published' && !isEdit) {
          this.saveFieldHistory('constructionContent', log.content.constructionContent);
          this.saveFieldHistory('personnelCount', log.content.personnelCount);
          this.saveFieldHistory('progressPercent', log.content.progressPercent);
          this.saveFieldHistory('qualityCheck', log.content.qualityCheck);
          this.saveFieldHistory('issues', log.content.issues);
          this.saveFieldHistory('nextPlan', log.content.nextPlan);
        }
        
        app.globalData.needResetCreatePage = true;
        app.globalData.needRefresh = true;
        
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/index/index' });
        }
      } else {
        wx.showToast({
          title: (result && result.result && result.result.message) || '保存失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('[保存] 失败', err);
      wx.hideLoading();
      this.setData({ saving: false });
      
      let errorMsg = '保存失败';
      if (err.errMsg && err.errMsg.includes('timeout')) {
        errorMsg = '请求超时！请检查：\n1. 云函数是否已上传\n2. 网络连接是否正常';
      } else if (err.errMsg && err.errMsg.includes('fail')) {
        errorMsg = '网络请求失败，请检查网络';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      wx.showModal({
        title: '保存失败',
        content: errorMsg,
        showCancel: false
      });
    }
  },

  // ===== 语音输入相关方法 =====
  
  // 上传录音文件并调用云函数识别
  async uploadAndRecognize(tempFilePath) {
    try {
      wx.showLoading({ title: '识别中...' });
      
      // 1. 上传录音文件到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `voice/${Date.now()}.wav`,
        filePath: tempFilePath
      });
      
      console.log('[语音] 上传成功, fileID:', uploadRes.fileID);
      
      // 2. 调用云函数识别
      console.log('[语音] 开始调用 voiceToText 云函数...');
      const recognizeRes = await wx.cloud.callFunction({
        name: 'voiceToText',
        data: { fileID: uploadRes.fileID },
        timeout: 30000  // 30秒超时（语音识别需要时间）
      });
      
      console.log('[语音] 云函数返回:', JSON.stringify(recognizeRes));
      console.log('[语音] 云函数result:', JSON.stringify(recognizeRes.result));
      
      wx.hideLoading();
      
      if (recognizeRes.result && recognizeRes.result.success) {
        const text = recognizeRes.result.text;
        this.insertVoiceText(text);
      } else {
        throw new Error(recognizeRes.result.message || '识别失败');
      }
    } catch (err) {
      console.error('[语音] 识别失败', err);
      wx.hideLoading();
      wx.showToast({ 
        title: '识别失败：' + (err.message || '未知错误'), 
        icon: 'none',
        duration: 2000
      });
      this.setData({ isVoiceRecording: false, voiceField: '' });
    }
  },
  
  // 跟踪光标位置（textarea选择变化事件）
  onSelectionChange(e) {
    const field = e.currentTarget.dataset.field;
    const cursorPos = e.detail.selectionStart;
    if (field && cursorPos !== undefined) {
      this._cursorPositions[field] = cursorPos;
    }
  },

  // textarea 失焦时记录光标位置（最可靠：失焦一定在 tap 前发生）
  onTextareaBlur(e) {
    const field = e.currentTarget.dataset.field;
    if (field && e.detail.cursor !== undefined) {
      this._cursorPositions[field] = e.detail.cursor;
      console.log('[光标] blur 记录', field, 'pos=', e.detail.cursor);
    }
  },

  // textarea 聚焦时也记录
  onTextareaFocus(e) {
    const field = e.currentTarget.dataset.field;
    if (field && e.detail.cursor !== undefined) {
      this._cursorPositions[field] = e.detail.cursor;
    }
  },
  startVoiceInput(e) {
    const field = e.currentTarget.dataset.field;
    
    if (this.data.isVoiceRecording) {
      this.recorderManager.stop();
      this.setData({ isVoiceRecording: false });
    } else {
      // 直接开始录音（光标位置已在 catchtouchstart 时冻结）
      this.setData({
        isVoiceRecording: true,
        voiceField: field
      });
      
      this.recorderManager.start({
        duration: 60000,
        sampleRate: 16000,
        numberOfChannels: 1,
        format: 'wav'
      });
      
      wx.showToast({ title: '正在录音...', icon: 'none', duration: 1000 });
    }
  },
  
  
  // 把识别的文字插入到对应输入框的光标位置
  insertVoiceText(text) {
    const field = this.data.voiceField;
    if (!field || !text) return;
    
    // 优先用 onTextareaBlur 捕获的光标位置（最可靠）
    // 其次用 onSelectionChange 实时跟踪的位置
    // 都没有则追加到末尾
    const currentValue = this.data.log.content[field] || '';
    let cursorPos = this._cursorPositions[field];
    if (cursorPos === undefined || cursorPos < 0 || cursorPos > currentValue.length) {
      cursorPos = currentValue.length; // 追加到末尾
    }
    
    let newValue;
    let newCursorPos;
    
    // 在光标位置插入
    const before = currentValue.substring(0, cursorPos);
    const after = currentValue.substring(cursorPos);
    newValue = before + text + after;
    newCursorPos = cursorPos + text.length;
    
    // 更新跟踪的光标位置
    this._cursorPositions[field] = newCursorPos;
    
    this.setData({
      [`log.content.${field}`]: newValue,
      voiceField: '',
      isVoiceRecording: false
    }, () => {
      // setData 回调：聚焦文本框并把光标设到插入位置
      wx.nextTick(() => {
        const query = wx.createSelectorQuery().in(this);
        query.select('#textarea-' + field).context((res) => {
          if (res.context && res.context.focus) {
            res.context.focus();
            if (typeof res.context.setTextareaSelection === 'function') {
              res.context.setTextareaSelection(newCursorPos, newCursorPos);
            }
          }
        }).exec();
      });
    });
    
    wx.showToast({ title: '语音识别成功', icon: 'success' });
  },
  
  // ===== 分享 =====
  // 分享
  onShareAppMessage() {
    return {
      title: '施工日志小程序 - 新建日志',
      path: '/pages/create/create',
      imageUrl: '/images/share-cover.png'
    };
  }
});
