// utils/cloud.js - 云开发工具类
const app = getApp();

class CloudUtil {
  // 调用云函数
  static async callFunction(name, data = {}) {
    try {
      const result = await wx.cloud.callFunction({
        name: name,
        data: data
      });
      return result.result;
    } catch (err) {
      console.error(`调用云函数${name}失败`, err);
      throw err;
    }
  }

  // 上传文件到云存储
  static async uploadFile(filePath, cloudPath = '') {
    try {
      if (!cloudPath) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const ext = filePath.split('.').pop();
        cloudPath = `uploads/${app.globalData.openid}/${timestamp}-${random}.${ext}`;
      }
      
      const result = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      });
      
      return result.fileID;
    } catch (err) {
      console.error('上传文件失败', err);
      throw err;
    }
  }

  // 下载云文件临时链接
  static async getTempFileURL(fileList) {
    try {
      const result = await wx.cloud.getTempFileURL({
        fileList: fileList
      });
      return result.fileList;
    } catch (err) {
      console.error('获取临时链接失败', err);
      throw err;
    }
  }

  // 删除云文件
  static async deleteFile(fileList) {
    try {
      const result = await wx.cloud.deleteFile({
        fileList: fileList
      });
      return result.fileList;
    } catch (err) {
      console.error('删除文件失败', err);
      throw err;
    }
  }

  // 数据库操作封装
  static database() {
    return wx.cloud.database();
  }

  // 获取数据库引用
  static collection(name) {
    return wx.cloud.database().collection(name);
  }
}

module.exports = CloudUtil;
