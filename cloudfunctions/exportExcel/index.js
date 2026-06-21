const cloud = require('wx-server-sdk');
const ExcelJS = require('exceljs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 导出施工日志为 Excel（每条日志一个 Sheet，格式完全对齐 Word 导出）
 * 表格结构：6列，精确匹配标准施工日志表 A5 格式
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
  workbook.creator = '施工日志小程序';
  workbook.created = new Date();

  // 3. 为每条日志创建一个 Sheet
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const c = log.content || {};

    const ws = workbook.addWorksheet(
      logs.length === 1 ? '施工日志' : `${i + 1}-${log.date}`
    );

    // ===== 页面设置：A4 =====
    ws.pageSetup = {
      paperSize: 9,
      orientation: 'portrait',
      margins: { left: 0.59, right: 0.59, top: 0.59, bottom: 0.59, header: 0.2, footer: 0.2 },
      fitToPage: true,
      fitToWidth: 1,
    };

    // ===== 列宽（6列，匹配 Word 表格百分比）=====
    ws.columns = [
      { width: 10 },  // A - 10%
      { width: 14 },  // B - 15%
      { width: 10 },  // C - 10%
      { width: 18 },  // D - 20%
      { width: 14 },  // E - 15%
      { width: 26 },  // F - 30%
    ];

    // ===== 行高（pt）=====
    const RP = { title: 40, info: 20, event: 28, secTitle: 16, body: 140, qa: 160, sign: 30, footer: 20 };

    // ===== 第1行：标题 =====
    merge(ws, 1, 1, 1, 6);
    cell(ws, 1, 1, '施 工 日 志', {
      font: { name: '黑体', size: 22, bold: true },
      align: 'center',
    });
    ws.getRow(1).height = RP.title;

    // ===== 第2行：项目名称 | 编号 + 表A5 =====
    merge(ws, 2, 1, 2, 2);
    cell(ws, 2, 1, '项目名称：', { bold: true, bg: 'F5F5F5', align: 'right' });
    merge(ws, 2, 3, 2, 4);
    cell(ws, 2, 3, log.projectName || '', { align: 'left' });
    cell(ws, 2, 5, '编　号：', { bold: true, align: 'right' });
    // F2：编号值 + 表A5（靠右）
    const f2 = ws.getCell(2, 6);
    f2.value = '　　　　　　表 A5';
    f2.font = { name: '宋体', size: 11, bold: true };
    f2.alignment = { horizontal: 'right', vertical: 'middle' };
    border(f2);
    ws.getRow(2).height = RP.info;

    // ===== 第3行：日期 | 施工部位 =====
    cell(ws, 3, 1, '日　期', { bold: true, bg: 'F5F5F5', align: 'center' });
    merge(ws, 3, 2, 3, 3);
    cell(ws, 3, 2, log.date || '', { align: 'center' });
    cell(ws, 3, 4, '施工部位', { bold: true, bg: 'F5F5F5', align: 'center' });
    merge(ws, 3, 5, 3, 6);
    cell(ws, 3, 5, c.constructionSite || '', { align: 'left' });
    ws.getRow(3).height = RP.info;

    // ===== 第4行：天气 | 风力 | 温度 =====
    cell(ws, 4, 1, '天气情况', { bold: true, bg: 'F5F5F5', align: 'center' });
    cell(ws, 4, 2, log.weather || '', { align: 'center' });
    cell(ws, 4, 3, '风　力', { bold: true, bg: 'F5F5F5', align: 'center' });
    cell(ws, 4, 4, c.wind || '', { align: 'center' });
    cell(ws, 4, 5, '最高/最低温', { bold: true, bg: 'F5F5F5', align: 'center' });
    cell(ws, 4, 6, c.temperature || '', { align: 'center' });
    ws.getRow(4).height = RP.info;

    // ===== 第5行：突发事件 =====
    merge(ws, 5, 1, 5, 6);
    cell(ws, 5, 1, '突发事件：' + (c.emergency || '无'), {
      align: 'left',
      wrap: true,
    });
    ws.getRow(5).height = RP.event;

    // ===== 第6行：生产情况记录 标题 =====
    merge(ws, 6, 1, 6, 6);
    cell(ws, 6, 1, '一、生产情况记录（施工内容、班组作业、执行情况）：', {
      font: { name: '黑体', size: 11, bold: true },
      align: 'left',
    });
    ws.getRow(6).height = RP.secTitle;

    // ===== 第7行：生产情况记录 内容 =====
    merge(ws, 7, 1, 7, 6);
    cell(ws, 7, 1, buildProductionText(c), {
      font: { name: '仿宋' },
      align: 'left',
      valign: 'top',
      wrap: true,
    });
    ws.getRow(7).height = RP.body;

    // ===== 第8行：技术质量安全 标题 =====
    merge(ws, 8, 1, 8, 6);
    cell(ws, 8, 1, '二、技术质量安全工作记录（技术交底、质量验收、安全活动、检查情况）：', {
      font: { name: '黑体', size: 11, bold: true },
      align: 'left',
    });
    ws.getRow(8).height = RP.secTitle;

    // ===== 第9行：技术质量安全 内容 =====
    merge(ws, 9, 1, 9, 6);
    cell(ws, 9, 1, buildQAText(c), {
      align: 'left',
      valign: 'top',
      wrap: true,
    });
    ws.getRow(9).height = RP.qa;

    // ===== 第10行：签名行 =====
    merge(ws, 10, 1, 10, 6);
    cell(ws, 10, 1, '建造师（项目经理）：　　　　　　　　　　记录人：', {
      align: 'left',
      valign: 'middle',
    });
    ws.getRow(10).height = RP.sign;

    // ===== 第11行：底部说明 =====
    merge(ws, 11, 1, 11, 6);
    const foot = ws.getCell(11, 1);
    foot.value = '本表由施工单位填写，建设单位、城建档案馆和施工单位各保存一份。';
    foot.font = { name: '宋体', size: 9, color: { argb: 'FF666666' } };
    foot.alignment = { horizontal: 'center', vertical: 'middle' };
    border(foot);
    ws.getRow(11).height = RP.footer;

    // ===== 所有单元格加边框（兜底）=====
    for (let r = 1; r <= 11; r++) {
      for (let c = 1; c <= 6; c++) {
        border(ws.getCell(r, c));
      }
    }
  }

  // 4. 写入缓冲区并上传云存储
  const buffer = await workbook.xlsx.writeBuffer();

  const uploadRes = await cloud.uploadFile({
    cloudPath: `exports/excel/施工日志_${startDate}_${endDate}.xlsx`,
    fileContent: Buffer.from(buffer)
  });

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

