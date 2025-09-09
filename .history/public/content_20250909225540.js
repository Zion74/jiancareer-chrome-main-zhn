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
        name: 'input[name="firstName"], input[id="firstName"], input[name="name"], input[id="name"], input[placeholder*="姓名"]',
        firstName: 'input[name="firstName"], input[id="firstName"], input[placeholder*="姓名"]',
        lastName: 'input[name="lastName"], input[id="lastName"], input[placeholder*="姓氏"]',
        phone: 'input[name="phone"], input[id="phone"], input[type="tel"], input[placeholder*="手机"]',
        email: 'input[name="email"], input[id="email"], input[type="email"], input[placeholder*="邮箱"]',
        experience: 'select[name="experience"], select[id="experience"]',
        education: 'select[name="education"], select[id="education"]',
        salary: 'select[name="salary"], select[id="salary"]',
        location: 'input[name="location"], input[id="location"], input[placeholder*="城市"]',
        skills: 'textarea[name="skills"], textarea[id="skills"], textarea[placeholder*="技能"]',
        resume: 'textarea[name="introduction"], textarea[id="introduction"], textarea[name="resume"], textarea[id="resume"], textarea[placeholder*="简历"], textarea[placeholder*="个人简介"]',
        introduction: 'textarea[name="introduction"], textarea[id="introduction"], textarea[placeholder*="个人简介"]',
        wechat: 'input[name="wechat"], input[id="wechat"], input[placeholder*="微信"]',
        github: 'input[name="github"], input[id="github"], input[placeholder*="GitHub"]',
        university: 'input[name="university"], input[id="university"], input[placeholder*="院校"]',
        major: 'input[name="major"], input[id="major"], input[placeholder*="专业"]',
        graduationTime: 'input[name="graduationTime"], input[id="graduationTime"], input[placeholder*="毕业时间"]',
        gpa: 'input[name="gpa"], input[id="gpa"], input[placeholder*="GPA"]'
      }
    };
    
    this.init();
  }

  init() {
    console.log('JianCareer Content Script 初始化开始');
    
    // 设置Chrome扩展消息监听器
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('收到Chrome扩展消息:', message);
        
        try {
          if (message.type === 'JC_AUTOFILL') {
            console.log('处理自动填写请求:', message);
            this.handleAutofill(message, sendResponse);
            return true; // 保持消息通道开放
          } else if (message.type === 'JC_DETECT') {
            console.log('处理检测请求:', message);
            this.handleDetectMessage(message, sendResponse);
            return true;
          } else if (message.type === 'JC_PING') {
            console.log('收到ping消息');
            sendResponse({ type: 'JC_PONG', success: true, timestamp: Date.now() });
            return true;
          }
        } catch (error) {
          console.error('处理Chrome扩展消息时出错:', error);
          sendResponse({ success: false, error: error.message });
        }
        
        return false;
      });
      console.log('Chrome扩展消息监听器已设置');
    } else {
      console.warn('Chrome扩展API不可用');
    }
    
    // 设置网页消息监听器
    window.addEventListener('message', (event) => {
      this.handleWebsiteMessage(event);
    });
    
    // 设置全局标识，让网页能够检测到Content Script
    window.jiancareerContentScript = true;
    window.jiancareerExtensionId = chrome.runtime && chrome.runtime.id ? chrome.runtime.id : 'unknown';
    
    console.log('JianCareer Content Script 初始化完成');
  }

  handleWebsiteMessage(event) {
    // 只处理来自同一页面的消息
    if (event.source !== window) return;
    
    const message = event.data;
    if (!message || !message.type) {
      return;
    }
    
    console.log('收到网页消息:', message);
    
    try {
      switch (message.type) {
        case 'SJ_DETECT_V1':
        case 'JC_DETECT':
          console.log('处理网页检测消息');
          this.handleDetectMessage(message, null);
          break;
        case 'JC_START_TUTORIAL':
          console.log('处理教程开始消息');
          this.handleTutorialStart(message);
          break;
        case 'JC_PING':
          console.log('处理网页Ping消息');
          const pongResponse = {
            type: 'JC_PONG',
            id: message.id,
            timestamp: Date.now(),
            success: true
          };
          window.postMessage(pongResponse, '*');
          console.log('发送Pong响应:', pongResponse);
          break;
        case 'JC_AUTOFILL':
          console.log('处理网页自动填写消息');
          this.handleAutofillFromWebsite(message);
          break;
        case 'TEST_MESSAGE':
          console.log('处理测试消息');
          const testResponse = {
            source: 'JIANCAREER_EXTENSION',
            type: 'TEST_RESPONSE',
            timestamp: Date.now(),
            originalMessage: message
          };
          window.postMessage(testResponse, '*');
          console.log('发送测试响应:', testResponse);
          break;
        default:
          console.log('未知消息类型:', message.type);
      }
    } catch (error) {
      console.error('处理网页消息时出错:', error);
      const errorResponse = {
        type: 'ERROR_RESPONSE',
        id: message.id,
        timestamp: Date.now(),
        error: error.message,
        originalMessage: message
      };
      window.postMessage(errorResponse, '*');
    }
  }

  handleDetectMessage(message, sendResponse) {
    console.log('[握手协议] 处理检测消息');
    
    try {
      // 检测当前网站和表单
      const currentSite = this.detectCurrentSite();
      const forms = currentSite ? this.detectForms(currentSite) : [];
      
      const response = {
        success: true,
        type: 'JC_DETECT_RESPONSE',
        id: message.id,
        timestamp: Date.now(),
        url: window.location.href,
        domain: window.location.hostname,
        site: currentSite,
        formsDetected: forms.length,
        forms: forms.map(form => ({
          id: form.id || 'unknown',
          className: form.className || '',
          fieldsCount: form.querySelectorAll('input, select, textarea').length
        }))
      };
      
      console.log('[握手协议] 发送检测响应:', response);
      
      if (sendResponse) {
        sendResponse(response);
      }
      
      // 同时发送window消息用于调试页面
      const ackMessage = {
        source: 'JIANCAREER_EXTENSION',
        type: 'SJ_ACK_V1',
        timestamp: Date.now(),
        extensionId: chrome.runtime && chrome.runtime.id ? chrome.runtime.id : 'unknown',
        version: chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest().version : '1.0.0',
        capabilities: {
          autofill: true,
          tutorial: true,
          dataSync: true
        },
        data: response
      };
      
      window.postMessage(ackMessage, '*');
      console.log('[握手协议] 发送ACK响应:', ackMessage);
      
    } catch (error) {
      console.error('[握手协议] 检测消息处理失败:', error);
      const errorResponse = {
        success: false,
        error: error.message,
        type: 'JC_DETECT_ERROR',
        timestamp: Date.now()
      };
      
      if (sendResponse) {
        sendResponse(errorResponse);
      }
    }
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

  handleAutofillFromWebsite(message) {
    console.log('处理来自网页的自动填写请求:', message);
    
    try {
      const currentSite = this.detectCurrentSite();
      if (!currentSite) {
        throw new Error('不支持的网站类型');
      }
      
      const data = message.data || {};
      this.performAutofill(data, currentSite)
        .then(() => {
          const response = {
            type: 'JC_AUTOFILL_RESPONSE',
            id: message.id,
            timestamp: Date.now(),
            success: true,
            message: '自动填写完成'
          };
          window.postMessage(response, '*');
          console.log('发送自动填写响应:', response);
        })
        .catch((error) => {
          const errorResponse = {
            type: 'JC_AUTOFILL_RESPONSE',
            id: message.id,
            timestamp: Date.now(),
            success: false,
            error: error.message
          };
          window.postMessage(errorResponse, '*');
          console.error('自动填写失败:', error);
        });
    } catch (error) {
      const errorResponse = {
        type: 'JC_AUTOFILL_RESPONSE',
        id: message.id,
        timestamp: Date.now(),
        success: false,
        error: error.message
      };
      window.postMessage(errorResponse, '*');
      console.error('处理自动填写请求失败:', error);
    }
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
      
      // 如果是mock页面，发送填写完成消息
      if (currentSite === 'mock') {
        this.notifyPageFillComplete(result);
      }
      
      sendResponse({
        ok: result.ok,
        filledCount: result.filledCount,
        totalCount: result.totalCount,
        detail: result.detail,
        failed: result.failed || 0,
        details: result.details || [],
        errors: result.errors || []
      });
      
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
    const pathname = window.location.pathname;
    
    // 特殊处理mock页面和debug页面
    if (pathname.includes('mock-form.html') || 
        pathname.includes('debug-autofill.html') ||
        hostname === 'localhost' || 
        hostname === '127.0.0.1') {
      return 'mock';
    }
    
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
    let failedCount = 0;
    const missingFields = [];
    const errors = [];
    const details = [];
    
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
          failedCount++;
          const errorMsg = `未找到字段: ${fieldType}`;
          missingFields.push(fieldType);
          errors.push(errorMsg);
          details.push({
            field: fieldType,
            status: 'error',
            value: '',
            message: errorMsg
          });
          console.log(`✗ 未找到字段: ${fieldType} (${selector})`);
          continue;
        }

        const value = this.getFieldValue(fieldType, profileData);
        if (!value) {
          failedCount++;
          missingFields.push(fieldType);
          details.push({
            field: fieldType,
            status: 'skipped',
            value: '',
            message: '无数据可填写'
          });
          console.log(`⚠ 跳过字段: ${fieldType} (无数据)`);
          continue;
        }

        // 填写字段
        await this.fillField(element, value);
        filledCount++;
        details.push({
          field: fieldType,
          status: 'success',
          value: value,
          message: '填写成功'
        });
        console.log(`✓ 填写字段: ${fieldType} = ${value}`);
        
        // 更新进度
        progressCallback(Math.round((filledCount / totalCount) * 100));
        
        // 添加延迟，模拟真实用户操作
        await this.delay(200 + Math.random() * 300);
        
      } catch (error) {
        failedCount++;
        const errorMsg = `填写字段 ${fieldType} 失败: ${error.message}`;
        errors.push(errorMsg);
        details.push({
          field: fieldType,
          status: 'error',
          value: '',
          message: errorMsg
        });
        console.error(`填写字段 ${fieldType} 时出错:`, error);
        missingFields.push(fieldType);
      }
    }

    // 返回结果
    if (filledCount === 0) {
      return {
        ok: false,
        reason: 'NO_FIELDS_FILLED',
        detail: '没有成功填写任何字段',
        filledCount,
        totalCount,
        failed: failedCount,
        missingFields,
        errors,
        details
      };
    } else if (missingFields.length > 0) {
      return {
        ok: false,
        reason: 'PARTIAL',
        detail: `部分字段未填写: ${missingFields.join(', ')}`,
        filledCount,
        totalCount,
        failed: failedCount,
        missingFields,
        errors,
        details
      };
    } else {
      return {
        ok: true,
        filledCount,
        totalCount,
        failed: failedCount,
        detail: '所有字段填写成功',
        errors,
        details
      };
    }
  }

  getFieldValue(fieldType, profileData) {
    const mapping = {
      name: profileData.name || profileData.fullName || profileData.firstName,
      firstName: profileData.firstName || profileData.name,
      lastName: profileData.lastName || profileData.surname,
      phone: profileData.phone || profileData.mobile || profileData.phoneNumber,
      email: profileData.email,
      experience: profileData.workExperience || profileData.experience,
      education: profileData.education || profileData.degree,
      salary: profileData.salary || profileData.expectedSalary,
      location: profileData.location || profileData.city,
      skills: profileData.skills || profileData.specialties,
      resume: profileData.resumeText || profileData.summary || profileData.introduction,
      introduction: profileData.introduction || profileData.resumeText || profileData.summary,
      wechat: profileData.wechat || profileData.wechatId,
      github: profileData.github || profileData.githubUrl,
      university: profileData.university || profileData.school,
      major: profileData.major || profileData.specialty,
      graduationTime: profileData.graduationTime || profileData.graduationDate,
      gpa: profileData.gpa
    };
    
    return mapping[fieldType] || '';
  }

  async fillField(element, value) {
    // 聚焦元素
    element.focus();
    
    const tagName = element.tagName.toLowerCase();
    const inputType = element.type ? element.type.toLowerCase() : '';
    
    try {
      if (tagName === 'select') {
        // 处理下拉选择
        const options = element.querySelectorAll('option');
        let matched = false;
        
        for (const option of options) {
          const optionText = option.textContent.trim();
          const optionValue = option.value;
          
          // 模糊匹配选项
          if (optionText.includes(value) || 
              optionValue === value || 
              value.includes(optionText) ||
              this.fuzzyMatch(optionText, value)) {
            element.value = optionValue;
            matched = true;
            break;
          }
        }
        
        if (!matched && options.length > 1) {
          // 如果没有匹配到，选择第一个非空选项
          element.value = options[1].value;
        }
        
      } else if (inputType === 'radio') {
        // 处理单选框
        const radioGroup = document.querySelectorAll(`input[name="${element.name}"]`);
        for (const radio of radioGroup) {
          if (radio.value === value || 
              radio.nextElementSibling?.textContent?.includes(value)) {
            radio.checked = true;
            break;
          }
        }
        
      } else if (inputType === 'checkbox') {
        // 处理复选框
        element.checked = Boolean(value);
        
      } else if (tagName === 'textarea' || 
                 inputType === 'text' || 
                 inputType === 'email' || 
                 inputType === 'tel' || 
                 inputType === 'password') {
        // 处理文本输入
        element.value = '';
        
        // 模拟逐字输入
        for (let i = 0; i < value.length; i++) {
          element.value += value[i];
          element.dispatchEvent(new Event('input', { bubbles: true }));
          await this.delay(50 + Math.random() * 50); // 随机延迟
        }
      }
      
      // 触发所有相关事件
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      
      // 特殊处理：触发React/Vue等框架的事件
      if (element._valueTracker) {
        element._valueTracker.setValue('');
      }
      
    } catch (error) {
      console.warn('填写字段时出错:', error);
      // 降级处理：直接设置值
      if (tagName !== 'select' && inputType !== 'radio' && inputType !== 'checkbox') {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
  
  // 模糊匹配辅助方法
  fuzzyMatch(text1, text2) {
    const normalize = (str) => str.toLowerCase().replace(/[\s-_]/g, '');
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);
    
    return norm1.includes(norm2) || norm2.includes(norm1);
  }
  
  // 通知页面填写完成
  notifyPageFillComplete(result) {
    const message = {
      source: 'JIANCAREER_EXTENSION',
      type: 'AUTOFILL_COMPLETE',
      timestamp: Date.now(),
      result: result
    };
    
    window.postMessage(message, '*');
    console.log('[Content Script] 发送填写完成消息:', message);
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