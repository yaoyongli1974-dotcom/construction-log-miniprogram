const cloud = require('wx-server-sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell,
  AlignmentType, WidthType,
  TableLayoutType, BorderStyle,
  convertMillimetersToTwip,
} = require('docx');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ============================================================
// 页面常量（A4纸 210mm × 297mm）
// ============================================================
const MM = (val) => Math.round(convertMillimetersToTwip(val));

// 页边距 15mm（最大化表格空间）
const PAGE_MARGIN = MM(15);
const PAGE_W = MM(210);
const PAGE_H = MM(297);
// A4可用高度 ≈ 267mm，减去边距后约 237mm 给内容
// 标题+项目信息+底部说明 ≈ 30mm → 剩余 ~207mm 给表格

// 行高常量（twips）— 精心计算确保一条日志在1页内
const ROW_H = {
  info:    MM(7),     // 信息行（日期/天气）
  event:   MM(12),    // 突发事件
  title:   MM(6),     // 小节标题行
  body:    MM(62),    // 生产情况记录区（压缩到62mm）
  qa:      MM(72),    // 技术质量安全区（压缩到72mm）
  sign:    MM(12),    // 签名行
};
// 表格总高 ≈ 7+7+12+6+62+6+72+12 = 184mm < 207mm ✅ 安全在1页内

// 边框样式
const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 创建单行文本段落
 */
function textPara(txt, opts = {}) {
  return new Paragraph({
    children: [new TextRun({
      text: txt || '',
      bold: !!opts.bold,
      font: opts.font || '仿宋',
      size: opts.size || 21,     // 小四号 10.5pt
      color: opts.color || '000000',
    })],
    spacing: { line: 300, after: 60 },  // 行距 + 段后间距
    alignment: opts.align || AlignmentType.LEFT,
  });
}

/**
 * 🔑 关键函数：将带换行的文本拆分为多个 Paragraph 数组
 * Word 的 TextRun 不支持 \n 换行，必须用多个 Paragraph 实现
 *
 * @param {string} text - 原始文本（可能含 \n 和 \n\n）
 * @param {Object} opts - 文本格式选项
 * @returns {Paragraph[]} - 段落数组
 */
function textToParagraphs(text, opts = {}) {
  if (!text) return [textPara(' ', opts)];

  const paragraphs = [];
  // 按 \n 分割，保留空行（\n\n 会产生空字符串项）
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i > 0 && line === '') {
      // 空行（\n\n 的情况）：插入一个空白段落作为段间距
      paragraphs.push(new Paragraph({
        children: [],
        spacing: { after: 120 },  // 更大的间距表示分段
        alignment: AlignmentType.LEFT,
      }));
    } else if (line !== '' || i === lines.length - 1) {
      // 非空行或最后一行的空串也输出
      paragraphs.push(textPara(line, opts));
    }
  }

  return paragraphs;
}

/**
 * 创建空行填充段落（用于撑高单元格）
 */
function fillLines(count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(new Paragraph({
      children: [new TextRun({ text: ' ', font: '仿宋', size: 21 })],
      spacing: { line: 300 },
    }));
  }
  return arr;
}

// ============================================================
// 单元格工厂
// ============================================================

