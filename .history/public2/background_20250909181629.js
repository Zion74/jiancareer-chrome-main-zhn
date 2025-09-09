// 简历自动填写插件后台脚本
class BackgroundManager {
  constructor() {
    this.init();
  }

  init() {
    // 插件安装时的初始化
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details);
    });

    // 监听来自content script和popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 保持消息通道开放
    });

    // 监听标签页更新
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdated(tabId, changeInfo, tab);
    });

    // 监听标签页激活
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo);
    });
  }

  // 处理插件安装
  handleInstalled(details) {
    console.log("简历自动填写插件已安装:", details);

    if (details.reason === "install") {
      // 首次安装
      this.showWelcomeNotification();
      this.initializeDefaultSettings();
    } else if (details.reason === "update") {
      // 插件更新
      console.log("插件已更新到新版本");
    }
  }

  // 显示欢迎通知
  showWelcomeNotification() {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-48.svg",
      title: "简历自动填写插件",
      message: "插件安装成功！点击插件图标开始使用。",
    });
  }

  // 初始化默认设置
  async initializeDefaultSettings() {
    try {
      const result = await chrome.storage.local.get(["settings"]);
      if (!result.settings) {
        const defaultSettings = {
          autoDetectForms: true,
          showFloatingButton: true,
          highlightFilledFields: true,
          notificationEnabled: true,
          version: "1.0.0",
        };

        await chrome.storage.local.set({ settings: defaultSettings });
        console.log("默认设置已初始化");
      }
    } catch (error) {
      console.error("初始化设置失败:", error);
    }
  }

  // 处理消息
  handleMessage(request, sender, sendResponse) {
    const { action, data } = request;

    switch (action) {
      case "getResumeData":
        this.getResumeData(sendResponse);
        break;

      case "saveResumeData":
        this.saveResumeData(data, sendResponse);
        break;

      case "checkPageSupport":
        this.checkPageSupport(sender.tab, sendResponse);
        break;

      case "openTestForm":
        this.openTestForm(sendResponse);
        break;

      case "getSettings":
        this.getSettings(sendResponse);
        break;

      case "updateSettings":
        this.updateSettings(data, sendResponse);
        break;

      case "logAutoFillResult":
        this.logAutoFillResult(data, sender.tab);
        break;

      default:
        console.log("未知消息类型:", action);
        sendResponse({ success: false, error: "未知消息类型" });
    }
  }

  // 获取简历数据
  async getResumeData(sendResponse) {
    try {
      const result = await chrome.storage.local.get(["resumeData"]);
      sendResponse({ success: true, data: result.resumeData || null });
    } catch (error) {
      console.error("获取简历数据失败:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 保存简历数据
  async saveResumeData(data, sendResponse) {
    try {
      await chrome.storage.local.set({ resumeData: data });
      console.log("简历数据已保存");
      sendResponse({ success: true });
    } catch (error) {
      console.error("保存简历数据失败:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 检查页面支持情况
  checkPageSupport(tab, sendResponse) {
    if (!tab || !tab.url) {
      sendResponse({ success: false, supported: false });
      return;
    }

    const supportedSites = [
      "zhaopin.com",
      "51job.com",
      "boss.com",
      "lagou.com",
      "liepin.com",
      "test-form.html",
      "localhost",
    ];

    const isSupported = supportedSites.some((site) => tab.url.includes(site));

    sendResponse({
      success: true,
      supported: isSupported,
      url: tab.url,
      title: tab.title,
    });
  }

  // 打开测试表单
  async openTestForm(sendResponse) {
    try {
      const tab = await chrome.tabs.create({
        url: chrome.runtime.getURL("test-form.html"),
      });
      sendResponse({ success: true, tabId: tab.id });
    } catch (error) {
      console.error("打开测试表单失败:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取设置
  async getSettings(sendResponse) {
    try {
      const result = await chrome.storage.local.get(["settings"]);
      sendResponse({ success: true, data: result.settings });
    } catch (error) {
      console.error("获取设置失败:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 更新设置
  async updateSettings(data, sendResponse) {
    try {
      await chrome.storage.local.set({ settings: data });
      console.log("设置已更新");
      sendResponse({ success: true });
    } catch (error) {
      console.error("更新设置失败:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 记录自动填写结果
  logAutoFillResult(data, tab) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      url: tab?.url || "unknown",
      title: tab?.title || "unknown",
      filledFields: data.filledFields || 0,
      totalFields: data.totalFields || 0,
      success: data.success || false,
    };

    // 保存到本地存储（可选）
    this.saveAutoFillLog(logEntry);

    console.log("自动填写结果:", logEntry);
  }

  // 保存自动填写日志
  async saveAutoFillLog(logEntry) {
    try {
      const result = await chrome.storage.local.get(["autoFillLogs"]);
      const logs = result.autoFillLogs || [];

      // 只保留最近100条记录
      logs.push(logEntry);
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      await chrome.storage.local.set({ autoFillLogs: logs });
    } catch (error) {
      console.error("保存日志失败:", error);
    }
  }

  // 处理标签页更新
  handleTabUpdated(tabId, changeInfo, tab) {
    // 当页面加载完成时，检查是否需要注入内容脚本
    if (changeInfo.status === "complete" && tab.url) {
      this.checkAndInjectContentScript(tabId, tab.url);
    }
  }

  // 处理标签页激活
  handleTabActivated(activeInfo) {
    // 可以在这里更新插件图标状态等
    this.updateBadgeForTab(activeInfo.tabId);
  }

  // 检查并注入内容脚本
  async checkAndInjectContentScript(tabId, url) {
    try {
      // 检查是否是支持的网站
      const supportedSites = [
        "zhaopin.com",
        "51job.com",
        "boss.com",
        "lagou.com",
        "liepin.com",
      ];

      const isSupported = supportedSites.some((site) => url.includes(site));

      if (isSupported) {
        // 尝试向标签页发送消息，检查内容脚本是否已加载
        try {
          await chrome.tabs.sendMessage(tabId, { action: "ping" });
        } catch (error) {
          // 如果发送消息失败，说明内容脚本未加载，需要注入
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"],
          });
          console.log("内容脚本已注入到标签页:", tabId);
        }
      }
    } catch (error) {
      console.error("检查/注入内容脚本失败:", error);
    }
  }

  // 更新标签页徽章
  async updateBadgeForTab(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) return;

      const supportedSites = [
        "zhaopin.com",
        "51job.com",
        "boss.com",
        "lagou.com",
        "liepin.com",
        "test-form.html",
      ];

      const isSupported = supportedSites.some((site) => tab.url.includes(site));

      if (isSupported) {
        // 设置绿色徽章表示支持
        chrome.action.setBadgeText({ text: "✓", tabId: tabId });
        chrome.action.setBadgeBackgroundColor({
          color: "#10B981",
          tabId: tabId,
        });
      } else {
        // 清除徽章
        chrome.action.setBadgeText({ text: "", tabId: tabId });
      }
    } catch (error) {
      console.error("更新徽章失败:", error);
    }
  }

  // 清理存储数据
  async cleanupStorage() {
    try {
      const result = await chrome.storage.local.get(null);
      const keys = Object.keys(result);

      console.log("当前存储的数据键:", keys);

      // 可以在这里添加清理逻辑
      // 例如删除过期的日志等
    } catch (error) {
      console.error("清理存储失败:", error);
    }
  }
}

// 初始化后台管理器
const backgroundManager = new BackgroundManager();

// 定期清理存储（每24小时）
setInterval(() => {
  backgroundManager.cleanupStorage();
}, 24 * 60 * 60 * 1000);
