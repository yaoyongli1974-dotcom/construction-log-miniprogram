// cloudfunctions/getLogs/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;

  if (!OPENID) {
    return { success: false, message: '用户未登录' };
  }

  try {
    const {
      page = 1,
      pageSize = 20,
      startDate,
      endDate,
      projectName,
      status
    } = event;

    // 必须查询当前用户的日志（服务端取 OPENID，不信任前端 userId）
    // 兼容历史数据：旧记录用 userId 字段，新记录用 _openid 字段
    let query = {
      $or: [
        { _openid: OPENID },
        { userId: OPENID }
      ]
    };

    // 日期范围查询
    if (startDate && endDate) {
      query.date = _.gte(startDate).and(_.lte(endDate));
    } else if (startDate) {
      query.date = _.gte(startDate);
    } else if (endDate) {
      query.date = _.lte(endDate);
    }

    // 项目名称筛选
    if (projectName) {
      query.projectName = db.RegExp({
        regexp: projectName,
        options: 'i'
      });
    }

    // 状态筛选
    if (status) {
      query.status = status;
    }

    // 查询总数
    const countResult = await db.collection('logs').where(query).count();
    const total = countResult.total;

    // 分页查询
    const skip = (page - 1) * pageSize;
    const result = await db.collection('logs')
      .where(query)
      .orderBy('date', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      success: true,
      data: result.data,
      total: total,
      page: page,
      pageSize: pageSize,
      hasMore: skip + result.data.length < total
    };
  } catch (err) {
    console.error('获取日志列表失败', err);
    return {
      success: false,
      message: '获取日志列表失败',
      error: err.message
    };
  }
};