function makeCell(opts = {}) {
  const {
    text = '',
    cols = 1,
    colWidthPct = null,
    bold = false,
    bg = false,
    minHeight = 0,
    vAlign = 'center',
    fillCount = 0,
    border = true,
    splitLines = false,  // 🔑 是否将 \n 拆分为多行
  } = opts;

  let children;

  if (Array.isArray(text)) {
    children = text;  // 直接传入的段落数组
  } else if (splitLines && text && text.includes('\n')) {
    // 将带换行的文本拆为多个段落
    children = textToParagraphs(text, { bold, font: bold ? '黑体' : '仿宋' });
  } else {
    children = [textPara(text, { bold, font: bold ? '黑体' : '仿宋' })];
  }

  // 追加填充空行（撑高度用）
  if (fillCount > 0) {
    children = children.concat(fillLines(fillCount));
  }

  // 计算宽度百分比
  let pct = colWidthPct;
  if (pct === null) {
    const avgPct = 100 / 6;
    pct = Math.round(avgPct * cols);
  }

  return new TableCell({
    children,
    width: { size: pct, type: WidthType.PERCENTAGE },
    columnSpan: cols,
    verticalAlign: vAlign,
    shading: bg ? { fill: 'E8E8E8', val: 'clear' } : undefined,
    borders: border ? BORDER : {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    ...(minHeight > 0 ? { rowHeight: { value: minHeight, rule: 'atLeast' } } : {}),
  });
}

// ---- 快捷创建方法 ----

/** 标签单元格（灰色背景、加粗）*/
function lbl(text, cols, widthPct) {
  return makeCell({ text, cols, colWidthPct: widthPct, bold: true, bg: true });
}

/** 值单元格 */
function val(text, cols, widthPct, extraOpts = {}) {
  return makeCell({ text, cols, colWidthPct: widthPct, ...extraOpts });
}

/** 全宽小节标题 */
function sectionTitle(text) {
  return makeCell({ text, cols: 6, colWidthPct: 100, bold: true, bg: true, font: '楷体' });
}

/** 全宽大文本区域（支持换行 + 固定高度 + 填充）*/
function bodyArea(text, height, fillLines) {
  return makeCell({
    text,
    cols: 6,
    colWidthPct: 100,
    minHeight: height,
    vAlign: 'top',
    fillCount: fillLines,
    splitLines: true,  // 🔑 启用换行分割
  });
}

// ============================================================
// 构建单条日志的表格
// ============================================================

function buildLogTable(log) {
  const c = log.content || {};

  // ---- 数据准备 ----
  // 生产情况记录（每项独立一行）
  const prodParts = [];
  if (c.constructionContent) prodParts.push(c.constructionContent);
  if (c.personnelCount) prodParts.push('投入施工人员：' + c.personnelCount + ' 人');
  if (c.machineryList && c.machineryList.length > 0) {
    prodParts.push('主要机械：' + c.machineryList.map(m => m.type + ' ' + m.count + '台').join('；'));
  }
  if (c.progressPercent !== undefined && c.progressPercent !== null) {
    prodParts.push('当日进度完成：' + c.progressPercent + '%');
  }

  // 技术质量安全工作记录
  const qaParts = [];
  if (c.qualityCheck) qaParts.push(c.qualityCheck);
  if (c.safetyCheck) qaParts.push(c.safetyCheck);
  if (c.issues) qaParts.push('存在问题及处理情况：\n' + c.issues);
  if (c.nextPlan) qaParts.push('明日计划安排：\n' + c.nextPlan);

  // 用 \n\n 双换行分隔不同部分（textToParagraphs 会识别为分段）
  const productionText = prodParts.join('\n\n');
  const qaText = qaParts.join('\n\n');

  // ---- 构建表格行 ----
  const rows = [];

  // 第1行：日期 | 值 | 施工部位 | 值(跨3列)
  rows.push(new TableRow({
    children: [
      lbl('日　期', 1, 10),
      val(log.date || '', 1, 15),
      lbl('施工部位', 1, 10),
      val(c.constructionSite || '', 3, 65),
    ],
    height: { value: ROW_H.info, rule: 'atLeast' },
  }));

  // 第2行：天气 | 值 | 风力 | 值 | 温度 | 值
  rows.push(new TableRow({
    children: [
      lbl('天气情况', 1, 10),
      val(log.weather || '', 1, 15),
      lbl('风　力', 1, 10),
      val(c.wind || '', 1, 20),
      lbl('最高/最低温', 1, 15),
      val(c.temperature || '', 1, 30),
    ],
    height: { value: ROW_H.info, rule: 'atLeast' },
  }));

  // 第3行：突发事件 | 值(跨5列)
  rows.push(new TableRow({
    children: [
      lbl('突发事件', 1, 10),
      val(c.emergency || '无', 5, 90),
    ],
    height: { value: ROW_H.event, rule: 'atLeast' },
  }));

  // 第4行：生产情况记录 标题
  rows.push(new TableRow({
    children: [
      sectionTitle('一、生产情况记录（施工内容、班组作业、执行情况）：'),
    ],
    height: { value: ROW_H.title, rule: 'atLeast' },
  }));

  // 第5行：生产情况记录 内容（🔑 splitLines=true 实现换行显示）
  rows.push(new TableRow({
    children: [
      bodyArea(productionText || ' ', ROW_H.body, 4),
    ],
  }));

  // 第6行：技术质量安全工作记录 标题
  rows.push(new TableRow({
    children: [
      sectionTitle('二、技术质量安全工作记录（技术交底、质量验收、安全活动、检查情况）：'),
    ],
    height: { value: ROW_H.title, rule: 'atLeast' },
  }));

  // 第7行：技术质量安全工作记录 内容（🔑 splitLines=true）
  rows.push(new TableRow({
    children: [
      bodyArea(qaText || ' ', ROW_H.qa, 6),
    ],
  }));

  // 第8行：签名行
  rows.push(new TableRow({
    children: [
      makeCell({
        text: [
          new Paragraph({
            children: [new TextRun({
              text: '建造师（项目经理）：________________    记录人：________________',
              font: '仿宋', size: 21,
            })],
            spacing: { line: 320 },
            alignment: AlignmentType.LEFT,
          }),
        ],
        cols: 6, colWidthPct: 100,
      }),
    ],
    height: { value: ROW_H.sign, rule: 'atLeast' },
  }));

  // 组装表格
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    borders: BORDER,
  });
}

