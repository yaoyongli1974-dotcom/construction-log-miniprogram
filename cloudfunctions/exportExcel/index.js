const cloud = require('wx-server-sdk');
const XLSX = require('xlsx');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 生成单条日志的标准施工日志 Excel 表格
 * 使用合并单元格模拟国家标准施工日志模板（表 A5）
 */
function createLogSheet(wb, log) {
  const content = log.content || {};
  
  // 生产情况记录文本
  let production = content.constructionContent || '';
  if (content.personnelCount) {
    production += (production ? '\n' : '') + `投入施工人员 ${content.personnelCount} 人`;
  }
  if (content.machineryList && content.machineryList.length > 0) {
    const mStr = content.machineryList.map(m => `${m.type} ${m.count}台`).join('；');
    production += (production ? '\n' : '') + mStr;
  }
  if (content.progressPercent !== undefined && content.progressPercent !== null) {
    production += (production ? '\n' : '') + `当日进度 ${content.progressPercent}%`;
  }
  
  // 技术质量安全工作记录文本
  let qa = '';
  if (content.qualityCheck) qa += content.qualityCheck;
  if (content.safetyCheck) qa += (qa ? '\n' : '') + content.safetyCheck;
  if (content.issues) qa += (qa ? '\n' : '') + '存在问题：' + content.issues;
  if (content.nextPlan) qa += (qa ? '\n' : '') + '明日计划：' + content.nextPlan;

  // 定义表格数据（8行 x 6列）
  const sheetData = [
    // 第1行：标题行（合并居中）
    ['施 工 日 志', '', '', '', '', ''],
    // 第2行：项目名称 + 编号（同一行，编号靠右）
    [{ v: '项目名称：' + (log.projectName || ''), s: { font: { bold: true } } }, '', '', '', '编　号：', '表 A5'],
    // 第3行：日期 | 值 | 施工部位 | 值
    ['日　期', log.date || '', '施工部位', log.projectName || '', '', ''],
    // 第4行：天气 | 值 | 风力 | 空 | 最高最低温度 | 空
    ['天气情况', log.weather || '', '风　力', '', '最高/最低温度', ''],
    // 第5行：突发事件（跨列）
    ['突发事件', '无', '', '', '', ''],
    // 第6-7行：生产情况记录（大区域，标题+内容分两行）
    [
      { v: '生产情况记录：（施工项目内容、机械作业、班组生产、生产存在问题等）', s: { font: { bold: false, sz: 10 } } },
      '', '', '', '', ''
    ],
    [
      { v: production || '(无)', s: { alignment: { wrapText: true, vertical: 'top' }, font: { sz: 11 } } },
      '', '', '', '', ''
    ],
    // 第8-9行：技术质量安全工作记录（大区域）
    [
      { v: '技术质量安全工作记录：（技术质量安全活动、问题、检查验收情况等）', s: { font: { bold: false, sz: 10 } } },
      '', '', '', '', ''
    ],
    [
      { v: qa || '(无)', s: { alignment: { wrapText: true, vertical: 'top' }, font: { sz: 11 } } },
      '', '', '', '', ''
    ],
    // 第10行：签名行（2列：建造师 + 记录人）
    [
      { v: '建造师（项目经理）', s: { alignment: { horizontal: 'center' } } },
      '',
      { v: '记　录　人', s: { alignment: { horizontal: 'center' } } },
      '', '', ''
    ],
    // 第11行：底部说明
    [{ 
      v: '本表由施工单位填写，建设单位、城建档案馆和施工单位各保存一份。', 
      s: { font: { sz: 9, color: { rgb: '666666' } } }
    }, '', '', '', '', '']
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // ===== 合并单元格 =====
  ws['!merges'] = [
    // 标题行合并
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    // 第1行：项目名称占 A-C，编号横线占 D-E
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },
    // 日期行
    { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } },
    { s: { r: 2, c: 3 }, e: { r: 2, c: 5 } },
    // 天气行
    { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    // 突发事件
    { s: { r: 4, c: 1 }, e: { r: 4, c: 5 } },
    // 生产情况记录标题
    { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } },
    // 生产情况记录内容
    { s: { r: 6, c: 0 }, e: { r: 6, c: 5 } },
    // 质量安全标题
    { s: { r: 7, c: 0 }, e: { r: 7, c: 5 } },
    // 质量安全内容
    { s: { r: 8, c: 0 }, e: { r: 8, c: 5 } },
    // 签名行（2列：建造师占 A-C，记录人占 D-F）
    { s: { r: 9, c: 0 }, e: { r: 9, c: 2 } },
    { s: { r: 9, c: 3 }, e: { r: 9, c: 5 } },
    // 底部说明
    { s: { r: 10, c: 0 }, e: { r: 10, c: 5 } }
  ];
  
  // ===== 列宽 =====
  ws['!cols'] = [
    { wch: 14 },   // A: 标签列
    { wch: 16 },   // B: 值列
    { wch: 12 },   // C: 标签列2
    { wch: 20 },   // D: 值列2
    { wch: 14 },   // E: 标签列3
    { wch: 10 },   // F: 值列3
  ];
  
  // ===== 行高 =====
  ws['!rows'] = [
    { hpt: 36 },     // 行0: 标题（大字）
    { hpt: 18 },     // 行1: 编号
    { hpt: 22 },     // 行2: 日期/部位
    { hpt: 22 },     // 行3: 天气/风力
    { hpt: 20 },     // 行4: 突发事件
    { hpt: 18 },     // 行5: 生产情况标题
    { hpt: 120 },    // 行6: 生产情况内容（高行）
    { hpt: 18 },     // 行7: 质量安全标题
    { hpt: 100 },    // 行8: 质量安全内容（高行）
    { hpt: 24 },     // 行9: 签名行
    { hpt: 18 }      // 行10: 说明
  ];
  
  // ===== 全局单元格样式 =====
  applyCellStyles(ws);

  // 标题特殊样式
  const titleCell = ws['A1'];
  if (titleCell) {
    titleCell.s = {
      font: { name: 'SimHei', bold: true, sz: 20, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'FFFFFF' } }
    };
  }

  // 添加到工作簿
  const sheetName = log.date || '日志';
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel sheet名最长31字符
  
  return ws;
}

