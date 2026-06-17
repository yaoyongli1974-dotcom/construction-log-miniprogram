// cloudfunctions/uploadImage/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  
  try {
    const { fileContent, fileName } = event;
    
    // 验证参数
    if (!fileContent) {
      return {
        success: false,
        message: '文件内容不能为空'
      };
    }
    
    // 将base64转换为buffer
    const buffer = Buffer.from(fileContent, 'base64');
    
    // 生成文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const ext = fileName ? fileName.split('.').pop() : 'jpg';
    const cloudPath = `logs/${OPENID}/${timestamp}-${random}.${ext}`;
    
    // 上传到云存储
    const result = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer
    });
    
    return {
      success: true,
      message: '上传成功',
      fileID: result.fileID,
      fileLink: result.fileID  // 小程序端可通过wx.cloud.getTempFileURL获取临时链接
    };
  } catch (err) {
    console.error('上传图片失败', err);
    return {
      success: false,
      message: '上传失败',
      error: err.message
    };
  }
};
