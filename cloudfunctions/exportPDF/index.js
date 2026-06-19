const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 生成标准施工日志模板（每条日志一页）
 * 按照国家标准施工日志表格格式
 */
function generateLogPageHTML(log, index) {
  const content = log.content || {};
  
  // 格式化机械台班
  let machineryText = '';
  if (content.machineryList && content.machineryList.length > 0) {
    machineryText = content.machineryList.map(m => `${m.type || ''} ${m.count || ''}台`).join('，');
    // 追加到施工内容中显示（模板里没有独立机械列）
  }
  
  // 构建生产情况记录文本
  let productionContent = content.constructionContent || '';
  if (content.personnelCount) {
    productionContent += (productionContent ? '。' : '') + `投入施工人员 ${content.personnelCount} 人`;
  }
  if (machineryText) {
    productionContent += (productionContent ? '，' : '') + machineryText;
  }
  if (content.progressPercent !== undefined && content.progressPercent !== null) {
    productionContent += (productionContent ? '。' : '') + `当日进度 ${content.progressPercent}%`;
  }

  // 质量安全记录
  let qaContent = '';
  if (content.qualityCheck) {
    qaContent += content.qualityCheck;
  }
  if (content.safetyCheck) {
    qaContent += (qaContent ? '\n' : '') + content.safetyCheck;
  }
  if (content.issues) {
    qaContent += (qaContent ? '\n存在问题：' : '存在问题：') + content.issues;
  }
  if (content.nextPlan) {
    qaContent += (qaContent ? '\n明日计划：' : '明日计划：') + content.nextPlan;
  }
  
  // 格式化日期为更友好的格式
  const dateStr = log.date || '';
  
  return `
  <div class="log-page">
    <!-- 标题 -->
    <h1 class="title">施 工 日 志</h1>
    
    <!-- 编号行 -->
    <div class="row header-row">
      <span class="header-label">编号：</span>
      <span class="header-value"></span>
      <span class="form-type">表 A5</span>
    </div>
    
    <table class="log-table">
      <!-- 第一行：日期 + 施工部位 -->
      <tr>
        <td class="cell-label cell-bold">日　期</td>
        <td class="cell-value date-cell">${dateStr}</td>
        <td class="cell-label">施工部位</td>
        <td class="cell-value">${log.projectName || ''}</td>
      </tr>
      
      <!-- 第二行：天气 + 风力 + 温度 -->
      <tr>
        <td class="cell-label">天气情况</td>
        <td class="cell-value weather-cell">${log.weather || ''}</td>
        <td class="cell-label">风　力</td>
        <td class="cell-value wind-cell"></td>
        <td class="cell-label temp-label">最高/最低温度</td>
        <td class="cell-value temp-cell"></td>
      </tr>
      
      <!-- 第三行：突发事件 -->
      <tr>
        <td class="cell-label">突发事件</td>
        <td class="cell-value event-cell" colspan="5">无</td>
      </tr>
      
      <!-- 第四行：生产情况记录（大区域） -->
      <tr class="row-tall">
        <td class="cell-label section-title" colspan="6">
          <div class="section-header">生产情况记录：（施工项目内容、机械作业、班组生产、生产存在问题等）</div>
          <div class="section-content">${escapeHTML(productionContent) || '&nbsp;'}</div>
        </td>
      </tr>
      
      <!-- 第五行：技术质量安全工作记录（大区域） -->
      <tr class="row-tall">
        <td class="cell-label section-title" colspan="6">
          <div class="section-header">技术质量安全工作记录：（技术质量安全活动、技术质量安全问题、检查验收情况等）</div>
          <div class="section-content">${escapeHTML(qaContent) || '&nbsp;'}</div>
        </td>
      </tr>
      
      <!-- 签名行 -->
      <tr class="sign-row">
        <td class="sign-cell" colspan="2">
          <span class="sign-label">建造师（项目经理）</span>
          <span class="sign-line"></span>
        </td>
        <td class="sign-cell" colspan="2">
          <span class="sign-label">记　录　人</span>
          <span class="sign-line"></span>
        </td>
        <td class="sign-cell" colspan="2">
          <span class="sign-label">安高会</span>
          <span class="sign-line"></span>
        </td>
      </tr>
    </table>
    
    <!-- 底部说明 -->
    <p class="footer-note">
      本表由施工单位填写，建设单位、城建档案馆和施工单位各保存一份。
    </p>
  </div>`;
}

// HTML 转义
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}

