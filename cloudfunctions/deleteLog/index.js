// 云函数 deleteLog - 删除施工日志
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { logId } = event;
  
  if (!logId) {
    return { success: false, message: '缺少日志ID' };
  }
  
  try {
    const db = cloud.database();
    const _ = db.command;
    
    // 删除日志（云函数有管理员权限，不受权限限制）
    const result = await db.collection('logs').doc(logId).remove();
    
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
