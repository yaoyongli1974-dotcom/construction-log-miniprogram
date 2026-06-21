// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    userInfo: null,   // 用户资料（从云数据库加载）
    openid: '',        // 用户 openid
    stats: {
      totalLogs: 0,
      thisMonthLogs: 0,
      draftCount: 0
    },
    loading: true
  },

  onLoad() {
    this.loadUserInfo();
    this.loadStats();
  },

  onShow() {
    // 每次显示时刷新数据和用户资料
    this.loadUserInfo();
    this.loadStats();
  },

  // 从云数据库加载用户资料（静默，不需要用户授权）
  async loadUserInfo() {
    const openid = app.globalData.openid;
    if (!openid) {
      // 云开发未就绪，等待 500ms 后重试
      setTimeout(() => this.loadUserInfo(), 500);
      return;
    }

    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').doc(openid).get();
      if (res.data) {
        const userInfo = {
          nickName: res.data.nickName || '微信用户',
          avatarUrl: res.data.avatarUrl || ''
        };
        this.setData({
          userInfo,
          openid
        });
        // 同步到 globalData
        app.globalData.userInfo = userInfo;
      }
    } catch (err) {
      // 用户记录不存在，使用默认值
      this.setData({
        userInfo: { nickName: '微信用户', avatarUrl: '' },
        openid
      });
    }
  },

  // 选择头像（微信新API：button open-type="chooseAvatar"）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;

    // 上传到云存储
    const openid = app.globalData.openid;
    const fileName = `avatar/${openid}_${Date.now()}.png`;
    
    wx.cloud.uploadFile({
      cloudPath: fileName,
      filePath: avatarUrl,
      success: async (uploadRes) => {
        const fileID = uploadRes.fileID;
        // 更新云数据库
        try {
          const db = wx.cloud.database();
          await db.collection('users').doc(openid).update({
            data: { avatarUrl: fileID }
          });
          this.setData({
            'userInfo.avatarUrl': fileID
          });
          app.globalData.userInfo.avatarUrl = fileID;
          wx.showToast({ title: '头像已更新', icon: 'success' });
        } catch (err) {
          console.error('更新头像失败', err);
        }
      },
      fail: (err) => {
        console.error('上传头像失败', err);
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  // 修改昵称（微信新API：input type="nickname"）
  async onInputNickname(e) {
    const nickName = e.detail.value.trim();
    if (!nickName) return;

    const openid = app.globalData.openid;
    try {
      const db = wx.cloud.database();
      await db.collection('users').doc(openid).update({
        data: { nickName }
      });
      this.setData({
        'userInfo.nickName': nickName
      });
      app.globalData.userInfo.nickName = nickName;
    } catch (err) {
      console.error('更新昵称失败', err);
    }
  },

  // 加载统计数据
  async loadStats() {
    this.setData({ loading: true });

    const openid = app.globalData.openid;
    if (!openid) {
      setTimeout(() => this.loadStats(), 500);
      return;
    }

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 获取总日志数
      const totalResult = await db.collection('logs')
        .where({ userId: openid })
        .count();

      // 获取本月日志数
      const now = new Date();
      const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const thisMonthResult = await db.collection('logs')
        .where({
          userId: openid,
          date: _.gte(thisMonthStart)
        })
        .count();

      // 获取草稿数
      const draftResult = await db.collection('logs')
        .where({
          userId: openid,
          status: 'draft'
        })
        .count();

      this.setData({
        stats: {
          totalLogs: totalResult.total,
          thisMonthLogs: thisMonthResult.total,
          draftCount: draftResult.total
        },
        loading: false
      });
    } catch (err) {
      console.error('加载统计数据失败', err);
      this.setData({ loading: false });
    }
  },

  // 查看全部日志
  viewAllLogs() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 查看草稿
  viewDrafts() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 分享小程序
  onShareAppMessage() {
    return {
      title: '施工日志小程序 - 让工程管理更简单',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系我们',
      content: '如有问题，请发送邮件至 admin@029cn.com',
      showCancel: false
    });
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: '缓存已清除', icon: 'success' });
        }
      }
    });
  }
});