// 应用通用单元格样式（边框 + 对齐）
function applyCellStyles(ws) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      if (!ws[addr].s) ws[addr].s = {};
      
      // 边框
      ws[addr].s.border = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };
      
      // 默认垂直居中
      if (!ws[addr].s.alignment) {
        ws[addr].s.alignment = { vertical: 'center', wrapText: false };
      }
    }
  }
}

exports.main = async (event, context) => {
  const { startDate, endDate } = event;
  
  console.log('[exportExcel] 开始导出模板格式', startDate, endDate);
  
  try {
    // 查询日志
    const query = {
      date: _.gte(startDate).lte(endDate)
    };
    
    const res = await db.collection('logs')
      .where(query)
      .orderBy('date', 'asc')
      .get();
    
    const logs = res.data;
    console.log('[exportExcel] 查询到', logs.length, '条日志');
    
    if (logs.length === 0) {
      return { success: false, message: '所选日期范围内没有日志' };
    }
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 每条日志生成一个 Sheet（标准施工日志表格）
    logs.forEach(log => {
      createLogSheet(wb, log);
    });
    
    // 写入 buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 上传云存储
    const fileName = `export/excel/${startDate}_${endDate}.xlsx`;
    const fileRes = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: buffer
    });
    
    console.log('[exportExcel] 文件已上传', fileRes.fileID);
    
    return {
      success: true,
      fileID: fileRes.fileID,
      count: logs.length,
      format: 'template'
    };
  } catch (err) {
    console.error('[exportExcel] 失败', err);
    return { success: false, message: err.message };
  }
};
