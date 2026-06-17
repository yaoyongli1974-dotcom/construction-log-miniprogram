/**
 * 施工日志小程序 - 图片资源生成脚本（完善版）
 * 
 * 功能：生成所有需要的SVG图片资源
 * 
 * 使用方法：
 * 1. 运行命令：node generate-images.js
 * 2. 图片将生成到 miniprogram/images/ 目录
 * 3. SVG可直接使用，如需PNG见底部说明
 */

const fs = require('fs');
const path = require('path');

// 确保图片目录存在
const imagesDir = path.join(__dirname, 'miniprogram', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log('✅ 创建图片目录：', imagesDir);
}

// ==================== SVG生成函数 ====================

/**
 * 生成首页图标（列表图标）- SVG格式
 */
function generateHomeIconSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 81 81">
    <rect x="10" y="15" width="61" height="8" rx="2" fill="${color}"/>
    <rect x="10" y="30" width="61" height="8" rx="2" fill="${color}"/>
    <rect x="10" y="45" width="61" height="8" rx="2" fill="${color}"/>
    <rect x="10" y="60" width="45" height="8" rx="2" fill="${color}"/>
  </svg>`;
}

/**
 * 生成新建图标（加号图标）- SVG格式
 */
function generateCreateIconSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 81 81">
    <circle cx="40.5" cy="40.5" r="35" fill="${color}" opacity="0.2"/>
    <line x1="40.5" y1="20" x2="40.5" y2="61" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
    <line x1="20" y1="40.5" x2="61" y2="40.5" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
  </svg>`;
}

/**
 * 生成个人中心图标（用户图标）- SVG格式
 */
function generateProfileIconSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 81 81">
    <circle cx="40.5" cy="28" r="15" fill="${color}"/>
    <ellipse cx="40.5" cy="65" rx="25" ry="18" fill="${color}"/>
  </svg>`;
}

/**
 * 生成分享封面图 - SVG格式
 */
function generateShareCoverSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400" viewBox="0 0 500 400">
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#357ABD;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="500" height="400" fill="url(#bgGradient)"/>
    
    <!-- 标题 -->
    <text x="250" y="80" font-family="Microsoft YaHei, Arial, sans-serif" font-size="48" font-weight="bold" fill="#FFFFFF" text-anchor="middle">施工日志</text>
    
    <!-- 副标题 -->
    <text x="250" y="140" font-family="Microsoft YaHei, Arial, sans-serif" font-size="24" fill="#FFFFFF" text-anchor="middle">让工程管理更简单</text>
    
    <!-- 装饰线条 -->
    <line x1="150" y1="180" x2="350" y2="180" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
    
    <!-- 日志卡片示意 -->
    <rect x="100" y="220" width="300" height="120" rx="10" fill="#FFFFFF" opacity="0.9"/>
    <text x="250" y="270" font-family="Microsoft YaHei, Arial, sans-serif" font-size="20" fill="#4A90E2" text-anchor="middle">📝 施工日志</text>
    <text x="250" y="310" font-family="Microsoft YaHei, Arial, sans-serif" font-size="16" fill="#666666" text-anchor="middle">日期 | 天气 | 进度 | 照片</text>
  </svg>`;
}

/**
 * 生成默认头像 - SVG格式
 */
function generateDefaultAvatarSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <circle cx="100" cy="100" r="100" fill="#E0E0E0"/>
    <circle cx="100" cy="75" r="35" fill="#BDBDBD"/>
    <ellipse cx="100" cy="145" rx="55" ry="40" fill="#BDBDBD"/>
  </svg>`;
}

/**
 * 生成空状态图（无日志）- SVG格式
 */
function generateEmptyStateSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <text x="200" y="100" font-family="Arial, sans-serif" font-size="80" text-anchor="middle" opacity="0.3">📋</text>
    <text x="200" y="180" font-family="Microsoft YaHei, Arial, sans-serif" font-size="24" fill="#999999" text-anchor="middle">暂无施工日志</text>
    <text x="200" y="220" font-family="Microsoft YaHei, Arial, sans-serif" font-size="18" fill="#BDBDBD" text-anchor="middle">点击下方按钮开始记录</text>
  </svg>`;
}

