// cloudfunctions/getWeather/index.js - 使用 uapis.cn 免费天气API（无需注册、无需API Key）
const cloud = require('wx-server-sdk');
const axios = require('axios');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// uapis.cn 免费天气API（完全免费，无需API Key，不限制次数）
const WEATHER_API_URL = 'https://uapis.cn/api/v1/misc/weather';

exports.main = async (event, context) => {
  try {
    const { lat, lng, city } = event;
    
    // 调用 uapis.cn 天气API
    let params = {};
    
    if (city) {
      // 优先使用城市名称查询
      params.city = city;
    }
    // 注意：uapis.cn 不支持经纬度查询，如果不传城市名，会按客户端IP自动定位
    // 云函数环境中IP定位可能不准确，所以尽量传城市名
    
    const response = await axios.get(WEATHER_API_URL, {
      params: params,
      timeout: 5000
    });
    
    // uapis.cn 成功时返回的数据格式：
    // { province, city, district, weather, temperature, wind_direction, wind_power, humidity, report_time }
    if (response.data && !response.data.code) {
      const w = response.data;
      
      return {
        success: true,
        data: {
          weather: w.weather || '未知',
          temp: Math.round(w.temperature) || 0,  // 四舍五入取整数
          feelsLike: w.feels_like || 0,
          humidity: w.humidity || 0,
          windDir: w.wind_direction || '',
          windScale: w.wind_power || '',
          vis: 0,
          city: w.city || '',
          district: w.district || ''
        }
      };
    } else {
      // API 返回错误
      console.error('[天气API] 返回错误', response.data);
      return {
        success: false,
        message: '获取天气失败',
        error: response.data
      };
    }
  } catch (err) {
    console.error('[天气API] 调用失败', err);
    return {
      success: false,
      message: '获取天气失败',
      error: err.message
    };
  }
};
