/**
 * 施工日志小程序 - SVG转PNG转换脚本
 * 
 * 功能：将生成的SVG图片转换为PNG格式
 * 
 * 使用方法：
 * 1. 安装依赖：npm install sharp
 * 2. 运行脚本：node convert-to-png.js
 * 3. PNG文件将生成到 miniprogram/images/ 目录
 */

const fs = require('fs');
const path = require('path');

// 检查sharp库是否安装
let sharp;
try {
  sharp = require('sharp');
  console.log('✅ 检测到sharp库，开始转换...\n');
} catch (err) {
  console.log('❌ 未安装sharp库！');
  console.log('\n请先安装依赖：');
  console.log('  npm install sharp');
  console.log('\n或者，你可以：');
  console.log('  1. 使用在线转换工具（推荐）：https://cloudconvert.com/svg-to-png');
  console.log('  2. 手动用浏览器打开SVG后截图保存为PNG');
  console.log('  3. 从iconfont.cn下载现成的PNG图标\n');
  process.exit(1);
}

const imagesDir = path.join(__dirname, 'miniprogram', 'images');

// 需要转换的SVG文件列表
const svgFiles = [
  'tab-home.svg',
  'tab-home-active.svg',
  'tab-create.svg',
  'tab-create-active.svg',
  'tab-profile.svg',
  'tab-profile-active.svg',
  'share-cover.svg',
  'default-avatar.svg',
  'empty-state.svg',
  'loading.svg',
  'logo.svg'
];

// PNG尺寸配置
const pngSizes = {
  'tab-home.svg': { width: 81, height: 81 },
  'tab-home-active.svg': { width: 81, height: 81 },
  'tab-create.svg': { width: 81, height: 81 },
  'tab-create-active.svg': { width: 81, height: 81 },
  'tab-profile.svg': { width: 81, height: 81 },
  'tab-profile-active.svg': { width: 81, height: 81 },
  'share-cover.svg': { width: 500, height: 400 },
  'default-avatar.svg': { width: 200, height: 200 },
  'empty-state.svg': { width: 400, height: 300 },
  'loading.svg': { width: 100, height: 100 },
  'logo.svg': { width: 200, height: 200 }
};

console.log('📦 开始转换SVG到PNG...\n');

// 转换每个文件
svgFiles.forEach(svgFile => {
  const svgPath = path.join(imagesDir, svgFile);
  const pngFile = svgFile.replace('.svg', '.png');
  const pngPath = path.join(imagesDir, pngFile);
  
  if (!fs.existsSync(svgPath)) {
    console.log(`⚠️  文件不存在：${svgFile}`);
    return;
  }
  
  const size = pngSizes[svgFile] || { width: 200, height: 200 };
  
  sharp(svgPath)
    .png()
    .resize(size.width, size.height)
    .toFile(pngPath)
    .then(() => {
      console.log(`  ✅ ${svgFile} → ${pngFile} (${size.width}x${size.height})`);
    })
    .catch(err => {
      console.log(`  ❌ 转换失败：${svgFile}`);
      console.error('     ', err.message);
    });
});

console.log('\n✨ 转换完成！');
console.log(`📁 PNG文件位置：${imagesDir}`);
console.log('\n💡 下一步：');
console.log('  1. 检查生成的PNG文件');
console.log('  2. 修改 app.json 中的TabBar配置，使用.png路径');
console.log('  3. 编译并预览小程序\n');
