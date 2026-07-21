// cloudfunctions/getLogDetail/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { logId } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;

  if (!logId) {
    return { success: false, message: '缺少日志ID' };
  }
  if (!OPENID) {
    return { success: false, message: '用户未登录' };
  }

  try {
    // 必须同时校验 _id 和当前用户 openid
    // 兼容历史数据（只有 userId 字段）和新数据（有 _openid 字段）
    const result = await db.collection('logs').where({
      _id: logId,
      $or: [
        { _openid: OPENID },
        { userId: OPENID }
      ]
    }).get();

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
