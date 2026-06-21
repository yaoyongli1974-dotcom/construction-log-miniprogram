const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { OPENID, APPID } = cloud.getWXContext();
  
  const db = cloud.database();
  
  // 记录登录日志
  await db.collection('login_logs').add({
    data: {
      openid: OPENID,
      appid: APPID,
      loginTime: db.serverDate(),
      userAgent: event.userAgent || ''
    }
  }).catch(err => {
    console.error('记录登录日志失败', err);
  });
  
  // 检查用户记录是否存在，不存在则自动创建
  try {
    const userRes = await db.collection('users').doc(OPENID).get();
    // 用户已存在，更新最后登录时间
    await db.collection('users').doc(OPENID).update({
      data: {
        lastLoginTime: db.serverDate()
      }
    });
  } catch (err) {
    // 用户不存在，创建新记录
    if (err.errCode === -1 || (err.message && err.message.includes('document not found'))) {
      await db.collection('users').add({
        data: {
          _id: OPENID,
          nickName: '微信用户',
          avatarUrl: '',
          createTime: db.serverDate(),
          lastLoginTime: db.serverDate(),
          inviteCode: generateInviteCode(),
          invitedBy: ''
        }
      }).catch(e => console.error('创建用户记录失败', e));
    }
  }
  
  return {
    openid: OPENID,
    appid: APPID
  };
};

// 生成邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
