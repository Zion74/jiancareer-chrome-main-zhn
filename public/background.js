// JianCareer AutoFill Background Script
// 负责消息通信、数据管理和扩展状态控制

class AutoFillBackground {
  constructor() {
    this.init();
  }

  init() {
    console.log('[JianCareer AutoFill] Background script initialized');
    
    // 初始化默认数据
    this.initializeDefaultData();
    
    // 设置消息监听
    this.setupMessageListener();
    
    // 设置标签页更新监听
    this.setupTabListener();
    
    // 设置右键菜单
    this.setupContextMenu();
    
    // 设置扩展安装/更新监听
    this.setupInstallListener();
  }

  async initializeDefaultData() {
    try {
      const result = await chrome.storage.local.get(['profiles', 'settings', 'websiteRules']);
      
      // 初始化默认设置
      if (!result.settings) {
        const defaultSettings = {
          autoFill: false,
          fillDelay: 500,
          confirmBeforeFill: true,
          autoSubmit: false,
          encryptData: true,
          syncEnabled: false,
          theme: 'light'
        };
        await chrome.storage.local.set({ settings: defaultSettings });
      }
      
      // 初始化默认网站规则
      if (!result.websiteRules) {
        const defaultWebsiteRules = this.getDefaultWebsiteRules();
        await chrome.storage.local.set({ websiteRules: defaultWebsiteRules });
      }
      
      // 初始化空的用户配置文件
      if (!result.profiles) {
        await chrome.storage.local.set({ profiles: {} });
      }
      
    } catch (error) {
      console.error('[JianCareer AutoFill] Failed to initialize default data:', error);
    }
  }

