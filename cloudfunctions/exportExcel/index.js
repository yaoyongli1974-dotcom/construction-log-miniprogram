const cloud = require('wx-server-sdk');
const ExcelJS = require('exceljs');
const fs = require('fs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 导出施工日志为 Excel（每条日志一个 Sheet，格式完全对齐 Word 导出）
 * 表格结构：6列，精确匹配标准施工日志表 A5 格式
 * 现场照片统一放置在每个 Sheet 最下方
 */
exports.main = async (event, context) => {
  const { startDate, endDate, logIds } = event;
  const { OPENID } = cloud.getWXContext();
  const openid = OPENID;
  if (!openid) {
    return { success: false, message: '用户未登录' };
  }

  const db = cloud.database();
  const _ = db.command;

  // 1. 查询日志数据（必须带归属过滤，防止越权访问他人数据）
  // 兼容：云函数创建的记录无 _openid，仅 userId 有值；小程序端创建则有 _openid
  const ownerFilter = { $or: [{ _openid: openid }, { userId: openid }] };
  let query;
  if (logIds && logIds.length > 0) {
    // 按 ID 列表查询
    query = db.collection('logs').where({ _id: _.in(logIds), ...ownerFilter });
  } else {
    // 按日期范围查询
    const where = { ...ownerFilter };
    if (startDate) where.date = _.gte(startDate);
    if (endDate) where.date = where.date ? where.date.and(_.lte(endDate)) : _.lte(endDate);
    query = db.collection('logs').where(where);
  }

  const res = await query.orderBy('date', 'asc').limit(100).get();
  const logs = res.data || [];

  if (logs.length === 0) {
    return { success: false, message: '所选日期范围内没有日志' };
  }

  // 2. 预下载所有照片（全局缓存，避免重复下载）
  const allFileIds = [];
  logs.forEach(l => {
    (l.images || []).forEach(f => {
      if (f && allFileIds.indexOf(f) < 0) allFileIds.push(f);
    });
  });
  const imgCache = {};
  if (allFileIds.length > 0) {
    await Promise.all(allFileIds.map(async (f) => {
      try {
        const dl = await Promise.race([
          cloud.downloadFile({ fileID: f }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('下载超时')), 15000))
        ]);
        // 兼容 wx-server-sdk(fileContent) 与客户端(tempFilePath)
        let buffer = null;
        if (dl && dl.fileContent) buffer = dl.fileContent;
        else if (dl && dl.tempFilePath) buffer = fs.readFileSync(dl.tempFilePath);
        if (!buffer || buffer.length === 0) throw new Error('下载内容为空');
        const typeInfo = getImageType(buffer, f);
        imgCache[f] = { buffer, extension: typeInfo.extension };
      } catch (e) {
        console.error('[exportExcel] 图片下载失败', f, e.message);
      }
    }));
    console.log('[exportExcel] 已下载', Object.keys(imgCache).length, '张照片');
  }

  // 3. 创建工作簿
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '施工日志小程序';
  workbook.created = new Date();

  // 4. 为每条日志创建一个 Sheet
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

    // ============================================================
    // 现场照片区域（统一放置在 Sheet 最下方，签名行之前）
    // ============================================================
    const logImages = (log.images || [])
      .map((f, idx) => {
        const im = imgCache[f];
        if (!im) return null;
        return {
          buffer: im.buffer,
          extension: im.extension,
          caption: `图${idx + 1}：${log.date || ''} ${c.constructionSite || ''}`,
        };
      })
      .filter(Boolean);

    let lastContentRow = 9; // 照片之前最后一行（技术质量安全内容）

    if (logImages.length > 0) {
      // 标题行（紧跟内容之后，避免留空行）
      const photoTitleRow = 10;
      merge(ws, photoTitleRow, 1, photoTitleRow, 6);
      cell(ws, photoTitleRow, 1, '三、现场照片', {
        font: { name: '黑体', size: 11, bold: true },
        align: 'left',
      });
      ws.getRow(photoTitleRow).height = 20;

      const imgW = 280;   // 显示宽度(px)
      const imgH = 150;   // 显示高度(px) 约 10 行
      const colStarts = [0.1, 3.3];   // 两列：左 / 右（紧贴不重叠）
      const blockRows = 12;           // 每组图（含下方标注）占用的行数
      let curRow = photoTitleRow + 1; // 第一张图的顶部行(1-based)

      for (let k = 0; k < logImages.length; k++) {
        const im = logImages[k];
        const colPos = colStarts[k % 2];

        const imageId = workbook.addImage({
          buffer: im.buffer,
          extension: im.extension,
        });
        // 同一组两张图共用同一个 curRow（并排）；标注紧贴图片下方
        ws.addImage(imageId, {
          tl: { col: colPos, row: curRow - 1 + 0.1 },  // 0-based，轻微下移
          ext: { width: imgW, height: imgH },
        });

        // 标注说明（图片正下方最后一行）
        const capRow = curRow + blockRows - 1;
        const capCell = ws.getCell(capRow, Math.floor(colPos) + 1);
        capCell.value = im.caption;
        capCell.font = { name: '宋体', size: 9, color: { argb: 'FF666666' } };
        capCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        ws.getRow(capRow).height = 16;

        // 一组（两张）放完，或已到末尾，才换到下一行
        const isPairEnd = (k + 1) % 2 === 0;
        const isLast = k === logImages.length - 1;
        if (isPairEnd || isLast) {
          curRow += blockRows;
        }
      }
      lastContentRow = curRow - 1; // 最后一张图标注所在行
    }

    // ===== 签名行（照片之后）=====
    const signRow = lastContentRow + 2;
    merge(ws, signRow, 1, signRow, 6);
    cell(ws, signRow, 1, '建造师（项目经理）：　　　　　　　　　　记录人：', {
      align: 'left',
      valign: 'middle',
    });
    ws.getRow(signRow).height = RP.sign;

    // ===== 底部说明（移到每条日志最后一行：签名行之后）=====
    const footRow = signRow + 2;
    merge(ws, footRow, 1, footRow, 6);
    const foot = ws.getCell(footRow, 1);
    foot.value = '本表由施工单位填写，建设单位、城建档案馆和施工单位各保存一份。';
    foot.font = { name: '宋体', size: 9, color: { argb: 'FF666666' } };
    foot.alignment = { horizontal: 'center', vertical: 'middle' };
    border(foot);
    ws.getRow(footRow).height = RP.footer;

    // ===== 所有单元格加边框（兜底，直到底部说明行）=====
    for (let r = 1; r <= footRow; r++) {
      for (let c = 1; c <= 6; c++) {
        border(ws.getCell(r, c));
      }
    }
  }

  // 5. 写入缓冲区并上传云存储
  const buffer = await workbook.xlsx.writeBuffer();

  const fileName = logIds && logIds.length > 0
    ? `施工日志_选中${logs.length}条.xlsx`
    : `施工日志_${startDate}_${endDate}.xlsx`;

  const uploadRes = await cloud.uploadFile({
    cloudPath: `exports/excel/${fileName}`,
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
    count: logs.length,
    photoCount: Object.keys(imgCache).length,
    logsWithImages: logs.filter(l => (l.images || []).length > 0).length
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

/** 根据文件头魔数判断图片真实类型（比文件名后缀可靠）*/
function getImageType(buffer, fileID) {
  if (buffer && buffer.length >= 4) {
    const b0 = buffer[0], b1 = buffer[1], b2 = buffer[2], b3 = buffer[3];
    if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47) return { extension: 'png' };
    if (b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF) return { extension: 'jpeg' };
    if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) return { extension: 'gif' };
    if (b0 === 0x42 && b1 === 0x4D) return { extension: 'bmp' };
  }
  const ext = (fileID.split('.').pop() || 'jpg').toLowerCase();
  return { extension: ext === 'png' ? 'png' : (ext === 'gif' ? 'gif' : (ext === 'bmp' ? 'bmp' : 'jpeg')) };
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
