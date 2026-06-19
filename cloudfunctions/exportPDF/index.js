const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 生成标准施工日志模板（每条日志一页）
 * 国家标准施工日志表格格式（表 A5）
 */

// HTML转义
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 生成单页施工日志 HTML
function generateLogPageHTML(log) {
  const content = log.content || {};
  
  // === 生产情况记录 ===
  let productionParts = [];
  if (content.constructionContent) productionParts.push(content.constructionContent);
  if (content.personnelCount) productionParts.push(`投入施工人员 ${content.personnelCount} 人`);
  if (content.machineryList && content.machineryList.length > 0) {
    const mStr = content.machineryList.map(m => `${m.type} ${m.count}台`).join('；');
    productionParts.push(mStr);
  }
  if (content.progressPercent !== undefined && content.progressPercent !== null) {
    productionParts.push(`当日进度 ${content.progressPercent}%`);
  }
  const productionText = productionParts.join('。');
  
  // === 技术质量安全工作记录 ===
  let qaParts = [];
  if (content.qualityCheck) qaParts.push(content.qualityCheck);
  if (content.safetyCheck) qaParts.push(content.safetyCheck);
  if (content.issues) qaParts.push('存在问题：' + content.issues);
  if (content.nextPlan) qaParts.push('明日计划：' + content.nextPlan);
  // 如果都没填，显示"无"
  if (qaParts.length === 0) qaParts.push('无');
  const qaText = qaParts.join('\n');
  
  // === 现场照片 ===
  let photosHTML = '';
  if (log.images && log.images.length > 0) {
    const imgTags = log.images.map(img =>
      `<img src="${img}" alt="现场照片" onerror="this.style.display='none'" />`
    ).join('');
    photosHTML = `
      <div class="photos-section">
        <div class="photos-title">现场照片</div>
        <div class="photos-grid">${imgTags}</div>
      </div>`;
  }

  return `
<div class="page">
  <!-- 标题 -->
  <h1>施 工 日 志</h1>

  <!-- 编号行 -->
  <div class="header-row">
    <span class="header-label">编号：</span>
    <span class="header-line"></span>
    <span class="form-type">表 A5</span>
  </div>

  <!-- 主表格 -->
  <table class="main-table">
    <!-- 第1行：日期 / 施工部位 -->
    <tr>
      <td class="th th-bold">日　期</td>
      <td class="td td-value">${esc(log.date)}</td>
      <td class="th">施工部位</td>
      <td class="td td-value" colspan="3">${esc(log.projectName)}</td>
    </tr>
    
    <!-- 第2行：天气 / 风力 / 温度 -->
    <tr>
      <td class="th">天气情况</td>
      <td class="td">${esc(log.weather)}</td>
      <td class="th">风　力</td>
      <td class="td"></td>
      <td class="th th-narrow">最高/最低温度</td>
      <td class="td"></td>
    </tr>
    
    <!-- 第3行：突发事件 -->
    <tr>
      <td class="th">突发事件</td>
      <td class="td" colspan="5">无</td>
    </tr>
    
    <!-- 第4行：生产情况记录（标题） -->
    <tr class="section-header-row">
      <td colspan="6">
        <span class="section-label">生产情况记录：</span>
        <span class="section-desc">（施工项目内容、机械作业、班组生产、生产存在问题等）</span>
      </td>
    </tr>
    
    <!-- 第5行：生产情况记录（内容） -->
    <tr class="section-content-row section-content-tall">
      <td colspan="6"><div class="section-body">${esc(productionText) || '&nbsp;'}</div></td>
    </tr>
    
    <!-- 第6行：技术质量安全工作记录（标题） -->
    <tr class="section-header-row">
      <td colspan="6">
        <span class="section-label">技术质量安全工作记录：</span>
        <span class="section-desc">（技术质量安全活动、技术质量安全问题、检查验收情况等）</span>
      </td>
    </tr>
    
    <!-- 第7行：技术质量安全工作记录（内容）+ 照片 -->
    <tr class="section-content-row">
      <td colspan="6">
        <div class="qa-wrapper">
          <div class="section-body qa-text">${esc(qaText)}</div>
          ${photosHTML}
        </div>
      </td>
    </tr>
    
    <!-- 第8行：签名行 -->
    <tr class="sign-row">
      <td colspan="2" class="sign-cell">
        <span class="sign-name">建造师（项目经理）</span><span class="sign-line"></span>
      </td>
      <td colspan="2" class="sign-cell">
        <span class="sign-name">记　录　人</span><span class="sign-line"></span>
      </td>
      <td colspan="2" class="sign-cell">
        <span class="sign-name">安高会</span><span class="sign-line"></span>
      </td>
    </tr>
  </table>
  
  <!-- 底部说明 -->
  <p class="footer-note">本表由施工单位填写，建设单位、城建档案馆和施工单位各保存一份。</p>
</div>`;
}

