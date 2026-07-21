const cloud = require('wx-server-sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const docx = require('docx');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const {
  Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun,
  WidthType, AlignmentType, VerticalAlign, BorderStyle, ImageRun
} = docx;

// ============================================================
// 工具函数
// ============================================================

function safeStr(v) {
  if (v === undefined || v === null) return '';
  return String(v);
}

/**
 * 根据文件头魔数判断图片真实类型（比文件名后缀可靠）
 * 返回 { extension, mimeType }；文件名兜底
 */
function getImageType(buffer, fileID) {
  if (buffer && buffer.length >= 4) {
    const b0 = buffer[0], b1 = buffer[1], b2 = buffer[2], b3 = buffer[3];
    if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47) return { extension: 'png', mimeType: 'png' }; // PNG
    if (b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF) return { extension: 'jpeg', mimeType: 'jpg' }; // JPEG
    if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) return { extension: 'gif', mimeType: 'gif' }; // GIF
    if (b0 === 0x42 && b1 === 0x4D) return { extension: 'bmp', mimeType: 'bmp' }; // BMP
  }
  // 兜底：用文件名后缀
  const ext = (fileID.split('.').pop() || 'jpg').toLowerCase();
  const extension = ext === 'png' ? 'png' : (ext === 'gif' ? 'gif' : (ext === 'bmp' ? 'bmp' : 'jpeg'));
  const mimeType = extension === 'png' ? 'png' : (extension === 'gif' ? 'gif' : (extension === 'bmp' ? 'bmp' : 'jpg'));
  return { extension, mimeType };
}

/** 下载云存储图片，带单张超时保护 */
async function downloadImageBuffer(fileID) {
  try {
    const res = await Promise.race([
      cloud.downloadFile({ fileID }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('下载超时')), 15000))
    ]);
    // 关键：wx-server-sdk 的 downloadFile 直接返回 fileContent(Buffer)，
    // 而客户端 wx.cloud.downloadFile 返回 tempFilePath，两者都要兼容
    let buffer = null;
    if (res && res.fileContent) {
      buffer = res.fileContent;
    } else if (res && res.tempFilePath) {
      buffer = fs.readFileSync(res.tempFilePath);
    }
    if (!buffer || buffer.length === 0) {
      throw new Error('下载内容为空');
    }
    const typeInfo = getImageType(buffer, fileID);
    return { buffer, extension: typeInfo.extension, mimeType: typeInfo.mimeType };
  } catch (e) {
    console.error('[exportWord] 图片下载失败', fileID, e.message);
    return null;
  }
}

/** 构建生产情况记录文本 */
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

/** 构建技术质量安全工作记录文本 */
function buildQAText(c) {
  const parts = [];
  if (c.qualityCheck) parts.push('【质量检查】' + c.qualityCheck);
  if (c.safetyCheck) parts.push('【安全检查】' + c.safetyCheck);
  if (c.issues) parts.push('【存在问题】' + c.issues);
  if (c.nextPlan) parts.push('【明日计划】' + c.nextPlan);
  return parts.join('\n') || '无';
}

/** 创建图片 Run（不依赖 doc 引用，避免 TDZ）*/
function makeImageRun(img) {
  return new ImageRun({
    data: img.buffer,
    transformation: { width: 280, height: 210 },
    type: img.mimeType
  });
}

/** 标准单元格 */
function cell(text, opts = {}) {
  const children = [new Paragraph({
    text: safeStr(text),
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: 40, after: 40 }
  })];

  const shading = opts.gray ? { fill: 'F5F5F5' } : undefined;

  return new TableCell({
    children,
    shading,
    verticalAlign: opts.valign || VerticalAlign.CENTER,
    columnSpan: opts.colSpan || 1,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 6, color: '000000' }
    }
  });
}

