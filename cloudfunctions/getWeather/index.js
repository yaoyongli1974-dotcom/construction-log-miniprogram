// cloudfunctions/getWeather/index.js
const cloud = require('wx-server-sdk');
const axios = require('axios');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 和风天气API配置（免费版）
const WEATHER_API_KEY = 'your-heweather-api-key'; // 替换为你的API Key
const WEATHER_API_URL = 'https://devapi.qweather.com/v7/weather/now';

exports.main = async (event, context) => {
  try {
    const { lat, lng } = event;
    
    // 验证参数
    if (!lat || !lng) {
      return {
        success: false,
        message: '经纬度参数不能为空'
      };
    }
    
    // 调用和风天气API
    const response = await axios.get(WEATHER_API_URL, {
      params: {
        location: `${lng},${lat}`, // 注意：和风天气是经度,纬度
        key: WEATHER_API_KEY,
        lang: 'zh'
      }
    });
    
    if (response.data && response.data.code === '200') {
      const weatherData = response.data.now;
      
      return {
        success: true,
        data: {
          weather: weatherData.text,
          temp: weatherData.temp,
          feelsLike: weatherData.feelsLike,
          humidity: weatherData.humidity,
          windDir: weatherData.windDir,
          windScale: weatherData.windScale,
          vis: weatherData.vis
        }
      };
    } else {
      return {
        success: false,
        message: '获取天气失败',
        error: response.data
      };
    }
  } catch (err) {
    console.error('获取天气失败', err);
    return {
      success: false,
      message: '获取天气失败',
      error: err.message
    };
  }
};