// 生成完整文档 HTML
function generateFullHTML(logs) {
  const pagesHTML = logs.map(log => generateLogPageHTML(log)).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>施工日志</title>
<style>
/* ===== 页面设置 ===== */
@page { size: A4 portrait; margin: 12mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: "SimSun", "宋体", "FangSong", serif;
  font-size: 13px;
  color: #000;
  background: #fff;
  line-height: 1.5;
}

/* ===== 每页 ===== */
.page {
  page-break-after: always;
  width: 186mm; /* A4宽度 - 边距 */
  min-height: 273mm; /* A4高度 - 边距 */
  margin: 0 auto;
  padding: 8mm;
}
.page:last-child { page-break-after: auto; }

/* ===== 标题 ===== */
h1 {
  text-align: center;
  font-family: "SimHei", "黑体", sans-serif;
  font-size: 26px;
  font-weight: bold;
  letter-spacing: 10px;
  padding: 4px 0 10px;
}

/* ===== 编号行 ===== */
.header-row {
  display: flex;
  align-items: center;
  padding: 0 0 6px 0;
  font-size: 12.5px;
}
.header-label { flex-shrink: 0; }
.header-line {
  flex-grow: 1;
  border-bottom: 1px solid #000;
  min-width: 80px;
  margin-right: 15px;
}
.form-type { flex-shrink: 0; font-weight: bold; }

/* ===== 表格 ===== */
.main-table {
  width: 100%;
  border-collapse: collapse;
  border: 1.5px solid #000;
  table-layout: fixed;
}
.main-table td {
  border: 1px solid #000;
  padding: 4px 6px;
  vertical-align: middle;
  text-align: left;
  font-size: 12.5px;
  word-break: break-all;
}

/* 单元格标签 */
.th {
  background: #f9f9f9;
  font-weight: normal;
  white-space: nowrap;
  width: 14%;
  text-align: center;
}
.th-bold { font-weight: bold; }
.th-narrow { white-space: normal; font-size: 11.5px; width: 16%; }
.td-value { font-weight: 500; }

/* 区域标题行 */
.section-header-row td {
  background: #fafafa;
  padding: 5px 8px;
  font-size: 11.5px;
  color: #333;
  line-height: 1.4;
}
.section-label { font-weight: bold; }
.section-desc { color: #666; margin-left: 2px; }

/* 区域内容行 */
.section-content-row td { padding: 0 !important; }
.section-content-tall { height: 85mm !important; }
.section-body {
  padding: 6px 10px;
  line-height: 1.85;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 75mm;
}
.qa-text { min-height: 40mm; }

/* 签名行 */
.sign-row td {
  padding: 8px 6px !important;
  text-align: center;
  border-top: 1.5px solid #000 !important;
}
.sign-cell { display: inline-flex; align-items: baseline; justify-content: center; gap: 6px; }
.sign-name { font-size: 12.5px; white-space: nowrap; }
.sign-line {
  display: inline-block;
  width: 55px;
  border-bottom: 1px solid #000;
  min-height: 16px;
  vertical-align: bottom;
}

/* ===== 现场照片区域 ===== */
.qa-wrapper { display: flex; flex-direction: column; gap: 6px; }
.photos-section {
  margin-top: 4px;
  padding: 4px 10px 8px;
  border-top: 1px dashed #ccc;
}
.photos-title {
  font-size: 11.5px;
  color: #555;
  margin-bottom: 4px;
  font-weight: bold;
}
.photos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.photos-grid img {
  width: 70mm;
  height: 52mm;
  object-fit: cover;
  border: 1px solid #ddd;
  border-radius: 2px;
}

/* ===== 底部说明 ===== */
.footer-note {
  margin-top: 6px;
  font-size: 10.5px;
  color: #777;
}

/* ===== 打印优化 ===== */
@media print {
  body { background: #fff; -webkit-print-color-adjust: exact; }
  .page { page-break-after: always; page-break-inside: avoid; padding: 5mm; }
  .page:last-child { page-break-after: auto; }
  .photos-grid img { -webkit-print-color-adjust: exact; }
}
</style>
</head>
<body>
${pagesHTML}
</body>
</html>`;}

exports.main = async (event, context) => {
  const { startDate, endDate } = event;
  
  console.log('[exportPDF] 开始导出', startDate, endDate);
  
  try {
    const query = { date: _.gte(startDate).lte(endDate) };
    
    const res = await db.collection('logs')
      .where(query)
      .orderBy('date', 'asc')
      .get();
    
    const logs = res.data;
    console.log('[exportPDF] 查询到', logs.length, '条日志');
    
    if (logs.length === 0) {
      return { success: false, message: '所选日期范围内没有日志' };
    }
    
    const html = generateFullHTML(logs);
    const buffer = Buffer.from(html, 'utf-8');
    
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
