// services/logService.js - 日志相关业务逻辑
const CloudUtil = require('../../utils/cloud');
const Util = require('../../utils/util');

class LogService {
  // 创建日志
  static async createLog(logData) {
    try {
      const result = await CloudUtil.callFunction('createLog', {
        logData: logData
      });
      return result;
    } catch (err) {
      console.error('创建日志失败', err);
      throw err;
    }
  }

  // 获取日志列表
  static async getLogs(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 20,
        startDate,
        endDate,
        projectName,
        status
      } = options;

      const result = await CloudUtil.callFunction('getLogs', {
        page,
        pageSize,
        startDate,
        endDate,
        projectName,
        status
      });

      return result;
    } catch (err) {
      console.error('获取日志列表失败', err);
      throw err;
    }
  }

  // 获取日志详情
  static async getLogDetail(logId) {
    try {
      const result = await CloudUtil.callFunction('getLogDetail', {
        logId: logId
      });
      return result;
    } catch (err) {
      console.error('获取日志详情失败', err);
      throw err;
    }
  }

  // 更新日志
  static async updateLog(logId, updateData) {
    try {
      const db = CloudUtil.database();
      const result = await db.collection('logs').doc(logId).update({
        data: {
          ...updateData,
          updateTime: new Date()
        }
      });
      return { success: true, data: result };
    } catch (err) {
      console.error('更新日志失败', err);
      throw err;
    }
  }

  // 删除日志
  static async deleteLog(logId) {
    try {
      const db = CloudUtil.database();
      const result = await db.collection('logs').doc(logId).remove();
      return { success: true, data: result };
    } catch (err) {
      console.error('删除日志失败', err);
      throw err;
    }
  }

  // 上传图片
  static async uploadImage(filePath) {
    try {
      const fileID = await CloudUtil.uploadFile(filePath);
      return { success: true, fileID: fileID };
    } catch (err) {
      console.error('上传图片失败', err);
      throw err;
    }
  }

  // 获取统计数据
  static async getStats() {
    try {
      const app = getApp();
      const openid = app.globalData.openid;
      const db = CloudUtil.database();
      const _ = db.command;

      // 并行查询多个统计
      const [total, thisMonth, drafts] = await Promise.all([
        db.collection('logs').where({ userId: openid }).count(),
        db.collection('logs').where({
          userId: openid,
          date: _.gte(Util.getMonthFirstDay())
        }).count(),
        db.collection('logs').where({
          userId: openid,
          status: 'draft'
        }).count()
      ]);

      return {
        totalLogs: total.total,
        thisMonthLogs: thisMonth.total,
        draftCount: drafts.total
      };
    } catch (err) {
      console.error('获取统计数据失败', err);
      throw err;
    }
  }
}

module.exports = LogService;
