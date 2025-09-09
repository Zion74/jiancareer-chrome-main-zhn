// JianCareer Chrome Extension - Content Script
// 处理网页自动填写功能

class JianCareerContentScript {
  constructor() {
    this.isProcessing = false;
    this.supportedSites = {
      'zhipin.com': 'boss',
      'lagou.com': 'lagou',
      '51job.com': 'job51',
      'liepin.com': 'liepin',
      'linkedin.com': 'linkedin',
      'localhost': 'mock', // 支持本地测试页面
      '127.0.0.1': 'mock',
      'mock-form.html': 'mock'
    };
    
    this.fieldMappings = {
      boss: {
        name: 'input[name="name"], input[placeholder*="姓名"], input[placeholder*="真实姓名"]',
        phone: 'input[name="phone"], input[placeholder*="手机"], input[type="tel"]',
        email: 'input[name="email"], input[type="email"], input[placeholder*="邮箱"]',
        experience: 'input[name="experience"], select[name="experience"]',
        education: 'input[name="education"], select[name="education"]',
        resume: 'input[type="file"], textarea[name="resume"], textarea[placeholder*="简历"]'
      },
      lagou: {
        name: 'input[name="realName"], input[placeholder*="姓名"]',
        phone: 'input[name="phone"], input[placeholder*="手机号"]',
        email: 'input[name="email"], input[placeholder*="邮箱"]',
        experience: 'select[name="workYear"]',
        education: 'select[name="education"]'
      },
      job51: {
        name: 'input[name="name"], input[id="name"]',
        phone: 'input[name="mobile"], input[id="mobile"]',
        email: 'input[name="email"], input[id="email"]',
        experience: 'select[name="workyear"]',
        education: 'select[name="degree"]'
      },
      liepin: {
        name: 'input[name="name"], input[placeholder*="姓名"]',
        phone: 'input[name="mobile"], input[placeholder*="手机"]',
        email: 'input[name="email"], input[placeholder*="邮箱"]',
        experience: 'select[name="currentStatus"]',
        education: 'select[name="degree"]'
      },
      linkedin: {
        name: 'input[name="firstName"], input[name="lastName"]',
        phone: 'input[name="phoneNumber"]',
        email: 'input[name="email"]',
        experience: 'input[name="experience"]',
        education: 'input[name="education"]'
      },
      mock: {
        name: 'input[name="name"], input[id="name"], input[placeholder*="姓名"]',
        phone: 'input[name="phone"], input[id="phone"], input[type="tel"], input[placeholder*="手机"]',
        email: 'input[name="email"], input[id="email"], input[type="email"], input[placeholder*="邮箱"]',
        experience: 'select[name="experience"], select[id="experience"]',
        education: 'select[name="education"], select[id="education"]',
        salary: 'select[name="salary"], select[id="salary"]',
        resume: 'textarea[name="resume"], textarea[id="resume"], textarea[placeholder*="简历"]'
      }
    };
    
    this.init();
  }

