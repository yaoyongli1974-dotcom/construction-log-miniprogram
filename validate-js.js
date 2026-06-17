/**
 * JavaScript语法检查脚本
 * 使用Node.js检查所有JS文件的语法
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始检查JavaScript语法...\n');

// 需要检查的JS文件列表
const jsFiles = [
  // 全局逻辑
  'app.js',
  
  // 工具类
  'miniprogram/utils/cloud.js',
  'miniprogram/utils/util.js',
  'miniprogram/utils/template.js',
  
  // 服务层
  'miniprogram/services/logService.js',
  'miniprogram/services/userService.js',
  
  // 页面逻辑
  'miniprogram/pages/index/index.js',
  'miniprogram/pages/create/create.js',
  'miniprogram/pages/detail/detail.js',
  'miniprogram/pages/profile/profile.js',
  'miniprogram/pages/share/share.js',
  
  // 组件逻辑
  'miniprogram/components/log-card/log-card.js',
  'miniprogram/components/weather/weather.js',
  'miniprogram/components/photo-upload/photo-upload.js',
  
  // 云函数
  'cloudfunctions/login/index.js',
  'cloudfunctions/createLog/index.js',
  'cloudfunctions/getLogs/index.js',
  'cloudfunctions/getLogDetail/index.js',
  'cloudfunctions/uploadImage/index.js',
  'cloudfunctions/getWeather/index.js'
];

let successCount = 0;
let errorCount = 0;
let warningCount = 0;

// 检查每个文件
jsFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} - 文件不存在`);
    warningCount++;
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 使用Node.js的vm模块检查语法
    const vm = require('vm');
    try {
      new vm.Script(content);
      console.log(`✅ ${file}`);
      successCount++;
    } catch (syntaxErr) {
      console.log(`❌ ${file} - 语法错误：`);
      console.log(`   ${syntaxErr.message}`);
      errorCount++;
    }
  } catch (err) {
    console.log(`⚠️  ${file} - 无法读取：${err.message}`);
    warningCount++;
  }
});

console.log('\n📊 检查结果：');
console.log(`  成功：${successCount} 个文件`);
console.log(`  失败：${errorCount} 个文件`);
console.log(`  警告：${warningCount} 个文件`);

if (errorCount === 0) {
  console.log('\n🎉 所有JavaScript文件语法正确！');
  console.log('\n💡 提示：');
  console.log('  1. 语法检查通过不代表逻辑正确');
  console.log('  2. 需要在微信开发者工具中进行完整编译');
  console.log('  3. 建议使用真机调试功能\n');
} else {
  console.log('\n⚠️  请修复上述语法错误后再编译。');
  process.exit(1);
}
