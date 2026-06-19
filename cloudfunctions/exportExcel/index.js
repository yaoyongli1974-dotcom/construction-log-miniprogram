const cloud = require('wx-server-sdk');
const ExcelJS = require('exceljs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 导出施工日志为 Excel（每条日志一个 Sheet，格式匹配标准施工日志模板）
 */
exports.main = async (event, context) => {
  const { startDate, endDate } = event;
  const db = cloud.database();
  const _ = db.command;

  // 1. 查询日志数据
  let query = db.collection('logs');
  const where = {};
  if (startDate) where.date = _.gte(startDate);
  if (endDate) where.date = where.date ? where.date.and(_.lte(endDate)) : _.lte(endDate);
  if (Object.keys(where).length > 0) query = query.where(where);

  const res = await query.orderBy('date', 'asc').limit(100).get();
  const logs = res.data || [];

  if (logs.length === 0) {
    return { success: false, message: '所选日期范围内没有日志' };
  }

  // 2. 创建工作簿
  const workbook = new ExcelJS.Workbook();

  // 3. 为每条日志创建一个 Sheet
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const content = log.content || {};

    const ws = workbook.addWorksheet(
      logs.length === 1 ? '施工日志' : `${i + 1}-${log.date}`
    );

    // ===== 设置列宽 =====
    ws.columns = [
      { width: 10 },  // A - 标签列
      { width: 14 },  // B - 值列
      { width: 6 },   // C - 间隔
      { width: 20 },  // D - 标签/值列
      { width: 12 },  // E - 值列
      { width: 14 },  // F - 值列
    ];

    // ===== 设置行高 =====
    ws.getRow(1).height = 30;   // 标题行
    ws.getRow(2).height = 22;   // 表头行
    ws.getRow(3).height = 24;   // 日期/部位行
    ws.getRow(4).height = 24;   // 天气/风力/温度行
    ws.getRow(5).height = 22;   // 突发事件行
    ws.getRow(6).height = 22;   // 生产情况标题行
    ws.getRow(7).height = 80;   // 生产情况内容行
    ws.getRow(8).height = 22;   // 质量安全标题行
    ws.getRow(9).height = 60;   // 质量安全内容行
    ws.getRow(10).height = 30;  // 签名行

    // ===== 第1行：标题 "施 工 日 志"（合并 A1:F1）=====
    mergeAndStyle(ws, 1, 1, 1, 6, '施 工 日 志', {
      font: { name: '宋体', size: 18, bold: true },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'none' }
    });

    // ===== 第2行：项目名称 + 编号 + 表A5 =====
    setCellValue(ws, 2, 1, '项目名称：', { bold: true });
    setCellValue(ws, 2, 2, '', { underline: true });  // 留空让用户填
    setCellValue(ws, 2, 5, '编　号：', { bold: true });
    setCellValue(ws, 2, 6, '', { underline: true });  // 留空让用户填
    setCellValue(ws, 2, 7, '表 A5', { bold: true });  // G2 放表号

    // ===== 第3行：日期 | 施工部位 =====
    setCellLabelValue(ws, 3, 1, 3, 2, '日　期', log.date || '');
    setCellLabelValue(ws, 3, 3, 3, 4, '施工部位', content.constructionSite || '');

    // 合并 E3:F3 作为施工部位的值区域
    mergeCellsQuietly(ws, 3, 5, 3, 6);

    // ===== 第4行：天气情况 | 风力 | 最高/最低温度 =====
    setCellLabelValue(ws, 4, 1, 4, 2, '天气情况', log.weather || '');
    setCellLabelValue(ws, 4, 3, 4, 4, '风　力', content.wind || '');
    setCellLabelValue(ws, 4, 5, 4, 6, '最高/最低温度', content.temperature || '');

    // ===== 第5行：突发事件（合并 B5:F5）=====
    setCellLabelValue(ws, 5, 1, 5, 2, '突发事件', content.emergency || '无');
    mergeCellsQuietly(ws, 5, 3, 5, 6);

    // ===== 第6行：生产情况记录（标题，合并 A6:F6）=====
    mergeAndStyle(ws, 6, 1, 6, 6, '生产情况记录：', {
      font: { name: '宋体', size: 11, bold: true },
      alignment: { horizontal: 'left', vertical: 'middle' }
    });

    // ===== 第7行：生产情况记录（内容，合并 A7:F7）=====
    let productionText = buildProductionText(content);
    mergeAndStyle(ws, 7, 1, 7, 6, productionText || '（无）', {
      font: { name: '宋体', size: 11 },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true }
    });

    // ===== 第8行：技术质量安全工作记录（标题，合并 A8:F8）=====
    mergeAndStyle(ws, 8, 1, 8, 6, '技术质量安全工作记录：', {
      font: { name: '宋体', size: 11, bold: true },
      alignment: { horizontal: 'left', vertical: 'middle' }
    });

    // ===== 第9行：技术质量安全工作记录（内容，合并 A9:F9）=====
    let qaText = buildQAText(content);
    mergeAndStyle(ws, 9, 1, 9, 6, qaText || '（无）', {
      font: { name: '宋体', size: 11 },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true }
    });

    // ===== 第10行：签名行（建造师 + 记录人 同一行）=====
    const signRow = 10;
    // A10:C10 建造师
    mergeAndStyle(ws, signRow, 1, signRow, 3, '建造师（项目经理）：', {
      font: { name: '宋体', size: 11 },
      alignment: { horizontal: 'right', vertical: 'middle' }
    });
    // D10 填姓名（留空）
    setCellValue(ws, signRow, 4, '', { underline: true });
    // E10:F10 记录人
    mergeAndStyle(ws, signRow, 5, signRow, 6, '记录人：', {
      font: { name: '宋体', size: 11 },
      alignment: { horizontal: 'right', vertical: 'middle' }
    });

    // ===== 第11行：底部说明 =====
    mergeAndStyle(ws, 11, 1, 11, 6, '本表由施工单位填写，建设单位、城建档案馆和施工单位各保存一份。', {
      font: { name: '宋体', size: 9, color: { argb: 'FF666666' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    });

    // ===== 给标签列添加边框和背景色 =====
    applyTableBorders(ws);
  }

  // 4. 写入缓冲区并上传云存储
  const buffer = await workbook.xlsx.writeBuffer();

  const uploadRes = await cloud.uploadFile({
    cloudPath: `exports/excel/施工日志_${startDate}_${endDate}.xlsx`,
    fileContent: Buffer.from(buffer)
  });

  // 获取临时下载链接
  const dlRes = await cloud.getTempFileURL({
    fileList: [uploadRes.fileID]
  });

  console.log('[exportExcel] 导出成功，共', logs.length, '条');

  return {
    success: true,
    fileID: uploadRes.fileID,
    fileUrl: dlRes.fileList[0].tempFileURL,
    count: logs.length
  };
};

