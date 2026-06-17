// app.js - 全局逻辑
App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d3gnw41wh36ebbd00', // 云开发环境ID
        traceUser: true
      });
    }

    // 获取用户信息
    this.globalData = {};
    this.getUserInfo();
  },

  // 获取用户信息
  getUserInfo() {
    const that = this;
    
    // 检查是否已登录
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已授权，获取用户信息
          wx.getUserInfo({
            success: res => {
              that.globalData.userInfo = res.userInfo;
              that.globalData.isLogin = true;
              
              // 调用云函数登录
              that.cloudLogin();
            }
          });
        } else {
          // 未授权，跳转授权页
          that.globalData.isLogin = false;
        }
      }
    });
  },

  // 云开发登录
  cloudLogin() {
    const that = this;
    
    wx.cloud.callFunction({
      name: 'login',
      data: {}
    }).then(res => {
      if (res.result && res.result.openid) {
        that.globalData.openid = res.result.openid;
        that.globalData.isLogin = true;
        
        // 保存用户信息到云数据库
        that.saveUserInfo(res.result.openid);
      }
    }).catch(err => {
      console.error('云登录失败', err);
    });
  },

  // 保存用户信息
  saveUserInfo(openid) {
    const db = wx.cloud.database();
    const userInfo = this.globalData.userInfo;
    
    // 查询用户是否已存在
    db.collection('users').where({
      _id: openid
    }).get().then(res => {
      if (res.data.length === 0) {
        // 新用户，插入数据
        db.collection('users').add({
          data: {
            _id: openid,
            nickName: userInfo.nickName || '未设置',
            avatarUrl: userInfo.avatarUrl || '',
            createTime: Date.now(),
            inviteCode: this.generateInviteCode(),
            invitedBy: ''
          }
        }).then(() => {
          console.log('用户信息保存成功');
        }).catch(err => {
          console.error('保存用户信息失败', err);
        });
      } else {
        // 已存在，更新信息
        db.collection('users').doc(openid).update({
          data: {
            nickName: userInfo.nickName || '未设置',
            avatarUrl: userInfo.avatarUrl || '',
            lastLoginTime: Date.now()
          }
        });
      }
    });
  },

  // 生成邀请码
  generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  globalData: {
    userInfo: null,
    openid: '',
    isLogin: false
  }
});
