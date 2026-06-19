const cloud = require('wx-server-sdk');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 标准施工日志 Excel 模板列
const COLUMNS = [
  '日期',
  '天气',
  '项目名称',
  '施工内容',
  '施工人数',
  '机械台班',
  '进度（%）',
  '质量检查',
  '安全检查',
  '存在问题',
  '明日计划',
  '现场照片'
];

// 格式化日志数据为 Excel 行
function formatLogToRow(log) {
  const content = log.content || {};
  
  // 格式化机械台班
  let machineryStr = '';
  if (content.machineryList && content.machineryList.length > 0) {
    machineryStr = content.machineryList.map(m => `${m.type} ${m.count}台班`).join('；');
  }
  
  // 格式化照片链接
  let imagesStr = '';
  if (log.images && log.images.length > 0) {
    imagesStr = log.images.join('\n');
  }
  
  return [
    log.date || '',
    log.weather || '',
    log.projectName || '',
    content.constructionContent || '',
    content.personnelCount || 0,
    machineryStr,
    content.progressPercent || 0,
    content.qualityCheck || '',
    content.safetyCheck || '',
    content.issues || '',
    content.nextPlan || '',
    imagesStr
  ];
}

exports.main = async (event, context) => {
  const { startDate, endDate, cloudPath } = event;
  
  console.log('[exportExcel] 开始导出', startDate, endDate);
  
  try {
    // 查询符合条件的日志
    const query = {
      date: _.gte(startDate).lte(endDate)
    };
    
    const res = await db.collection('logs')
      .where(query)
      .orderBy('date', 'desc')
      .get();
    
    const logs = res.data;
    console.log('[exportExcel] 查询到', logs.length, '条日志');
    
    if (logs.length === 0) {
      return { success: false, message: '所选日期范围内没有日志' };
    }
    
    // 构建 Excel 数据
    const excelData = [
      COLUMNS,  // 表头
      ...logs.map(log => formatLogToRow(log))
    ];
    
    // 生成 Excel 文件
    const buffer = xlsx.build([{ name: '施工日志', data: excelData }]);
    
    // 保存到云存储
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
