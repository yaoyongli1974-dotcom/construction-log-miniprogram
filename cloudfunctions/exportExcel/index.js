const cloud = require('wx-server-sdk');
const ExcelJS = require('exceljs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 将 Excel 日期序列号转为 "YYYY-MM-DD" 字符串
 */
function excelDateToString(serial) {
  if (typeof serial !== 'number') return serial || '';
  const utc_days = Math.floor(serial - 25569);
  const date = new Date(utc_days * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
      // 复制模板 Sheet（通过克隆第一行和样式）
      const templateWs = workbook.getWorksheet(1);
      ws = workbook.addWorksheet(`第${i + 1}条`);
      copySheet(templateWs, ws);
    }

    // ===== 填充数据 =====
    // 行2：项目名称（A列）
    if (ws.getCell('A2').value && ws.getCell('A2').value.toString().includes('项目名称')) {
      ws.getCell('A2').value = '项目名称：' + (log.projectName || '');
    }

    // 行3：日期（B列）、施工部位（D列）
    const dateStr = excelDateToString(log.date) || log.date || '';
    safeSetCell(ws, 3, 2, dateStr);  // B3
    safeSetCell(ws, 3, 4, log.projectName || '');  // D3

    // 行4：天气（B列）
    safeSetCell(ws, 4, 2, log.weather || '');  // B4

    // 行6-7：生产情况记录
    let production = content.constructionContent || '';
    if (content.personnelCount) production += (production ? '\n' : '') + `投入施工人员 ${content.personnelCount} 人`;
    if (content.machineryList && content.machineryList.length > 0) {
      production += (production ? '\n' : '') + content.machineryList.map(m => `${m.type} ${m.count}台`).join('；');
    }
    if (content.progressPercent !== undefined && content.progressPercent !== null) {
      production += (production ? '\n' : '') + `当日进度 ${content.progressPercent}%`;
    }
    safeSetCell(ws, 7, 1, production || '（无）');  // A7（生产情况内容行）

    // 行8-9：技术质量安全工作记录
    let qa = '';
    if (content.qualityCheck) qa += content.qualityCheck;
    if (content.safetyCheck) qa += (qa ? '\n' : '') + content.safetyCheck;
    if (content.issues) qa += (qa ? '\n' : '') + '存在问题：' + content.issues;
    if (content.nextPlan) qa += (qa ? '\n' : '') + '明日计划：' + content.nextPlan;
    safeSetCell(ws, 9, 1, qa || '（无）');  // A9（质量安全内容行）
  }

  // 4. 写入缓冲区并上传云存储
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
 * 安全设置单元格值（处理合并单元格等情况）
 */
function safeSetCell(ws, row, col, value) {
  try {
    const cell = ws.getCell(row, col);
    cell.value = value;
  } catch (e) {
    // 如果设置失败（比如合并单元格），尝试用地址设置
    const colLetter = getColLetter(col);
    try {
      ws.getCell(`${colLetter}${row}`).value = value;
    } catch (e2) {
      console.warn(`无法设置单元格 ${colLetter}${row}:`, e2.message);
    }
  }
}

/**
 * 列号转字母（1 -> A, 2 -> B, ...）
 */
function getColLetter(col) {
  let letter = '';
  while (col > 0) {
    col--;
    letter = String.fromCharCode(65 + (col % 26)) + letter;
    col = Math.floor(col / 26);
  }
  return letter;
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
      // 复制样式
      if (cell.style) {
        dstCell.style = { ...cell.style };
      }
      // 复制对齐方式
      if (cell.alignment) {
        dstCell.alignment = { ...cell.alignment };
      }
    });
  });

  // 复制合并单元格
  if (src._merges && Array.isArray(src._merges)) {
    src._merges.forEach(m => {
      dst.mergeCells(m.top, m.left, m.bottom, m.right);
    });
  }

  // 页面设置（A4 打印）
  dst.pageSetup = {
    paperSize: 9,  // A4
    orientation: 'portrait',
    margins: { left: 12, right: 12, top: 12, bottom: 12 }
  };
}
