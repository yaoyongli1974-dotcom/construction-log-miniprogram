// utils/template.js - 日志模板

const templates = [
  {
    id: '1',
    name: '标准施工日志',
    description: '适用于一般施工项目',
    icon: '📝',
    data: {
      content: {
        constructionContent: '',
        personnelCount: 0,
        machineryCount: 0,
        progressPercent: 0,
        qualityCheck: '',
        safetyCheck: '',
        issues: '',
        nextPlan: ''
      }
    }
  },
  {
    id: '2',
    name: '土建工程日志',
    description: '适用于土建施工项目',
    icon: '🏗️',
    data: {
      content: {
        constructionContent: '今日主要进行土方开挖、基础施工等工作',
        personnelCount: 30,
        machineryCount: 5,
        progressPercent: 0,
        qualityCheck: '检查基坑尺寸、标高是否符合设计要求',
        safetyCheck: '检查基坑支护、临边防护是否到位',
        issues: '',
        nextPlan: '明日计划继续基础施工，注意天气变化'
      }
    }
  },
  {
    id: '3',
    name: '装修工程日志',
    description: '适用于室内装修项目',
    icon: '🎨',
    data: {
      content: {
        constructionContent: '今日主要进行墙面处理、地面铺装等工作',
        personnelCount: 15,
        machineryCount: 2,
        progressPercent: 0,
        qualityCheck: '检查墙面平整度、地面铺装质量',
        safetyCheck: '检查临时用电、脚手架搭设是否规范',
        issues: '',
        nextPlan: '明日计划继续装修施工，注意材料进场安排'
      }
    }
  },
  {
    id: '4',
    name: '安装工程日志',
    description: '适用于设备安装项目',
    icon: '🔧',
    data: {
      content: {
        constructionContent: '今日主要进行管道安装、设备调试等工作',
        personnelCount: 20,
        machineryCount: 3,
        progressPercent: 0,
        qualityCheck: '检查管道连接、设备安装质量',
        safetyCheck: '检查高空作业、临时用电安全措施',
        issues: '',
        nextPlan: '明日计划继续安装工作，注意设备保护'
      }
    }
  }
];

// 获取所有模板
function getTemplates() {
  return templates;
}

// 根据ID获取模板
function getTemplateById(id) {
  return templates.find(t => t.id === id);
}

// 应用模板
function applyTemplate(logData, templateId) {
  const template = getTemplateById(templateId);
  if (!template) return logData;
  
  return {
    ...logData,
    content: {
      ...logData.content,
      ...template.data.content
    }
  };
}

module.exports = {
  getTemplates,
  getTemplateById,
  applyTemplate
};