// ============================================================
// 云函数入口
// ============================================================

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

    // ---- 构建文档 ----
    const docChildren = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // 标题
      docChildren.push(
        new Paragraph({
          children: [new TextRun({
            text: '施 工 日 志',
            bold: true, font: '黑体', size: 36,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 100 },
        })
      );

      // 项目信息行（左：项目名称 | 右：编号+表A5）
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: '项目名称：', bold: true, font: '宋体', size: 22 }),
            new TextRun({ text: log.projectName || '(未填写)', font: '宋体', size: 22 }),
            // 用大量全角空格把后面的内容推到右边
            new TextRun({ text: '\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000', font: '宋体', size: 22 }),
            new TextRun({ text: '编 号：', bold: true, font: '宋体', size: 22 }),
            new TextRun({ text: '\u3000\u3000\u3000\u3000\u3000', font: '宋体', size: 22 }),
            new TextRun({ text: '表 A5', bold: true, font: '宋体', size: 22 }),
          ],
          spacing: { before: 40, after: 60 },
        })
      );

      // 表格
      docChildren.push(buildLogTable(log));

      // 底部说明
      docChildren.push(
        new Paragraph({
          children: [new TextRun({
            text: '本表由施工单位填写，建设单位、城建档案馆各保存一份。',
            font: '宋体', size: 18,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 40 },
        })
      );

      // 分页（最后一条不加）
      if (i < logs.length - 1) {
        docChildren.push(new Paragraph({ pageBreakBefore: true }));
      }
    }

    // ---- 创建文档 ----
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: PAGE_MARGIN, bottom: PAGE_MARGIN,
              left: PAGE_MARGIN, right: PAGE_MARGIN,
            },
            size: { width: PAGE_W, height: PAGE_H },
          },
        },
        children: docChildren,
      }],
    });

    // ---- 生成并上传 ----
    const buffer = await Packer.toBuffer(doc);

    const fileName = `施工日志_${startDate}_${endDate}.docx`;
    const filePath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(filePath, buffer);

    console.log('[exportWord] 已生成', filePath, fs.statSync(filePath).size, 'bytes');

    // 上传云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath: `exports/word/${fileName}`,
      fileContent: fs.readFileSync(filePath),
    });

    // 获取下载链接
    const dlRes = await cloud.getTempFileURL({ fileList: [uploadRes.fileID] });

    console.log('[exportWord] 导出成功');

    return {
      success: true,
      fileUrl: dlRes.fileList[0].tempFileURL,
      fileID: uploadRes.fileID,
      fileName,
      count: logs.length,
    };

  } catch (err) {
    console.error('[exportWord] 导出失败', err);
    return { success: false, error: err.message || '导出失败' };
  }
};