// ============================================================
// 工具函数
// ============================================================

/** 合并单元格（忽略已合并错误）*/
function merge(ws, r1, c1, r2, c2) {
  try { ws.mergeCells(r1, c1, r2, c2); } catch (e) {}
}

/** 设置单元格（默认字体：宋体 11号）*/
function cell(ws, row, col, value, opts = {}) {
  const c = ws.getCell(row, col);
  c.value = value;
  // 默认字体
  const font = { name: '宋体', size: 11 };
  if (opts.font) Object.assign(font, opts.font);
  if (opts.bold) font.bold = true;
  c.font = font;
  if (opts.bg) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + opts.bg } };
  c.alignment = {
    horizontal: opts.align || 'left',
    vertical: opts.valign || 'middle',
    wrapText: !!opts.wrap,
  };
  border(c);
  return c;
}

/** 加全边框 */
function border(c) {
  const s = { style: 'thin', color: { argb: 'FF000000' } };
  c.border = { top: s, left: s, bottom: s, right: s };
}

/** 构建生产情况记录文本（换行分隔）*/
function buildProductionText(c) {
  const parts = [];
  if (c.constructionContent) parts.push(c.constructionContent);
  if (c.personnelCount) parts.push('投入施工人员：' + c.personnelCount + ' 人');
  if (c.machineryList && c.machineryList.length > 0) {
    parts.push(c.machineryList.map(m => m.type + ' ' + m.count + '台').join('；'));
  }
  if (c.progressPercent !== undefined && c.progressPercent !== null) {
    parts.push('当日进度 ' + c.progressPercent + '%');
  }
  return parts.join('\n') || '（无）';
}

/** 构建技术质量安全工作记录文本（换行分隔）*/
function buildQAText(c) {
  const parts = [];
  if (c.qualityCheck) parts.push('【质量检查】' + c.qualityCheck);
  if (c.safetyCheck) parts.push('【安全检查】' + c.safetyCheck);
  if (c.issues) parts.push('【存在问题】' + c.issues);
  if (c.nextPlan) parts.push('【明日计划】' + c.nextPlan);
  return parts.join('\n') || '无';
}
