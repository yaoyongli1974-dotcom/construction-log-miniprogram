# 图片资源使用说明

## ✅ 已生成的图片资源

所有图片已生成到 `miniprogram/images/` 目录：

### 1. TabBar图标（6个）
- `tab-home.svg` / `tab-home-active.svg`
- `tab-create.svg` / `tab-create-active.svg`
- `tab-profile.svg` / `tab-profile-active.svg`

### 2. 功能图片（5个）
- `share-cover.svg` - 分享封面图
- `default-avatar.svg` - 默认头像
- `empty-state.svg` - 空状态图
- `loading.svg` - 加载动画
- `logo.svg` - 应用Logo

## 📝 如何使用

### 方案A：直接使用SVG（推荐）

微信小程序支持SVG图片，可直接在代码中使用：

```javascript
// 在WXML中
<image src="/images/logo.svg" mode="aspectFit"></image>

// 在CSS中
.background {
  background-image: url('/images/logo.svg');
}
```

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
```bash
npm install sharp
node convert-svg-to-png.js
```

## 🔧 修改小程序配置

### TabBar配置（使用SVG）

在 `app.json` 中配置TabBar：

```json
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
```

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

如需修改图标颜色或样式，编辑 `generate-images.js` 中的SVG生成函数：

```javascript
// 修改主题色
const themeColor = '#4A90E2';  // 改为你的品牌色

// 重新生成
fs.writeFileSync('tab-home-active.svg', generateHomeIconSvg(themeColor));
```

然后重新运行脚本：
```bash
node generate-images.js
```

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
