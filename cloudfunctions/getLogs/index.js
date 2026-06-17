// cloudfunctions/getLogs/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;
  
  try {
    const { 
      userId, 
      page = 1, 
      pageSize = 20, 
      startDate, 
      endDate,
      projectName,
      status 
    } = event;
    
    // 构建查询条件
    let query = {};
    
    // 如果指定了userId，则查询该用户的日志（用于分享查看）
    if (userId) {
      query.userId = userId;
    } else {
      // 否则查询当前用户的日志
      query.userId = OPENID;
    }
    
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
