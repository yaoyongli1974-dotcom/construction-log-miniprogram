const cloud = require('wx-server-sdk');
const fs = require('fs');
const path = require('path');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 标准施工日志 HTML 模板
function generateLogHTML(log) {
  const content = log.content || {};
  
  // 格式化机械台班
  let machineryHTML = '';
  if (content.machineryList && content.machineryList.length > 0) {
    machineryHTML = '<ul>' + content.machineryList.map(m => 
      `<li>${m.type || ''} ${m.count || ''}台班</li>`
    ).join('') + '</ul>';
  }
  
  // 格式化照片
  let imagesHTML = '';
  if (log.images && log.images.length > 0) {
    imagesHTML = '<div class="images">' + log.images.map(img => 
      `<img src="${img}" style="max-width:200px;margin:10px 10px 10px 0;" />`
    ).join('') + '</div>';
  }
  
  return `
  <div class="log-page">
    <h1>施工日志</h1>
    <table class="log-table">
      <tr><td class="label">日期</td><td>${log.date || ''}</td></tr>
      <tr><td class="label">天气</td><td>${log.weather || ''}</td></tr>
      <tr><td class="label">项目名称</td><td>${log.projectName || ''}</td></tr>
      <tr><td class="label">施工内容</td><td>${content.constructionContent || ''}</td></tr>
      <tr><td class="label">施工人数</td><td>${content.personnelCount || 0}人</td></tr>
      <tr><td class="label">机械台班</td><td>${machineryHTML}</td></tr>
      <tr><td class="label">进度</td><td>${content.progressPercent || 0}%</td></tr>
      <tr><td class="label">质量检查</td><td>${content.qualityCheck || ''}</td></tr>
      <tr><td class="label">安全检查</td><td>${content.safetyCheck || ''}</td></tr>
      <tr><td class="label">存在问题</td><td>${content.issues || ''}</td></tr>
      <tr><td class="label">明日计划</td><td>${content.nextPlan || ''}</td></tr>
    </table>
    ${imagesHTML}
  </div>
  `;
}

// 生成完整的 HTML 文档
function generateFullHTML(logs) {
  const logsHTML = logs.map(log => generateLogHTML(log)).join('<hr style="page-break-after:always;" />');
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>施工日志</title>
    <style>
      body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; }
      .log-page { page-break-after: always; margin-bottom: 30px; }
      h1 { text-align: center; color: #333; }
      .log-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .log-table td { border: 1px solid #ddd; padding: 10px; }
      .log-table .label { background: #f5f5f5; font-weight: bold; width: 120px; }
      ul { margin: 0; padding-left: 20px; }
      .images { display: flex; flex-wrap: wrap; margin-top: 10px; }
    </style>
  </head>
  <body>
    <h1>施工日志汇总</h1>
    <p>共 ${logs.length} 条日志，日期范围：${logs[logs.length - 1].date} 至 ${logs[0].date}</p>
    <hr />
    ${logsHTML}
  </body>
  </html>
  `;
}

exports.main = async (event, context) => {
  const { startDate, endDate, cloudPath } = event;
  
  console.log('[exportPDF] 开始导出', startDate, endDate);
  
  try {
    // 查询符合条件的日志
    const query = {
      date: _.gte(startDate).lte(endDate)
    };
    
    const res = await db.collection('logs')
      .where(query)
      .orderBy('date', 'desc')
      .get();
    
    const logs = res.data;
    console.log('[exportPDF] 查询到', logs.length, '条日志');
    
    if (logs.length === 0) {
      return { success: false, message: '所选日期范围内没有日志' };
    }
    
    // 生成 HTML
    const html = generateFullHTML(logs);
    
    // 由于云函数环境限制，改为生成 HTML 文件，用户可在浏览器中打开后转 PDF
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
      message: '已生成 HTML 文件，请在浏览器中打开后使用「打印」功能转为 PDF'
    };
  } catch (err) {
    console.error('[exportPDF] 失败', err);
    return { success: false, message: err.message };
  }
};