// 生成完整 HTML 文档
function generateFullHTML(logs) {
  const pagesHTML = logs.map((log, i) => generateLogPageHTML(log, i)).join('\n');
  
  const now = new Date();
  const dateLabel = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>施工日志</title>
<style>
/* ===== 页面基础 ===== */
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: A4 portrait; margin: 15mm; }
body {
  font-family: "SimSun", "宋体", "Microsoft YaHei", serif;
  font-size: 14px;
  color: #000;
  background: #fff;
  line-height: 1.6;
}

/* ===== 每页日志 ===== */
.log-page {
  page-break-after: always;
  width: 210mm;
  min-height: 297mm;
  padding: 10mm;
  margin: 0 auto;
}

.log-page:last-child { page-break-after: auto; }

/* ===== 标题 ===== */
.title {
  text-align: center;
  font-size: 28px;
  font-weight: bold;
  letter-spacing: 12px;
  padding: 8px 0 12px 0;
  font-family: "SimHei", "黑体", sans-serif;
}

/* ===== 编号行 ===== */
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0 8px 0;
  font-size: 13px;
}
.header-label { flex: 0 0 auto; }
.header-value { 
  flex: 1; 
  border-bottom: 1px solid #000; 
  margin-right: 20px; 
  min-width: 120px;
}
.form-type { flex: 0 0 auto; }

/* ===== 表格 ===== */
.log-table {
  width: 100%;
  border-collapse: collapse;
  border: 2px solid #000;
  table-layout: fixed;
}
.log-table td {
  border: 1px solid #000;
  padding: 5px 8px;
  vertical-align: middle;
  text-align: left;
  word-break: break-all;
  font-size: 13px;
}

/* 单元格标签 */
.cell-label {
  background: transparent;
  font-weight: normal;
  white-space: nowrap;
  width: 80px;
}
.cell-bold { font-weight: bold; }
.cell-value {
  background: transparent;
}

/* 特殊单元格宽度 */
.date-cell { width: 90px; }
.weather-cell { width: 70px; }
.wind-cell { width: 60px; }
.temp-label { width: 100px; white-space: nowrap; }
.temp-cell { width: 80px; }
.event-cell {}

/* 大区域行（生产情况 / 质量安全） */
.row-tall td {
  padding: 0 !important;
  height: 100mm;
  vertical-align: top;
}
.section-title {
  height: 100% !important;
}
.section-header {
  padding: 6px 8px 4px 8px;
  font-size: 12.5px;
  color: #333;
  line-height: 1.4;
}
.section-content {
  padding: 4px 8px 8px 8px;
  line-height: 1.8;
  font-size: 13.5px;
  white-space: pre-wrap;
  word-break: break-all;
  color: #000;
  min-height: 80mm;
}

/* 签名行 */
.sign-row td {
  padding: 6px 8px !important;
  text-align: center;
}
.sign-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.sign-label { font-size: 13px; white-space: nowrap; }
.sign-line {
  display: inline-block;
  width: 60px;
  border-bottom: 1px solid #000;
  min-height: 18px;
}

/* 底部说明 */
.footer-note {
  margin-top: 8px;
  font-size: 11px;
  color: #666;
  text-align: left;
}

/* 打印样式 */
@media print {
  body { background: #fff; }
  .log-page { page-break-after: always; padding: 5mm; }
  .log-page:last-child { page-break-after: auto; }
}
</style>
</head>
<body>
${pagesHTML}
</body>
</html>`;
}

exports.main = async (event, context) => {
  const { startDate, endDate } = event;
  
  console.log('[exportPDF] 开始导出', startDate, endDate);
  
  try {
    // 查询符合条件的日志（按日期升序）
    const query = {
      date: _.gte(startDate).lte(endDate)
    };
    
    const res = await db.collection('logs')
      .where(query)
      .orderBy('date', 'asc')
      .get();
    
    const logs = res.data;
    console.log('[exportPDF] 查询到', logs.length, '条日志');
    
    if (logs.length === 0) {
      return { success: false, message: '所选日期范围内没有日志' };
    }
    
    // 生成标准施工日志模板 HTML
    const html = generateFullHTML(logs);
    
    // 转为 Buffer 上传云存储
    const buffer = Buffer.from(html, 'utf-8');
    
    // 保存到云存储
    const fileName = `export/pdf/${startDate}_${endDate}.html`;
    const fileRes = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: buffer
    });
    
    console.log('[exportPDF] 文件已上传', fileRes.fileID);
    
    return {
      success: true,
      fileID: fileRes.fileID,
      count: logs.length,
      format: 'html'
    };
  } catch (err) {
    console.error('[exportPDF] 失败', err);
    return { success: false, message: err.message };
  }
};
