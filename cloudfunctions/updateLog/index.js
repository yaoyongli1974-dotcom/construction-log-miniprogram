// 云函数 updateLog - 更新施工日志
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { logId, logData } = event;

  if (!logId) {
    return { success: false, message: '缺少日志ID' };
  }

  if (!logData) {
    return { success: false, message: '缺少日志数据' };
  }

  try {
    const db = cloud.database();

    // 去掉保留字段（_id、_openid等不能出现在update的data中）
    const { _id, _openid, ...cleanData } = logData;

    // 云函数有管理员权限，可以更新任何日志
    const result = await db.collection('logs').doc(logId).update({
      data: {
        ...cleanData,
        updateTime: db.serverDate()
      }
    });

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
