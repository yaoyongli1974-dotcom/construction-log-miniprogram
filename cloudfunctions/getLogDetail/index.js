// cloudfunctions/getLogDetail/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { logId, userId } = event;
  const db = cloud.database();
  
  try {
    // 构建查询条件
    let query = { _id: logId };
    
    // 如果指定了userId，则验证日志属于该用户（用于分享查看）
    if (userId) {
      query.userId = userId;
    }
    
    // 查询日志
    const result = await db.collection('logs').where(query).get();
    
    if (result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      };
    } else {
      return {
        success: false,
        message: '日志不存在或无权访问'
      };
    }
  } catch (err) {
    console.error('获取日志详情失败', err);
    return {
      success: false,
      message: '获取日志详情失败',
      error: err.message
    };
  }
};