// ==================== 工具函数 ====================

/**
 * 构建生产情况记录文本
 */
function buildProductionText(content) {
  const parts = [];
  if (content.constructionContent) parts.push(content.constructionContent);
  if (content.personnelCount) parts.push(`投入施工人员 ${content.personnelCount} 人`);
  if (content.machineryList && content.machineryList.length > 0) {
    parts.push(content.machineryList.map(m => `${m.type} ${m.count}台`).join('；'));
  }
  if (content.progressPercent !== undefined && content.progressPercent !== null) {
    parts.push(`当日进度 ${content.progressPercent}%`);
  }
  return parts.join('\n');
}

/**
 * 构建技术质量安全工作记录文本
 */
function buildQAText(content) {
  const parts = [];
  if (content.qualityCheck) parts.push(content.qualityCheck);
  if (content.safetyCheck) parts.push(content.safetyCheck);
  if (content.issues) parts.push(`存在问题：${content.issues}`);
  if (content.nextPlan) parts.push(`明日计划：${content.nextPlan}`);
  return parts.join('\n') || '无';
}

/**
 * 合并单元格并设置样式
 */
function mergeAndStyle(ws, startRow, startCol, endRow, endCol, value, styleOpts) {
  // 先设置合并
  if (startRow !== endRow || startCol !== endCol) {
    ws.mergeCells(startRow, startCol, endRow, endCol);
  }

  const cell = ws.getCell(startRow, startCol);
  cell.value = value;

  // 应用样式
  if (styleOpts.font) cell.font = styleOpts.font;
  if (styleOpts.alignment) cell.alignment = styleOpts.alignment;
  if (styleOpts.fill) cell.fill = styleOpts.fill;

  // 默认加边框
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  return cell;
}

/**
 * 安静地合并单元格（忽略已合并的错误）
 */
function mergeCellsQuietly(ws, r1, c1, r2, c2) {
  try {
    ws.mergeCells(r1, c1, r2, c2);
  } catch (e) {
    // 已合并则跳过
  }
}

/**
 * 设置单个单元格的值和基本样式
 */
function setCellValue(ws, row, col, value, opts) {
  const cell = ws.getCell(row, col);
  cell.value = value;
  if (opts) {
    if (opts.bold) {
      cell.font = { name: '宋体', size: 11, bold: true };
    }
    if (opts.underline) {
      cell.font = cell.font || {};
      cell.font.underline = true;
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF000000' } }
      };
    }
  }
}

/**
 * 设置标签-值对（两个相邻单元格）
 */
function setCellLabelValue(ws, labelRow, labelCol, valueRow, valueCol, label, value) {
  // 标签单元格（灰色背景+居中+粗体）
  const labelCell = ws.getCell(labelRow, labelCol);
  labelCell.value = label;
  labelCell.font = { name: '宋体', size: 11, bold: true };
  labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

  // 值单元格
  const valueCell = ws.getCell(valueRow, valueCol);
  valueCell.value = value;
  valueCell.font = { name: '宋体', size: 11 };
  valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
}

/**
 * 给表格所有有内容的单元格加上边框
 */
function applyTableBorders(ws) {
  const borderStyle = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // 遍历第3-10行，给所有单元格加边框
  for (let r = 3; r <= 11; r++) {
    for (let c = 1; c <= 6; c++) {
      const cell = ws.getCell(r, c);
      if (!cell.value && r < 11) {
        cell.value = '';
      }
      cell.border = borderStyle;
    }
  }
}
