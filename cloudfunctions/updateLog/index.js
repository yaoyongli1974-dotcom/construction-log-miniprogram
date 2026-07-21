// 云函数 updateLog - 更新施工日志（带用户权限校验）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { logId, logData } = event;
  const { OPENID } = cloud.getWXContext();

  if (!logId) {
    return { success: false, message: '缺少日志ID' };
  }
  if (!logData) {
    return { success: false, message: '缺少日志数据' };
  }
  if (!OPENID) {
    return { success: false, message: '用户未登录' };
  }

  try {
    const db = cloud.database();

    // 去掉保留字段（_id、_openid等不能出现在update的data中）
    const { _id, _openid, ...cleanData } = logData;

    // 只能更新属于当前用户的日志
    const result = await db.collection('logs').where({
      _id: logId,
      $or: [
        { _openid: OPENID },
        { userId: OPENID }
      ]
    }).update({
      data: {
        ...cleanData,
        updateTime: db.serverDate()
      }
    });

    if (result.stats.updated === 0) {
      return { success: false, message: '日志不存在或无权更新' };
    }

    return {
      success: true,
      message: '更新成功',
      updated: result.stats.updated
    };
  } catch (err) {
    console.error('更新日志失败', err);
    return {
      success: false,
      message: '更新失败：' + (err.message || '未知错误')
    };
  }
};
