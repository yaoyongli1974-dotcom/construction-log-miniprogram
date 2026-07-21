// cloudfunctions/createLog/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  
  try {
    const { logData } = event;
    
    // 验证必填字段
    if (!logData.projectName || !logData.date) {
      return {
        success: false,
        message: '项目名称和日期为必填项'
      };
    }
    
    // 添加日志
    // 同时写入 _openid（云数据库保留字段）和 userId（历史兼容字段）
    const result = await db.collection('logs').add({
      data: {
        ...logData,
        _openid: OPENID,
        userId: OPENID,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        status: logData.status || 'draft'
      }
    });
    
    return {
      success: true,
      message: '日志创建成功',
      logId: result._id
    };
  } catch (err) {
    console.error('创建日志失败', err);
    return {
      success: false,
      message: '创建日志失败',
      error: err.message
    };
  }
};
