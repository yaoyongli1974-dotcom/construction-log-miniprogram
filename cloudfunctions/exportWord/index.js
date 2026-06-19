const cloud = require('wx-server-sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 生成单条日志的 Word HTML 内容（Word 能直接打开）
 */
function generateLogPageHTML(log) {
  const content = log.content || {};
  
  // === 生产情况记录 ===
  let productionParts = [];
  if (content.constructionContent) productionParts.push(content.constructionContent);
  if (content.personnelCount) productionParts.push('投入施工人员 ' + content.personnelCount + ' 人');
  if (content.machineryList && content.machineryList.length > 0) {
    const mStr = content.machineryList.map(m => m.type + ' ' + m.count + '台').join('；');
    productionParts.push(mStr);
  }
  if (content.progressPercent !== undefined && content.progressPercent !== null) {
    productionParts.push('当日进度 ' + content.progressPercent + '%');
  }
  const productionText = productionParts.join('\n');
  
  // === 技术质量安全工作记录 ===
  let qaParts = [];
  if (content.qualityCheck) qaParts.push(content.qualityCheck);
  if (content.safetyCheck) qaParts.push(content.safetyCheck);
  if (content.issues) qaParts.push('存在问题：' + content.issues);
  if (content.nextPlan) qaParts.push('明日计划：' + content.nextPlan);
  if (qaParts.length === 0) qaParts.push('无');
  const qaText = qaParts.join('\n');
  
  // HTML 转义
  const esc = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  
  // 换行转 <br>
  const br = (str) => esc(str).replace(/\n/g, '<br>');
  
  return `<div class="page">
    <h1>施 工 日 志</h1>
    <div class="hdr">
      <span class="hdr-prefix">项目名称：</span>
      <span class="hdr-pval"></span>
      <span class="hdr-gap"></span>
      <span class="hdr-nprefix">编　号：</span>
      <span class="hdr-nval"></span>
      <span class="hdr-ftype">表 A5</span>
    </div>
    <table class="tbl">
      <tr>
        <td class="lbl">日　期</td>
        <td class="val">${esc(log.date)}</td>
        <td class="lbl">施工部位</td>
        <td class="val" colspan="3">${esc(content.constructionSite || '')}</td>
      </tr>
      <tr>
        <td class="lbl">天气情况</td>
        <td class="val">${esc(log.weather || '')}</td>
        <td class="lbl">风　力</td>
        <td class="val">${esc(content.wind || '')}</td>
        <td class="lbl">最高/最低温度</td>
        <td class="val">${esc(content.temperature || '')}</td>
      </tr>
      <tr>
        <td class="lbl">突发事件</td>
        <td class="val" colspan="5">${esc(content.emergency || '无')}</td>
      </tr>
      <tr class="sh"><td colspan="6">生产情况记录：</td></tr>
      <tr class="sc"><td colspan="6"><div class="cb">${br(productionText) || '&nbsp;'}</div></td></tr>
      <tr class="sh"><td colspan="6">技术质量安全工作记录：</td></tr>
      <tr class="sc"><td colspan="6"><div class="cb">${br(qaText)}</div></td></tr>
      <tr class="sr">
        <td colspan="6" class="sr-cell">
          建造师（项目经理）：<span class="sr-fill"></span>
          <span class="sr-sep"></span>
          记录人：<span class="sr-fill"></span>
        </td>
      </tr>
    </table>
    <p class="ftr">本表由施工单位填写，建设单位、城建档案馆和施工单位各保存一份。</p>
  </div>`;
}

/**
 * 生成完整 Word HTML 文档
 */
function generateFullHTML(logs) {
  const pages = logs.map(log => generateLogPageHTML(log)).join('\n  <hr class="page-break">\n');
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>施工日志</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { margin:0; padding:0; box-sizing: border-box; }
    body {
      font-family: "SimSun", "宋体", "FangSong", serif;
      font-size: 12pt;
      color: #000;
      background: #fff;
      line-height: 1.4;
    }
    .page {
      page-break-after: always;
      width: 190mm;
      min-height: 277mm;
      margin: 0 auto;
    }
    .page:last-child { page-break-after: auto; }
    h1 {
      text-align: center;
      font-family: "SimHei", "黑体", sans-serif;
      font-size: 22pt;
      font-weight: bold;
      letter-spacing: 10pt;
      margin-bottom: 6pt;
    }
    .hdr {
      display: flex;
      align-items: baseline;
      font-size: 12pt;
      margin-bottom: 4pt;
    }
    .hdr-prefix { white-space: nowrap; }
    .hdr-pval { min-width: 100pt; border-bottom: 1pt solid #000; display: inline-block; margin-right: 20pt; }
    .hdr-gap { flex: 1; }
    .hdr-nprefix { white-space: nowrap; }
    .hdr-nval { min-width: 60pt; border-bottom: 1pt solid #000; display: inline-block; margin-right: 10pt; }
    .hdr-ftype { font-weight: bold; white-space: nowrap; }
    .tbl {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 12pt;
    }
    .tbl td {
      border: 1pt solid #000;
      padding: 3pt 6pt;
      vertical-align: middle;
      word-break: break-all;
    }
    .tbl .lbl {
      background: #f5f5f5;
      font-weight: bold;
      text-align: center;
      width: 13%;
    }
    .tbl .val { width: 20%; }
    .sh td {
      background: #fafafa;
      font-weight: bold;
      padding: 4pt 8pt;
      border-top: 2pt solid #000;
      font-size: 12pt;
    }
    .sc td { padding: 0; }
    .sc .cb {
      padding: 6pt 10pt;
      min-height: 55mm;
      line-height: 1.9;
      white-space: pre-wrap;
      font-size: 12pt;
    }
    .sr-cell {
      text-align: left;
      padding-left: 20pt;
      font-size: 12pt;
    }
    .sr-fill {
      display: inline-block;
      min-width: 80pt;
      border-bottom: 1pt solid #000;
      margin: 0 4pt;
    }
    .sr-sep {
      display: inline-block;
      min-width: 40pt;
    }
    .page-break { page-break-before: always; border: none; }
    .ftr { margin-top: 8pt; font-size: 10pt; color: #666; text-align: center; }
  </style>
</head>
<body>
  ${pages}
</body>
</html>`;
}

/**
 * 云函数入口 - 导出为 Word 文档（.doc 格式）
 */
exports.main = async (event, context) => {
  try {
    const { startDate, endDate, projectName } = event;
    console.log('[exportWord] 开始导出', { startDate, endDate, projectName });
    
    if (!startDate || !endDate) {
      return { success: false, error: '请选择开始和结束日期' };
    }
    
    // 查询日志数据
    const db = cloud.database();
    const _ = db.command;
    const query = {
      date: _.gte(startDate).and(_.lte(endDate)),
    };
    if (projectName) {
      query.projectName = projectName;
    }
    
    const res = await db.collection('logs')
      .where(query)
      .orderBy('date', 'asc')
      .get();
    
    const logs = res.data;
    console.log('[exportWord] 查到', logs.length, '条日志');
    
    if (logs.length === 0) {
      return { success: false, error: '所选日期范围内没有日志数据' };
    }
    
    // 生成 Word HTML 内容
    const htmlContent = generateFullHTML(logs);
    
    // 保存到临时文件（.doc 后缀，Word 能直接打开）
    const tmpDir = os.tmpdir();
    const fileName = `施工日志_${startDate}_${endDate}.doc`;
    const filePath = path.join(tmpDir, fileName);
    
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log('[exportWord] 文件已生成', filePath, fs.statSync(filePath).size, 'bytes');
    
    // 上传到云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath: `exports/word/${fileName}`,
      fileContent: fs.readFileSync(filePath),
    });
    
    console.log('[exportWord] 已上传到云存储', uploadRes.fileID);
    
    // 获取临时下载链接
    const dlRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID],
    });
    
    const fileUrl = dlRes.fileList[0].tempFileURL;
    console.log('[exportWord] 导出成功');
    
    return {
      success: true,
      fileUrl,
      fileID: uploadRes.fileID,
      fileName,
      count: logs.length,
    };
    
  } catch (err) {
    console.error('[exportWord] 导出失败', err);
    return {
      success: false,
      error: err.message || '导出失败',
    };
  }
};
