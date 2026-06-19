// cloudfunctions/voiceToText/index.js
// 语音转文字云函数（百度语音识别API - 真实识别）
const cloud = require('wx-server-sdk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 百度语音识别配置（从用户获取）
const BAIDU_API_KEY = '9ocDisKxPdCs1qPlCXGb7Htz';
const BAIDU_SECRET_KEY = 'CWGjePwZi7pEp5xPG6Dp3nMz5EKu3bmS';

// 获取百度 access_token
async function getBaiduToken() {
  const url = `https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
  const res = await axios.get(url);
  return res.data.access_token;
}

// 调用百度语音识别（restful API，直接传音频内容）
async function recognizeSpeech(audioBase64, token) {
  const url = `https://vop.baidu.com/server_api`;

  const res = await axios.post(url, {
    format: 'wav',    // 音频格式（wav）
    rate: 16000,      // 采样率
    channel: 1,       // 声道数
    cuid: `miniprogram_${Date.now()}`,
    token: token,
    dev_pid: 1537,   // 1537=普通话(支持简单的英文识别)
    speech: audioBase64,
    len: Buffer.from(audioBase64, 'base64').length
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  if (res.data.err_no === 0) {
    return res.data.result[0];
  } else {
    throw new Error(`百度识别失败(${res.data.err_no}): ${res.data.err_msg}`);
  }
}

exports.main = async (event, context) => {
  try {
    const { fileID } = event;
    
    if (!fileID) {
      return { success: false, message: '缺少音频文件' };
    }
    
    console.log('[语音识别] 开始, fileID:', fileID);
    
    // 1. 下载录音文件到临时目录
    const downloadResult = await cloud.downloadFile({ fileID });
    const fileContent = downloadResult.fileContent; // Buffer
    
    console.log('[语音识别] 文件下载成功, 大小:', fileContent.length);
    
    // 2. 转成 base64（百度API要求）
    const audioBase64 = fileContent.toString('base64');
    
    // 3. 获取百度 token
    const token = await getBaiduToken();
    console.log('[语音识别] 获取token成功');
    
    // 4. 调用百度语音识别
    const recognizeRes = await recognizeSpeech(audioBase64, token);
    console.log('[语音识别] 百度原始返回:', JSON.stringify(recognizeRes));
    console.log('[语音识别] 识别成功, 文字:', recognizeRes);
    
    return {
      success: true,
      text: recognizeRes || '(未识别到内容，请重新录音)'
    };
  } catch (err) {
    console.error('[语音识别] 失败', err);
    return {
      success: false,
      message: err.message || '识别失败，请重试'
    };
  }
};