/**
 * 生成加载动画图 - SVG格式
 */
function generateLoadingImageSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" stroke="#4A90E2" stroke-width="8" fill="none" stroke-dasharray="60 20" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="1s" repeatCount="indefinite"/>
    </circle>
  </svg>`;
}

/**
 * 生成Logo - SVG格式
 */
function generateLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#357ABD;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="40" fill="url(#logoGradient)"/>
    <text x="100" y="130" font-family="Microsoft YaHei, Arial, sans-serif" font-size="100" font-weight="bold" fill="#FFFFFF" text-anchor="middle">施</text>
  </svg>`;
}

// ==================== 主生成逻辑 ====================

console.log('🚀 开始生成图片资源...\n');

// 1. 生成TabBar图标（SVG格式）
console.log('📦 生成TabBar图标...');

// 首页图标
fs.writeFileSync(path.join(imagesDir, 'tab-home.svg'), generateHomeIconSvg('#999999'));
fs.writeFileSync(path.join(imagesDir, 'tab-home-active.svg'), generateHomeIconSvg('#4A90E2'));
console.log('  ✅ tab-home.svg (普通)');
console.log('  ✅ tab-home-active.svg (选中)');

// 新建图标
fs.writeFileSync(path.join(imagesDir, 'tab-create.svg'), generateCreateIconSvg('#999999'));
fs.writeFileSync(path.join(imagesDir, 'tab-create-active.svg'), generateCreateIconSvg('#4A90E2'));
console.log('  ✅ tab-create.svg (普通)');
console.log('  ✅ tab-create-active.svg (选中)');

// 个人中心图标
fs.writeFileSync(path.join(imagesDir, 'tab-profile.svg'), generateProfileIconSvg('#999999'));
fs.writeFileSync(path.join(imagesDir, 'tab-profile-active.svg'), generateProfileIconSvg('#4A90E2'));
console.log('  ✅ tab-profile.svg (普通)');
console.log('  ✅ tab-profile-active.svg (选中)');

// 2. 生成分享封面图
console.log('\n📦 生成分享封面图...');
fs.writeFileSync(path.join(imagesDir, 'share-cover.svg'), generateShareCoverSvg());
console.log('  ✅ share-cover.svg');

// 3. 生成默认头像
console.log('\n📦 生成默认头像...');
fs.writeFileSync(path.join(imagesDir, 'default-avatar.svg'), generateDefaultAvatarSvg());
console.log('  ✅ default-avatar.svg');

// 4. 生成空状态图
console.log('\n📦 生成空状态图...');
fs.writeFileSync(path.join(imagesDir, 'empty-state.svg'), generateEmptyStateSvg());
console.log('  ✅ empty-state.svg');

// 5. 生成加载图
console.log('\n📦 生成加载动画图...');
fs.writeFileSync(path.join(imagesDir, 'loading.svg'), generateLoadingImageSvg());
console.log('  ✅ loading.svg');

// 6. 生成Logo
console.log('\n📦 生成Logo...');
fs.writeFileSync(path.join(imagesDir, 'logo.svg'), generateLogoSvg());
console.log('  ✅ logo.svg');

// ==================== 生成说明文档 ====================

