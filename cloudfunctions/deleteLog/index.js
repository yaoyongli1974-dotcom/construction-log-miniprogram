// 云函数 deleteLog - 删除施工日志（带用户权限校验）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { logId } = event;
  const { OPENID } = cloud.getWXContext();

  if (!logId) {
    return { success: false, message: '缺少日志ID' };
  }
  if (!OPENID) {
    return { success: false, message: '用户未登录' };
  }

  try {
    const db = cloud.database();

    // 只能删除属于当前用户的日志
    const result = await db.collection('logs').where({
      _id: logId,
      $or: [
        { _openid: OPENID },
        { userId: OPENID }
      ]
    }).remove();

    if (result.stats.removed === 0) {
      return { success: false, message: '日志不存在或无权删除' };
    }

    return {
      success: true,
      message: '删除成功',
      deleted: result.stats.removed
    };
  } catch (err) {
    console.error('删除日志失败', err);
    return {
      success: false,
      message: '删除失败：' + (err.message || '未知错误')
    };
  }
};
