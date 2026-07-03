const cloud = require('wx-server-sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ============================================================
// 工具函数
// ============================================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 构建生产情况记录文本（HTML 格式）*/
function buildProductionHtml(c) {
  const parts = [];
  if (c.constructionContent) parts.push('<p style="margin:0 0 6px 0;">' + escapeHtml(c.constructionContent) + '</p>');
  if (c.personnelCount) parts.push('<p style="margin:0 0 6px 0;">投入施工人员：' + escapeHtml(String(c.personnelCount)) + ' 人</p>');
  if (c.machineryList && c.machineryList.length > 0) {
    const m = c.machineryList.map(function(x) { return escapeHtml(x.type) + ' ' + x.count + '台'; }).join('；');
    parts.push('<p style="margin:0 0 6px 0;">主要机械：' + m + '</p>');
  }
  if (c.progressPercent !== undefined && c.progressPercent !== null) {
    parts.push('<p style="margin:0 0 6px 0;">当日进度完成：' + c.progressPercent + '%</p>');
  }
  return parts.join('') || '<p style="margin:0;">（无）</p>';
}

/** 构建技术质量安全工作记录文本（HTML 格式）*/
function buildQAHtml(c) {
  const parts = [];
  if (c.qualityCheck) parts.push('<p style="margin:0 0 6px 0;"><b>【质量检查】</b>' + escapeHtml(c.qualityCheck) + '</p>');
  if (c.safetyCheck) parts.push('<p style="margin:0 0 6px 0;"><b>【安全检查】</b>' + escapeHtml(c.safetyCheck) + '</p>');
  if (c.issues) parts.push('<p style="margin:0 0 6px 0;"><b>【存在问题及处理情况】</b><br>' + escapeHtml(c.issues).replace(/\n/g, '<br>') + '</p>');
  if (c.nextPlan) parts.push('<p style="margin:0 0 6px 0;"><b>【明日计划安排】</b><br>' + escapeHtml(c.nextPlan).replace(/\n/g, '<br>') + '</p>');
  return parts.join('') || '<p style="margin:0;">无</p>';
}

// ============================================================
// 构建单条日志的完整 HTML（样式对齐 Excel 导出）
// ============================================================
function buildLogHtml(log) {
  var c = log.content || {};
  var projectName = log.projectName || '未填写';
  var productionHtml = buildProductionHtml(c);
  var qaHtml = buildQAHtml(c);

  // 灰色背景（对齐 Excel 的 #F5F5F5）
  var bgGray = 'background-color:#F5F5F5;';
  var borderStyle = 'border:1px solid #000000;';
  var tableStyle = 'width:100%;border-collapse:collapse;font-size:11pt;' + borderStyle;

  return '\
<div style="page-break-inside:avoid;">\
  <!-- 标题 -->\
  <p style="text-align:center;font-family:黑体;font-size:22pt;font-weight:bold;margin:20px 0 10px 0;">施 工 日 志</p>\
  <!-- 项目信息行 -->\
  <table cellpadding="0" cellspacing="0" style="' + tableStyle + 'margin-bottom:0;">\
    <tr>\
      <td colspan="3" style="font-family:宋体;font-size:11pt;padding:8px 12px;' + borderStyle + '">项目名称：<b>' + escapeHtml(projectName) + '</b></td>\
      <td colspan="3" style="font-family:宋体;font-size:11pt;padding:8px 12px;text-align:right;' + borderStyle + '">编　　号：　　　　　　表 A5</td>\
    </tr>\
  </table>\
  <!-- 主表格 -->\
  <table cellpadding="0" cellspacing="0" style="' + tableStyle + 'margin-top:0;">\
    <!-- 第1行：日期 | 施工部位 -->\
    <tr style="height:25pt;">\
      <td style="width:12%;font-family:宋体;font-size:11pt;font-weight:bold;text-align:center;' + bgGray + borderStyle + '">日　　期</td>\
      <td style="width:18%;font-family:仿宋;font-size:11pt;text-align:center;' + borderStyle + '">' + escapeHtml(log.date || '') + '</td>\
      <td style="width:12%;font-family:宋体;font-size:11pt;font-weight:bold;text-align:center;' + bgGray + borderStyle + '">施工部位</td>\
      <td colspan="3" style="width:58%;font-family:仿宋;font-size:11pt;padding:4px 8px;' + borderStyle + '">' + escapeHtml(c.constructionSite || '') + '</td>\
    </tr>\
    <!-- 第2行：天气 | 风力 | 温度 -->\
    <tr style="height:25pt;">\
      <td style="font-family:宋体;font-size:11pt;font-weight:bold;text-align:center;' + bgGray + borderStyle + '">天气情况</td>\
      <td style="font-family:仿宋;font-size:11pt;text-align:center;' + borderStyle + '">' + escapeHtml(log.weather || '') + '</td>\
      <td style="font-family:宋体;font-size:11pt;font-weight:bold;text-align:center;' + bgGray + borderStyle + '">风　　力</td>\
      <td style="font-family:仿宋;font-size:11pt;text-align:center;' + borderStyle + '">' + escapeHtml(c.wind || '') + '</td>\
      <td style="font-family:宋体;font-size:11pt;font-weight:bold;text-align:center;' + bgGray + borderStyle + '">最高/最低温</td>\
      <td style="font-family:仿宋;font-size:11pt;text-align:center;' + borderStyle + '">' + escapeHtml(c.temperature || '') + '</td>\
    </tr>\
    <!-- 第3行：突发事件 -->\
    <tr style="height:28pt;">\
      <td style="font-family:宋体;font-size:11pt;font-weight:bold;text-align:center;' + bgGray + borderStyle + '">突发事件</td>\
      <td colspan="5" style="font-family:仿宋;font-size:11pt;padding:4px 8px;' + borderStyle + '">' + escapeHtml(c.emergency || '无') + '</td>\
    </tr>\
    <!-- 第4行：生产情况记录 标题 -->\
    <tr style="height:20pt;">\
      <td colspan="6" style="font-family:黑体;font-size:11pt;font-weight:bold;padding:4px 8px;' + bgGray + borderStyle + '">一、生产情况记录（施工内容、班组作业、执行情况）：</td>\
    </tr>\
    <!-- 第5行：生产情况记录 内容 -->\
    <tr style="height:140pt;">\
      <td colspan="6" style="font-family:仿宋;font-size:11pt;padding:8px 12px;vertical-align:top;' + borderStyle + '">' + productionHtml + '</td>\
    </tr>\
    <!-- 第6行：技术质量安全工作记录 标题 -->\
    <tr style="height:20pt;">\
      <td colspan="6" style="font-family:黑体;font-size:11pt;font-weight:bold;padding:4px 8px;' + bgGray + borderStyle + '">二、技术质量安全工作记录（技术交底、质量验收、安全活动、检查情况）：</td>\
    </tr>\
    <!-- 第7行：技术质量安全工作记录 内容 -->\
    <tr style="height:160pt;">\
      <td colspan="6" style="font-family:仿宋;font-size:11pt;padding:8px 12px;vertical-align:top;' + borderStyle + '">' + qaHtml + '</td>\
    </tr>\
    <!-- 第8行：签名行 -->\
    <tr style="height:30pt;">\
      <td colspan="6" style="font-family:仿宋;font-size:11pt;padding:4px 12px;' + borderStyle + '">\
        <span style="display:inline-block;width:48%;">建造师（项目经理）：________________</span>\
        <span style="display:inline-block;width:48%;text-align:right;">记录人：________________</span>\
      </td>\
    </tr>\
  </table>\
  <!-- 底部说明 -->\
  <p style="text-align:center;font-family:宋体;font-size:9pt;color:#666666;margin:10px 0 20px 0;">本表由施工单位填写，建设单位、城建档案馆和施工单位各保存一份。</p>\
</div>\
<hr style="page-break-after:always;border:none;margin:0;padding:0;">';
}

// ============================================================
// 云函数入口
// ============================================================
exports.main = async function(event, context) {
  try {
    var startDate = event.startDate;
    var endDate = event.endDate;
    var projectName = event.projectName;
    var logIds = event.logIds;
    console.log('[exportWord] 开始导出', { startDate: startDate, endDate: endDate, projectName: projectName, logIds: logIds });

    // 查询日志数据
    var db = cloud.database();
    var _ = db.command;
    var query;

    if (logIds && logIds.length > 0) {
      query = db.collection('logs').where({ _id: _.in(logIds) });
    } else {
      if (!startDate || !endDate) {
        return { success: false, message: '请选择开始和结束日期' };
      }
      var where = {
        date: _.gte(startDate).and(_.lte(endDate))
      };
      if (projectName) {
        where.projectName = projectName;
      }
      query = db.collection('logs').where(where);
    }

    var res = await query.orderBy('date', 'asc').get();
    var logs = res.data || [];
    console.log('[exportWord] 查到', logs.length, '条日志');

    if (logs.length === 0) {
      return { success: false, message: '所选范围内没有日志数据' };
    }

    // 构建完整 HTML
    var htmlParts = logs.map(function(log, i) {
      var html = buildLogHtml(log);
      // 最后一条去掉分页符
      if (i === logs.length - 1) {
        html = html.replace(/<hr style="page-break-after:always[^"]*"[^>]*>/g, '');
      }
      return html;
    });

    var fullHtml = '<!DOCTYPE html>\n\
<html xmlns:o="urn:schemas-microsoft-com:office:office"\n\
      xmlns:w="urn:schemas-microsoft-com:office:word"\n\
      xmlns="http://www.w3.org/TR/REC-html40">\n\
<head>\n\
  <meta charset="utf-8">\n\
  <meta name="ProgId" content="Word.Document">\n\
  <meta name="Generator" content="Microsoft Word 15">\n\
  <!--[if gte mso 9]>\n\
  <xml>\n\
    <w:WordDocument>\n\
      <w:View>Print</w:View>\n\
      <w:Zoom>100</w:Zoom>\n\
      <w:DoNotOptimizeForBrowser/>\n\
    </w:WordDocument>\n\
  </xml>\n\
  <![endif]-->\n\
  <style>\n\
    @page { margin: 1.5cm 1.5cm 1.5cm 1.5cm; size: A4; }\n\
    body { font-family: 仿宋, "FangSong", serif; font-size: 11pt; }\n\
    p { margin: 4px 0; }\n\
    table { border-collapse: collapse; width: 100%; }\n\
    td { border: 1px solid #000; padding: 4px 8px; vertical-align: middle; }\n\
    .title { text-align: center; font-family: 黑体, "SimHei", sans-serif; font-size: 22pt; font-weight: bold; margin: 20px 0 10px 0; }\n\
  </style>\n\
</head>\n\
<body>\n' + htmlParts.join('\n') + '\n</body>\n</html>';

    // 保存为 .doc 文件
    var dates = logs.map(function(l) { return l.date; }).sort();
    var fileDateRange = logs.length === 1 ? logs[0].date : (dates[0] + '_' + dates[dates.length - 1]);
    var fileName = '施工日志_' + fileDateRange + '.doc';
    var filePath = path.join(os.tmpdir(), fileName);

    fs.writeFileSync(filePath, fullHtml, 'utf8');
    console.log('[exportWord] 已生成', filePath, fs.statSync(filePath).size, 'bytes');

    // 上传云存储
    var uploadRes = await cloud.uploadFile({
      cloudPath: 'exports/word/' + fileName,
      fileContent: fs.readFileSync(filePath)
    });

    // 获取下载链接
    var dlRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID]
    });

    console.log('[exportWord] 导出成功');
    return {
      success: true,
      fileUrl: dlRes.fileList[0].tempFileURL,
      fileID: uploadRes.fileID,
      fileName: fileName,
      count: logs.length
    };

  } catch (err) {
    console.error('[exportWord] 导出失败', err);
    return { success: false, message: err.message || '导出失败' };
  }
};