/** 构建单条日志表格 */
function buildLogTable(log, images) {
  const c = log.content || {};
  const projectName = log.projectName || '未填写';

  const titleRow = new TableRow({
    children: [cell('施 工 日 志', { align: AlignmentType.CENTER, colSpan: 6 })]
  });

  const projectRow = new TableRow({
    children: [
      cell('项目名称：', { gray: true, align: AlignmentType.RIGHT }),
      cell(projectName, { colSpan: 2 }),
      cell('编　号：', { gray: true, align: AlignmentType.RIGHT }),
      cell('　　　　　　表 A5', { align: AlignmentType.RIGHT, colSpan: 2 })
    ]
  });

  const dateRow = new TableRow({
    children: [
      cell('日　期', { gray: true, align: AlignmentType.CENTER }),
      cell(log.date || '', { align: AlignmentType.CENTER, colSpan: 2 }),
      cell('施工部位', { gray: true, align: AlignmentType.CENTER }),
      cell(c.constructionSite || '', { colSpan: 2 })
    ]
  });

  const weatherRow = new TableRow({
    children: [
      cell('天气情况', { gray: true, align: AlignmentType.CENTER }),
      cell(log.weather || '', { align: AlignmentType.CENTER }),
      cell('风　力', { gray: true, align: AlignmentType.CENTER }),
      cell(c.wind || '', { align: AlignmentType.CENTER }),
      cell('最高/最低温', { gray: true, align: AlignmentType.CENTER }),
      cell(c.temperature || '', { align: AlignmentType.CENTER })
    ]
  });

  const emergencyRow = new TableRow({
    children: [cell('突发事件：' + (c.emergency || '无'), { colSpan: 6, valign: VerticalAlign.TOP })]
  });

  const prodTitleRow = new TableRow({
    children: [cell('一、生产情况记录（施工内容、班组作业、执行情况）：', { colSpan: 6, gray: true })]
  });

  const prodBodyRow = new TableRow({
    children: [cell(buildProductionText(c), { colSpan: 6, valign: VerticalAlign.TOP })]
  });

  const qaTitleRow = new TableRow({
    children: [cell('二、技术质量安全工作记录（技术交底、质量验收、安全活动、检查情况）：', { colSpan: 6, gray: true })]
  });

  const qaBodyRow = new TableRow({
    children: [cell(buildQAText(c), { colSpan: 6, valign: VerticalAlign.TOP })]
  });

  // 签名行延后到照片之后（表格末尾）添加

  const rows = [
    titleRow, projectRow, dateRow, weatherRow, emergencyRow,
    prodTitleRow, prodBodyRow, qaTitleRow, qaBodyRow
  ];

  // 现场照片区域
  if (images && images.length > 0) {
    rows.push(new TableRow({
      children: [cell('三、现场照片', { colSpan: 6, gray: true })]
    }));

    for (let i = 0; i < images.length; i += 2) {
      const leftImg = images[i];
      const rightImg = images[i + 1];

      const leftChildren = [
        new Paragraph({ children: [makeImageRun(leftImg)], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
        new Paragraph({ text: leftImg.caption, alignment: AlignmentType.CENTER, spacing: { before: 40 }, size: 18 })
      ];
      const leftCell = new TableCell({
        children: leftChildren,
        columnSpan: 3,
        verticalAlign: VerticalAlign.TOP,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 6, color: '000000' }
        }
      });

      const rightChildren = [];
      if (rightImg) {
        rightChildren.push(new Paragraph({ children: [makeImageRun(rightImg)], alignment: AlignmentType.CENTER, spacing: { after: 60 } }));
        rightChildren.push(new Paragraph({ text: rightImg.caption, alignment: AlignmentType.CENTER, spacing: { before: 40 }, size: 18 }));
      }
      const rightCell = new TableCell({
        children: rightChildren,
        columnSpan: 3,
        verticalAlign: VerticalAlign.TOP,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
          right: { style: BorderStyle.SINGLE, size: 6, color: '000000' }
        }
      });

      rows.push(new TableRow({ children: [leftCell, rightCell] }));
    }
  }

  // 签名行放在每条日志表格末尾（照片之后）
  rows.push(new TableRow({
    children: [cell('建造师（项目经理）：　　　　　　　　　　记录人：', { colSpan: 6 })]
  }));

  // 底部说明（每条日志最末行：签名行之后）
  const footCell = new TableCell({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 20, after: 20 },
      children: [new TextRun({
        text: '本表由施工单位填写，建设单位、城建档案馆和施工单位各保存一份。',
        size: 18,
        color: '666666'
      })]
    })],
    columnSpan: 6,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 6, color: '000000' }
    }
  });
  rows.push(new TableRow({ children: [footCell] }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows
  });
}