const readmeContent = `# 图片资源使用说明

## ✅ 已生成的图片资源

所有图片已生成到 \`miniprogram/images/\` 目录：

### 1. TabBar图标（6个）
- \`tab-home.svg\` / \`tab-home-active.svg\`
- \`tab-create.svg\` / \`tab-create-active.svg\`
- \`tab-profile.svg\` / \`tab-profile-active.svg\`

### 2. 功能图片（5个）
- \`share-cover.svg\` - 分享封面图
- \`default-avatar.svg\` - 默认头像
- \`empty-state.svg\` - 空状态图
- \`loading.svg\` - 加载动画
- \`logo.svg\` - 应用Logo

## 📝 如何使用

### 方案A：直接使用SVG（推荐）

微信小程序支持SVG图片，可直接在代码中使用：

\`\`\`javascript
// 在WXML中
<image src="/images/logo.svg" mode="aspectFit"></image>

// 在CSS中
.background {
  background-image: url('/images/logo.svg');
}
\`\`\`

**优点**：
- 矢量图，放大不失真
- 文件小，加载快
- 不需要转换

### 方案B：转换为PNG格式

如果需要PNG格式（如TabBar图标要求），可使用以下方法：

#### 方法1：在线转换工具
1. 访问 https://cloudconvert.com/svg-to-png
2. 上传SVG文件
3. 设置尺寸（建议：81x81 for TabBar，500x400 for 分享封面）
4. 下载PNG文件

#### 方法2：使用浏览器
1. 用浏览器打开SVG文件
2. 按F12打开开发者工具
3. 右键图片 → 另存为PNG

#### 方法3：使用Node.js脚本（需安装依赖）
\`\`\`bash
npm install sharp
node convert-svg-to-png.js
\`\`\`

## 🔧 修改小程序配置

### TabBar配置（使用SVG）

在 \`app.json\` 中配置TabBar：

\`\`\`json
{
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/tab-home.svg",
        "selectedIconPath": "images/tab-home-active.svg"
      },
      {
        "pagePath": "pages/create/create",
        "text": "新建",
        "iconPath": "images/tab-create.svg",
        "selectedIconPath": "images/tab-create-active.svg"
      },
      {
        "pagePath": "pages/profile/profile",
        "text": "我的",
        "iconPath": "images/tab-profile.svg",
        "selectedIconPath": "images/tab-profile-active.svg"
      }
    ]
  }
}
\`\`\`

**注意**：微信小程序TabBar不支持SVG，需要转换为PNG！

### 解决方案

**选项1**：将SVG转换为PNG（推荐）
- 使用上面提到的转换方法
- 将PNG文件放到images目录
- 修改app.json中的路径

**选项2**：使用iconfont或图片素材库
- 从iconfont.cn下载PNG图标
- 直接替换生成的文件

## 📏 图片尺寸建议

| 图片类型 | 建议尺寸 | 格式 |
|---------|---------|------|
| TabBar图标 | 81x81px | PNG |
| 分享封面 | 500x400px | PNG/JPG |
| 默认头像 | 200x200px | PNG |
| Logo | 200x200px | PNG |
| 空状态图 | 400x300px | PNG |

## 🎨 自定义修改

如需修改图标颜色或样式，编辑 \`generate-images.js\` 中的SVG生成函数：

\`\`\`javascript
// 修改主题色
const themeColor = '#4A90E2';  // 改为你的品牌色

// 重新生成
fs.writeFileSync('tab-home-active.svg', generateHomeIconSvg(themeColor));
\`\`\`

然后重新运行脚本：
\`\`\`bash
node generate-images.js
\`\`\`

## 💡 提示

1. **TabBar必须用PNG**：微信小程序TabBar不支持SVG，需转换
2. **其他图片可用SVG**：如分享封面、头像等可直接用SVG
3. **保持一致性**：所有图标风格应统一
4. **测试不同尺寸**：在多种设备上测试显示效果

## 📞 需要帮助？

如有问题，可以：
1. 查看微信小程序官方文档
2. 使用微信开发者工具预览效果
3. 调整图片尺寸和颜色后再生成
`;

fs.writeFileSync(path.join(imagesDir, 'README.md'), readmeContent);
console.log('\n📄 生成使用说明文档：images/README.md');

// ==================== 生成完成 ====================

console.log('\n✨ 图片资源生成完成！');
console.log(`📁 文件位置：${imagesDir}`);
console.log('\n生成的图片列表：');
console.log('  1. TabBar图标 (6个SVG)');
console.log('  2. 分享封面图 (1个SVG)');
console.log('  3. 默认头像 (1个SVG)');
console.log('  4. 空状态图 (1个SVG)');
console.log('  5. 加载动画图 (1个SVG)');
console.log('  6. Logo (1个SVG)');
console.log('\n⚠️  重要提示：');
console.log('  - 微信小程序TabBar不支持SVG，需转换为PNG！');
console.log('  - 转换方法见：images/README.md');
console.log('  - 或使用在线工具：https://cloudconvert.com/svg-to-png\n');