  getDefaultWebsiteRules() {
    return {
      'linkedin.com': {
        name: 'LinkedIn',
        priority: 1,
        isActive: true,
        selectors: {
          firstName: ['input[name="firstName"]', '#firstName', 'input[aria-label*="First name"]'],
          lastName: ['input[name="lastName"]', '#lastName', 'input[aria-label*="Last name"]'],
          email: ['input[type="email"]', 'input[name="email"]', 'input[aria-label*="Email"]'],
          phone: ['input[type="tel"]', 'input[name="phone"]', 'input[aria-label*="Phone"]'],
          location: ['input[name="location"]', 'input[aria-label*="Location"]'],
          company: ['input[name="company"]', 'input[aria-label*="Company"]']
        },
        actions: [
          {
            actionType: 'click',
            selector: 'button[type="submit"]',
            delay: 1000
          }
        ]
      },
      'indeed.com': {
        name: 'Indeed',
        priority: 1,
        isActive: true,
        selectors: {
          firstName: ['input[name="applicant.name.first"]', '#applicant-firstName'],
          lastName: ['input[name="applicant.name.last"]', '#applicant-lastName'],
          email: ['input[name="applicant.emailAddress"]', '#applicant-emailAddress'],
          phone: ['input[name="applicant.phoneNumber"]', '#applicant-phoneNumber'],
          location: ['input[name="applicant.location"]', '#applicant-location']
        },
        actions: []
      },
      'zhipin.com': {
        name: 'Boss直聘',
        priority: 1,
        isActive: true,
        selectors: {
          name: ['input[placeholder*="姓名"]', 'input[name="name"]'],
          phone: ['input[placeholder*="手机"]', 'input[name="mobile"]', 'input[type="tel"]'],
          email: ['input[placeholder*="邮箱"]', 'input[name="email"]', 'input[type="email"]'],
          location: ['input[placeholder*="所在地"]', 'input[name="location"]']
        },
        actions: []
      },
      'lagou.com': {
        name: '拉勾网',
        priority: 1,
        isActive: true,
        selectors: {
          name: ['input[placeholder*="姓名"]', '#name'],
          phone: ['input[placeholder*="手机号"]', '#phone'],
          email: ['input[placeholder*="邮箱"]', '#email']
        },
        actions: []
      },
      'jobs.51job.com': {
        name: '前程无忧',
        priority: 1,
        isActive: true,
        selectors: {
          name: ['input[name="name"]', '#name'],
          phone: ['input[name="mobile"]', '#mobile'],
          email: ['input[name="email"]', '#email']
        },
        actions: []
      }
    };
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[JianCareer AutoFill] Received message:', message.type);
      
      switch (message.type) {
        case 'FORMS_DETECTED':
          this.handleFormsDetected(message.payload, sender.tab);
          sendResponse({ success: true });
          break;
          
        case 'FORM_FILLED':
          this.handleFormFilled(message.payload, sender.tab);
          sendResponse({ success: true });
          break;
          
        case 'GET_PROFILES':
          this.getProfiles().then(profiles => {
            sendResponse({ success: true, profiles });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // 异步响应
          
        case 'SAVE_PROFILE':
          this.saveProfile(message.payload).then(result => {
            sendResponse(result);
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // 异步响应
          
        case 'DELETE_PROFILE':
          this.deleteProfile(message.payload.profileId).then(result => {
            sendResponse(result);
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // 异步响应
          
        case 'GET_SETTINGS':
          this.getSettings().then(settings => {
            sendResponse({ success: true, settings });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // 异步响应
          
        case 'SAVE_SETTINGS':
          this.saveSettings(message.payload).then(result => {
            sendResponse(result);
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // 异步响应
          
        case 'GET_TAB_INFO':
          this.getTabInfo(sender.tab.id).then(info => {
            sendResponse({ success: true, info });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // 异步响应
      }
    });
  }

  setupTabListener() {
    // 监听标签页更新
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.updateBadge(tabId, tab.url);
      }
    });
    
    // 监听标签页激活
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url) {
        this.updateBadge(activeInfo.tabId, tab.url);
      }
    });
  }

  setupContextMenu() {
    chrome.contextMenus.create({
      id: 'autofill-form',
      title: '自动填写表单',
      contexts: ['page'],
      documentUrlPatterns: ['*://*/*']
    });
    
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'autofill-form') {
        // 发送消息到content script检测表单
        chrome.tabs.sendMessage(tab.id, { type: 'DETECT_FORMS' });
      }
    });
  }

  setupInstallListener() {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        console.log('[JianCareer AutoFill] Extension installed');
        // 打开欢迎页面
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      } else if (details.reason === 'update') {
        console.log('[JianCareer AutoFill] Extension updated');
      }
    });
  }

  async updateBadge(tabId, url) {
    try {
      const hostname = new URL(url).hostname;
      const result = await chrome.storage.local.get(['websiteRules']);
      const websiteRules = result.websiteRules || {};
      
      if (websiteRules[hostname] && websiteRules[hostname].isActive) {
        chrome.action.setBadgeText({ text: '●', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#28A745', tabId });
        chrome.action.setTitle({ 
          title: `AutoFill Pro - 支持 ${websiteRules[hostname].name}`, 
          tabId 
        });
      } else {
        chrome.action.setBadgeText({ text: '', tabId });
        chrome.action.setTitle({ title: 'AutoFill Pro', tabId });
      }
    } catch (error) {
      console.error('[JianCareer AutoFill] Update badge error:', error);
    }
  }

  handleFormsDetected(payload, tab) {
    console.log(`[JianCareer AutoFill] Forms detected on ${payload.domain}:`, payload.formsCount);
    
    // 更新徽章显示表单数量
    if (payload.formsCount > 0) {
      chrome.action.setBadgeText({ text: payload.formsCount.toString(), tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#4A90E2', tabId: tab.id });
    }
    
    // 记录统计数据
    this.recordAnalytics('forms_detected', {
      domain: payload.domain,
      formsCount: payload.formsCount,
      totalFields: payload.totalFields
    });
  }

  handleFormFilled(payload, tab) {
    console.log(`[JianCareer AutoFill] Form filled on ${payload.url}:`, payload.success);
    
    if (payload.success) {
      // 显示成功徽章
      chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#28A745', tabId: tab.id });
      
      // 3秒后清除徽章
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '', tabId: tab.id });
      }, 3000);
    }
    
    // 记录填写历史
    this.recordFillHistory(payload);
  }

  async getProfiles() {
    const result = await chrome.storage.local.get(['profiles']);
    return result.profiles || {};
  }

  async saveProfile(profileData) {
    try {
      const result = await chrome.storage.local.get(['profiles']);
      const profiles = result.profiles || {};
      
      const profileId = profileData.id || this.generateId();
      profiles[profileId] = {
        ...profileData,
        id: profileId,
        updatedAt: new Date().toISOString()
      };
      
      await chrome.storage.local.set({ profiles });
      return { success: true, profileId };
    } catch (error) {
      console.error('[JianCareer AutoFill] Save profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteProfile(profileId) {
    try {
      const result = await chrome.storage.local.get(['profiles']);
      const profiles = result.profiles || {};
      
      delete profiles[profileId];
      
      await chrome.storage.local.set({ profiles });
      return { success: true };
    } catch (error) {
      console.error('[JianCareer AutoFill] Delete profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSettings() {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || {};
  }

  async saveSettings(settings) {
    try {
      await chrome.storage.local.set({ settings });
      return { success: true };
    } catch (error) {
      console.error('[JianCareer AutoFill] Save settings error:', error);
      return { success: false, error: error.message };
    }
  }

  async getTabInfo(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      const hostname = new URL(tab.url).hostname;
      const result = await chrome.storage.local.get(['websiteRules']);
      const websiteRules = result.websiteRules || {};
      
      return {
        url: tab.url,
        hostname: hostname,
        title: tab.title,
        supported: !!websiteRules[hostname],
        websiteRule: websiteRules[hostname] || null
      };
    } catch (error) {
      console.error('[JianCareer AutoFill] Get tab info error:', error);
      throw error;
    }
  }

  async recordAnalytics(event, data) {
    try {
      const result = await chrome.storage.local.get(['analytics', 'dailyStats']);
      const analytics = result.analytics || {
        totalFills: 0,
        successRate: 0,
        lastUsed: null,
        events: []
      };
      
      const analyticsEvent = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        event,
        data,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        success: data.success !== false
      };
      
      analytics.events.push(analyticsEvent);
      
      // 只保留最近1000条记录
      if (analytics.events.length > 1000) {
        analytics.events = analytics.events.slice(-1000);
      }
      
      // 更新每日统计
      const today = new Date().toDateString();
      const dailyStats = result.dailyStats || {};
      
      if (!dailyStats[today]) {
        dailyStats[today] = {
          date: today,
          totalActions: 0,
          formDetections: 0,
          formFills: 0,
          successfulFills: 0,
          websites: []
        };
      }
      
      dailyStats[today].totalActions++;
      
      if (event === 'forms_detected') {
        dailyStats[today].formDetections++;
      } else if (event === 'form_filled') {
        dailyStats[today].formFills++;
        if (analyticsEvent.success) {
          dailyStats[today].successfulFills++;
        }
      }
      
      if (data.url || data.domain) {
        const hostname = data.domain || new URL(data.url).hostname;
        if (!dailyStats[today].websites.includes(hostname)) {
          dailyStats[today].websites.push(hostname);
        }
      }
      
      // 只保留最近30天的统计
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      Object.keys(dailyStats).forEach(date => {
        if (new Date(date) < thirtyDaysAgo) {
          delete dailyStats[date];
        }
      });
      
      await chrome.storage.local.set({ 
        analytics,
        dailyStats
      });
    } catch (error) {
      console.error('[JianCareer AutoFill] Record analytics error:', error);
    }
  }

  async recordFillHistory(payload) {
    try {
      const result = await chrome.storage.local.get(['fillHistory']);
      const fillHistory = result.fillHistory || [];
      
      fillHistory.push({
        id: this.generateId(),
        url: payload.url,
        domain: new URL(payload.url).hostname,
        filledAt: new Date().toISOString(),
        success: payload.success,
        filledCount: payload.filledCount || 0,
        errorMessage: payload.error || null
      });
      
      // 只保留最近500条记录
      if (fillHistory.length > 500) {
        fillHistory.splice(0, fillHistory.length - 500);
      }
      
      await chrome.storage.local.set({ fillHistory });
      
      // 更新统计数据
      const analytics = await chrome.storage.local.get(['analytics']);
      const analyticsData = analytics.analytics || { totalFills: 0, successRate: 0 };
      
      if (payload.success) {
        analyticsData.totalFills = (analyticsData.totalFills || 0) + 1;
      }
      
      analyticsData.lastUsed = new Date().toISOString();
      
      // 计算成功率
      const recentHistory = fillHistory.slice(-100); // 最近100次
      const successCount = recentHistory.filter(h => h.success).length;
      analyticsData.successRate = Math.round((successCount / recentHistory.length) * 100);
      
      await chrome.storage.local.set({ analytics: analyticsData });
      
    } catch (error) {
      console.error('[JianCareer AutoFill] Record fill history error:', error);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// 初始化background script
new AutoFillBackground();