  init() {
    // 监听来自 popup 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'JC_AUTOFILL') {
        this.handleAutofill(message, sendResponse);
        return true; // 保持消息通道开放
      }
    });
    
    // 监听来自网页的握手协议消息
    window.addEventListener('message', (event) => {
      // 只处理来自同一页面的消息
      if (event.source !== window) return;
      
      const message = event.data;
      if (message && message.source === 'JIANCAREER_WEBSITE') {
        this.handleWebsiteMessage(message);
      }
    });
    
    console.log('JianCareer Content Script initialized');
  }

  handleWebsiteMessage(message) {
    console.log('[握手协议] 收到网页消息:', message);
    
    switch (message.type) {
      case 'SJ_DETECT_V1':
        this.handleDetectMessage(message);
        break;
      case 'TUTORIAL_START':
        this.handleTutorialStart(message);
        break;
      default:
        console.log('[握手协议] 未知消息类型:', message.type);
    }
  }

  handleDetectMessage(message) {
    console.log('[握手协议] 处理检测消息');
    
    // 响应ACK消息
    const ackMessage = {
      source: 'JIANCAREER_EXTENSION',
      type: 'SJ_ACK_V1',
      timestamp: Date.now(),
      extensionId: chrome.runtime.id,
      version: chrome.runtime.getManifest().version,
      capabilities: {
        autofill: true,
        tutorial: true,
        dataSync: true
      }
    };
    
    window.postMessage(ackMessage, '*');
    console.log('[握手协议] 发送ACK响应:', ackMessage);
  }

  handleTutorialStart(message) {
    console.log('[握手协议] 处理教程开始消息:', message);
    
    // 检查当前页面是否支持教程
    const currentSite = this.detectCurrentSite();
    const forms = currentSite ? this.detectForms(currentSite) : [];
    
    if (!currentSite || forms.length === 0) {
      // 发送教程错误消息
      const errorMessage = {
        source: 'JIANCAREER_EXTENSION',
        type: 'TUTORIAL_ERROR',
        timestamp: Date.now(),
        error: {
          code: 'UNSUPPORTED_SITE',
          message: '当前页面不支持自动填写教程'
        }
      };
      
      window.postMessage(errorMessage, '*');
      console.log('[握手协议] 发送教程错误:', errorMessage);
      return;
    }
    
    // 开始教程演示
    this.startTutorialDemo(currentSite, forms)
      .then(() => {
        // 发送教程完成消息
        const doneMessage = {
          source: 'JIANCAREER_EXTENSION',
          type: 'TUTORIAL_DONE',
          timestamp: Date.now(),
          result: {
            site: currentSite,
            formsFound: forms.length,
            success: true
          }
        };
        
        window.postMessage(doneMessage, '*');
        console.log('[握手协议] 发送教程完成:', doneMessage);
      })
      .catch((error) => {
        // 发送教程错误消息
        const errorMessage = {
          source: 'JIANCAREER_EXTENSION',
          type: 'TUTORIAL_ERROR',
          timestamp: Date.now(),
          error: {
            code: 'TUTORIAL_FAILED',
            message: error.message || '教程执行失败'
          }
        };
        
        window.postMessage(errorMessage, '*');
        console.log('[握手协议] 发送教程错误:', errorMessage);
      });
  }

  async startTutorialDemo(siteKey, forms) {
    console.log('[教程演示] 开始演示:', { siteKey, formsCount: forms.length });
    
    // 模拟教程数据
    const demoData = {
      name: '张三',
      phone: '13800138000',
      email: 'zhangsan@example.com',
      experience: '3-5年',
      education: '本科',
      resume: '这是一份演示简历内容...'
    };
    
    const mappings = this.fieldMappings[siteKey];
    if (!mappings) {
      throw new Error('不支持的网站类型');
    }
    
    // 逐个高亮并填写字段
    for (const [fieldType, selector] of Object.entries(mappings)) {
      const element = document.querySelector(selector);
      if (!element) continue;
      
      // 高亮元素
      this.highlightElement(element);
      
      // 等待一段时间让用户看到高亮
      await this.delay(1000);
      
      // 填写演示数据
      const value = demoData[fieldType];
      if (value) {
        await this.fillField(element, value);
      }
      
      // 移除高亮
      this.removeHighlight(element);
      
      // 短暂延迟
      await this.delay(500);
    }
    
    console.log('[教程演示] 演示完成');
  }

  highlightElement(element) {
    element.style.outline = '3px solid #00b0c2';
    element.style.outlineOffset = '2px';
    element.style.backgroundColor = 'rgba(0, 176, 194, 0.1)';
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  removeHighlight(element) {
    element.style.outline = '';
    element.style.outlineOffset = '';
    element.style.backgroundColor = '';
  }

  async handleAutofill(message, sendResponse) {
    if (this.isProcessing) {
      sendResponse({
        ok: false,
        reason: 'ALREADY_PROCESSING',
        detail: '正在处理中，请稍候'
      });
      return;
    }

    this.isProcessing = true;
    
    try {
      // 检查当前网站是否支持
      const currentSite = this.detectCurrentSite();
      if (!currentSite) {
        sendResponse({
          ok: false,
          reason: 'UNSUPPORTED_SITE',
          detail: '当前站点暂不支持自动填写'
        });
        return;
      }

      // 检查是否有可填写的表单
      const forms = this.detectForms(currentSite);
      if (forms.length === 0) {
        sendResponse({
          ok: false,
          reason: 'NO_FORM',
          detail: '未找到可填写的表单'
        });
        return;
      }

      // 检查简历数据
      if (!message.profileSummary || Object.keys(message.profileSummary).length === 0) {
        sendResponse({
          ok: false,
          reason: 'NO_PROFILE',
          detail: '请先完善简历资料'
        });
        return;
      }

      // 执行自动填写
      const result = await this.performAutofill(currentSite, message.profileSummary);
      sendResponse(result);
      
    } catch (error) {
      console.error('Autofill error:', error);
      sendResponse({
        ok: false,
        reason: 'UNKNOWN',
        detail: error.message || '未知错误'
      });
    } finally {
      this.isProcessing = false;
    }
  }

  detectCurrentSite() {
    const hostname = window.location.hostname;
    for (const [domain, siteKey] of Object.entries(this.supportedSites)) {
      if (hostname.includes(domain)) {
        return siteKey;
      }
    }
    return null;
  }

  detectForms(siteKey) {
    const mappings = this.fieldMappings[siteKey];
    if (!mappings) return [];

    const forms = [];
    const allSelectors = Object.values(mappings).join(', ');
    const elements = document.querySelectorAll(allSelectors);
    
    if (elements.length > 0) {
      // 找到包含这些元素的表单
      const formElements = new Set();
      elements.forEach(el => {
        const form = el.closest('form') || document.body;
        formElements.add(form);
      });
      forms.push(...formElements);
    }
    
    return forms;
  }

  async performAutofill(siteKey, profileData) {
    const mappings = this.fieldMappings[siteKey];
    let filledCount = 0;
    let totalCount = 0;
    const missingFields = [];
    
    // 模拟填写进度
    const progressCallback = (progress) => {
      chrome.runtime.sendMessage({
        type: 'JC_AUTOFILL_PROGRESS',
        progress: progress
      });
    };

    for (const [fieldType, selector] of Object.entries(mappings)) {
      totalCount++;
      
      try {
        const element = document.querySelector(selector);
        if (!element) {
          missingFields.push(fieldType);
          continue;
        }

        const value = this.getFieldValue(fieldType, profileData);
        if (!value) {
          missingFields.push(fieldType);
          continue;
        }

        // 填写字段
        await this.fillField(element, value);
        filledCount++;
        
        // 更新进度
        progressCallback(Math.round((filledCount / totalCount) * 100));
        
        // 添加延迟，模拟真实用户操作
        await this.delay(200 + Math.random() * 300);
        
      } catch (error) {
        console.warn(`Failed to fill field ${fieldType}:`, error);
        missingFields.push(fieldType);
      }
    }

    // 返回结果
    if (filledCount === 0) {
      return {
        ok: false,
        reason: 'NO_FIELDS_FILLED',
        detail: '没有成功填写任何字段',
        missingFields
      };
    } else if (missingFields.length > 0) {
      return {
        ok: false,
        reason: 'PARTIAL',
        detail: `部分字段未填写: ${missingFields.join(', ')}`,
        filledCount,
        totalCount,
        missingFields
      };
    } else {
      return {
        ok: true,
        filledCount,
        totalCount,
        detail: '所有字段填写成功'
      };
    }
  }

  getFieldValue(fieldType, profileData) {
    const mapping = {
      name: profileData.name || profileData.fullName,
      phone: profileData.phone || profileData.mobile,
      email: profileData.email,
      experience: profileData.workExperience || profileData.experience,
      education: profileData.education || profileData.degree,
      salary: profileData.salary || profileData.expectedSalary,
      resume: profileData.resumeText || profileData.summary
    };
    
    return mapping[fieldType] || '';
  }

  async fillField(element, value) {
    // 聚焦元素
    element.focus();
    
    // 清空现有内容
    if (element.tagName.toLowerCase() === 'select') {
      // 处理下拉选择
      const options = element.querySelectorAll('option');
      for (const option of options) {
        if (option.textContent.includes(value) || option.value === value) {
          element.value = option.value;
          break;
        }
      }
    } else if (element.tagName.toLowerCase() === 'textarea' || element.type === 'text' || element.type === 'email' || element.type === 'tel') {
      // 处理文本输入
      element.value = '';
      element.value = value;
    }
    
    // 触发事件
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 初始化 Content Script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new JianCareerContentScript();
  });
} else {
  new JianCareerContentScript();
}