// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { OPENID, APPID } = cloud.getWXContext();
  
  // 记录登录日志
  const db = cloud.database();
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
  
  return {
    openid: OPENID,
    appid: APPID
  };
};
