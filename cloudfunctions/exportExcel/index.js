const cloud = require('wx-server-sdk');
const ExcelJS = require('exceljs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 主入口：读取 template.xlsx，填充日志数据
 */
exports.main = async (event, context) => {
  const { startDate, endDate } = event;

  // 1. 查询日志数据
  let query = db.collection('logs');
  if (startDate) query = query.where({ date: _.gte(startDate) });
  if (endDate) query = query.where({ date: _.lte(endDate) });
  const res = await query.orderBy('date', 'desc').limit(100).get();
  const logs = res.data || [];

  if (logs.length === 0) {
    return { success: false, message: '所选日期范围内没有日志' };
  }

  // 2. 读取模板文件
  const path = require('path');
  const templatePath = path.join(__dirname, 'template.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  // 3. 为每条日志填充一个 Sheet
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const content = log.content || {};

    let ws;
    if (i === 0) {
      ws = workbook.getWorksheet(1);
      ws.name = logs.length === 1 ? '施工日志' : `第${i + 1}条`;
    } else {
      // 复制模板 Sheet
      const templateWs = workbook.getWorksheet(1);
      ws = workbook.addWorksheet(`第${i + 1}条`);
      copySheet(templateWs, ws);
    }

    // ===== 只填充日志内容，项目名称和编号留空让用户自己填 =====

    // 行3：日期（B3）、施工部位（D3）
    setCell(ws, 3, 2, log.date || '');  // B3 日期
    setCell(ws, 3, 4, log.projectName || '');  // D3 施工部位

    // 行4：天气（B4）
    setCell(ws, 4, 2, log.weather || '');  // B4 天气

    // 行6-7：生产情况记录（A7 内容行）
    let production = content.constructionContent || '';
    if (content.personnelCount) {
      production += (production ? '\n' : '') + `投入施工人员 ${content.personnelCount} 人`;
    }
    if (content.machineryList && content.machineryList.length > 0) {
      production += (production ? '\n' : '') + content.machineryList.map(m => `${m.type} ${m.count}台`).join('；');
    }
    if (content.progressPercent !== undefined && content.progressPercent !== null) {
      production += (production ? '\n' : '') + `当日进度 ${content.progressPercent}%`;
    }
    setCell(ws, 7, 1, production || '（无）');  // A7 生产情况内容

    // 行8-9：技术质量安全工作记录（A9 内容行）
    let qa = '';
    if (content.qualityCheck) qa += content.qualityCheck;
    if (content.safetyCheck) qa += (qa ? '\n' : '') + content.safetyCheck;
    if (content.issues) qa += (qa ? '\n' : '') + '存在问题：' + content.issues;
    if (content.nextPlan) qa += (qa ? '\n' : '') + '明日计划：' + content.nextPlan;
    setCell(ws, 9, 1, qa || '（无）');  // A9 质量安全内容
  }

  // 4. 如果多条日志，删除原始模板 Sheet
  if (logs.length > 1) {
    try { workbook.removeWorksheet(1); } catch (e) {}
  }

  // 5. 写入缓冲区并上传云存储
  const buffer = await workbook.xlsx.writeBuffer();

  const uploadRes = await cloud.uploadFile({
    cloudPath: `exports/excel/施工日志_${new Date().toISOString().slice(0, 10)}.xlsx`,
    fileContent: Buffer.from(buffer)
  });

  return {
    success: true,
    fileID: uploadRes.fileID,
    count: logs.length
  };
};

/**
 * 安全设置单元格值
 */
function setCell(ws, row, col, value) {
  try {
    const cell = ws.getCell(row, col);
    cell.value = value;
  } catch (e) {
    console.warn(`setCell 失败 row=${row} col=${col}:`, e.message);
  }
}

/**
 * 复制 Sheet（保留样式、合并单元格、列宽、行高）
 */
function copySheet(src, dst) {
  // 复制列宽
  if (src.columns) {
    dst.columns = src.columns.map(col => ({
      width: col.width,
      hidden: col.hidden
    }));
  }

  // 复制每一行
  src.eachRow((row, rowNum) => {
    const dstRow = dst.getRow(rowNum);
    dstRow.height = row.height;
    dstRow.hidden = row.hidden;

    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      const dstCell = dstRow.getCell(colNum);
      dstCell.value = cell.value;
      if (cell.style) dstCell.style = { ...cell.style };
      if (cell.alignment) dstCell.alignment = { ...cell.alignment };
    });
  });

  // 复制合并单元格
  if (src._merges && Array.isArray(src._merges)) {
    src._merges.forEach(m => {
      dst.mergeCells(m.top, m.left, m.bottom, m.right);
    });
  }

  // A4 打印设置
  dst.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    margins: { left: 12, right: 12, top: 12, bottom: 12 }
  };
}
