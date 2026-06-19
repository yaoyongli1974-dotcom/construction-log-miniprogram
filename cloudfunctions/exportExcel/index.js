const cloud = require('wx-server-sdk');
const XLSX = require('xlsx');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 标准施工日志表头（匹配国家标准模板）
const HEADER_ROW = [
  '日期', '天气', '施工部位',
  '生产情况记录\n（施工内容、机械作业、班组等）',
  '技术质量安全工作记录\n（质量检查、安全检查、问题、计划）'
];

// 格式化单条日志为数据行
function formatLogToRow(log) {
  const content = log.content || {};
  
  // 生产情况：施工内容 + 人数 + 机械 + 进度
  let production = content.constructionContent || '';
  if (content.personnelCount) {
    production += (production ? '\n' : '') + `投入施工人员 ${content.personnelCount} 人`;
  }
  if (content.machineryList && content.machineryList.length > 0) {
    const machineryStr = content.machineryList.map(m => `${m.type} ${m.count}台`).join('；');
    production += (production ? '\n' : '') + machineryStr;
  }
  if (content.progressPercent !== undefined && content.progressPercent !== null) {
    production += (production ? '\n' : '') + `进度 ${content.progressPercent}%`;
  }
  
  // 质量安全：质量 + 安全 + 问题 + 计划
  let qa = '';
  if (content.qualityCheck) qa += content.qualityCheck;
  if (content.safetyCheck) qa += (qa ? '\n' : '') + content.safetyCheck;
  if (content.issues) qa += (qa ? '\n存在问题：' : '存在问题：') + content.issues;
  if (content.nextPlan) qa += (qa ? '\n明日计划：' : '明日计划：') + content.nextPlan;
  
  return [
    log.date || '',
    log.weather || '',
    log.projectName || '',
    production,
    qa
  ];
}

exports.main = async (event, context) => {
  const { startDate, endDate } = event;
  
  console.log('[exportExcel] 开始导出', startDate, endDate);
  
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
    
    // 构建数据（表头 + 数据行）
    const excelData = [HEADER_ROW, ...logs.map(log => formatLogToRow(log))];
    
    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 12 },   // A: 日期
      { wch: 10 },   // B: 天气
      { wch: 20 },   // C: 施工部位
      { wch: 55 },   // D: 生产情况记录
      { wch: 50 },   // E: 技术质量安全
    ];
    
    // 设置行高（让内容行有足够空间）
    const rowHeights = {};
    for (let i = 1; i <= logs.length; i++) {
      rowHeights[i] = { hpt: 80 };  // 每行高度约80磅
    }
    ws['!rows'] = rowHeights;
    
    // 设置表头样式（加粗）
    if (!ws['!ref']) return { success: false, message: '生成表格失败' };
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: c });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: 'E8F4FD' } }
      };
    }
    
    // 设置所有单元格自动换行
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) continue;
        if (!ws[cellRef].s) ws[cellRef].s = {};
        ws[cellRef].s.alignment = { 
          vertical: 'top', 
          wrapText: true,
          ...(ws[cellRef].s.alignment || {})
        };
      }
    }
    
    // 设置边框
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) continue;
        if (!ws[cellRef].s) ws[cellRef].s = {};
        ws[cellRef].s.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
    
    // 创建工作簿并写入 buffer
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '施工日志');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 上传到云存储
    const fileName = `export/excel/${startDate}_${endDate}.xlsx`;
    const fileRes = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: buffer
    });
    
    console.log('[exportExcel] 文件已上传', fileRes.fileID);
    
    return {
      success: true,
      fileID: fileRes.fileID,
      count: logs.length
    };
  } catch (err) {
    console.error('[exportExcel] 失败', err);
    return { success: false, message: err.message };
  }
};
