/**
 * JSON格式验证脚本
 * 验证小程序项目中所有JSON文件的格式
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证JSON文件格式...\n');

// 需要验证的JSON文件列表
const jsonFiles = [
  // 全局配置
  'app.json',
  'project.config.json',
  'sitemap.json',
  
  // 页面配置
  'miniprogram/pages/index/index.json',
  'miniprogram/pages/create/create.json',
  'miniprogram/pages/detail/detail.json',
  'miniprogram/pages/profile/profile.json',
  'miniprogram/pages/share/share.json',
  
  // 组件配置
  'miniprogram/components/log-card/log-card.json',
  'miniprogram/components/weather/weather.json',
  'miniprogram/components/photo-upload/photo-upload.json',
  
  // 云函数配置
  'cloudfunctions/login/package.json',
  'cloudfunctions/createLog/package.json',
  'cloudfunctions/getLogs/package.json',
  'cloudfunctions/getLogDetail/package.json',
  'cloudfunctions/uploadImage/package.json',
  'cloudfunctions/getWeather/package.json'
];

let successCount = 0;
let errorCount = 0;

// 验证每个文件
jsonFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} - 文件不存在`);
    errorCount++;
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    console.log(`✅ ${file}`);
    successCount++;
  } catch (err) {
    console.log(`❌ ${file} - JSON格式错误：`);
    console.log(`   ${err.message}`);
    errorCount++;
  }
});

console.log('\n📊 验证结果：');
console.log(`  成功：${successCount} 个文件`);
console.log(`  失败：${errorCount} 个文件`);

if (errorCount === 0) {
  console.log('\n🎉 所有JSON文件格式正确！');
} else {
  console.log('\n⚠️  请修复上述JSON格式错误后再编译。');
  process.exit(1);
}