// ============================================================
// 云函数入口
// ============================================================
exports.main = async (event, context) => {
  try {
    const { startDate, endDate, projectName, logIds } = event;
    const { OPENID } = cloud.getWXContext();
    const openid = OPENID;
    console.log('[exportWord] 开始导出', { startDate, endDate, projectName, logIds, openid });

    if (!openid) {
      return { success: false, message: '用户未登录' };
    }

    const db = cloud.database();
    const _ = db.command;
    let query;

    // 兼容：云函数创建的记录无 _openid，仅 userId 有值；小程序端创建则有 _openid
    const ownerFilter = { $or: [{ _openid: openid }, { userId: openid }] };

    if (logIds && logIds.length > 0) {
      query = db.collection('logs').where({ _id: _.in(logIds), ...ownerFilter });
    } else {
      if (!startDate || !endDate) {
        return { success: false, message: '请选择开始和结束日期' };
      }
      const where = { ...ownerFilter, date: _.gte(startDate).and(_.lte(endDate)) };
      if (projectName) where.projectName = projectName;
      query = db.collection('logs').where(where);
    }

    const res = await query.orderBy('date', 'asc').get();
    const logs = res.data || [];
    console.log('[exportWord] 查到', logs.length, '条日志');

    if (logs.length === 0) {
      return { success: false, message: '所选范围内没有日志数据' };
    }

    // 预下载所有照片
    const allFileIds = [];
    logs.forEach(l => {
      (l.images || []).forEach(f => {
        if (f && allFileIds.indexOf(f) < 0) allFileIds.push(f);
      });
    });

    const imgCache = {};
    if (allFileIds.length > 0) {
      await Promise.all(allFileIds.map(async (f) => {
        const r = await downloadImageBuffer(f);
        if (r) imgCache[f] = r;
      }));
      console.log('[exportWord] 已下载', Object.keys(imgCache).length, '张照片');
    }

    // 构建每条日志的图片列表（带标注）
    const logImagesMap = {};
    logs.forEach(log => {
      const c = log.content || {};
      logImagesMap[log._id] = (log.images || []).map((f, idx) => {
        const img = imgCache[f];
        if (!img) return null;
        return {
          buffer: img.buffer,
          extension: img.extension,
          mimeType: img.mimeType,
          caption: '图' + (idx + 1) + '：' + (log.date || '') + ' ' + (c.constructionSite || '')
        };
      }).filter(Boolean);
    });

    // 构建 Word 文档：每条日志独立成页（一个 section 对应一条日志，
    // section 之间默认分页，单条内容过多会自动续页，下一条始终从新页开始）
    const doc = new Document({
      sections: logs.map((log) => ({
        properties: {
          page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } }
        },
        children: [ buildLogTable(log, logImagesMap[log._id]) ]
      }))
    });

    const buffer = await Packer.toBuffer(doc);
    const dates = logs.map(l => l.date).sort();
    const fileDateRange = logs.length === 1 ? logs[0].date : (dates[0] + '_' + dates[dates.length - 1]);
    const fileName = '施工日志_' + fileDateRange + '.docx';
    const filePath = path.join(os.tmpdir(), fileName);

    fs.writeFileSync(filePath, buffer);
    console.log('[exportWord] 已生成', filePath, buffer.length, 'bytes');

    const uploadRes = await cloud.uploadFile({
      cloudPath: 'exports/word/' + fileName,
      fileContent: fs.readFileSync(filePath)
    });

    const dlRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID]
    });

    return {
      success: true,
      fileUrl: dlRes.fileList[0].tempFileURL,
      fileID: uploadRes.fileID,
      fileName: fileName,
      count: logs.length,
      photoCount: Object.keys(imgCache).length,
      logsWithImages: logs.filter(l => (l.images || []).length > 0).length
    };

  } catch (err) {
    console.error('[exportWord] 导出失败', err);
    return { success: false, message: err.message || '导出失败' };
  }
};
