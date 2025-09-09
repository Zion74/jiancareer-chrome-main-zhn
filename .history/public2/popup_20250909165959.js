class ResumeManager {
  constructor() {
    this.resumeData = null;
    this.init();
  }

  async init() {
    await this.loadResumeData();
    this.bindEvents();
    this.updateUI();
    this.checkCurrentPage();
  }

  // 加载简历数据
  async loadResumeData() {
    try {
      const result = await chrome.storage.local.get(['resumeData']);
      this.resumeData = result.resumeData || null;
    } catch (error) {
      console.error('加载简历数据失败:', error);
    }
  }

  // 保存简历数据
  async saveResumeData(data) {
    try {
      await chrome.storage.local.set({ resumeData: data });
      this.resumeData = data;
      this.showMessage('简历信息保存成功！');
      this.updateUI();
    } catch (error) {
      console.error('保存简历数据失败:', error);
      this.showMessage('保存失败，请重试', 'error');
    }
  }

  // 绑定事件
  bindEvents() {
    // 编辑简历按钮
    document.getElementById('editResumeBtn').addEventListener('click', () => {
      this.showResumeEditor();
    });

    // 一键填写按钮
    document.getElementById('autoFillBtn').addEventListener('click', () => {
      this.autoFillForm();
    });

    // 测试表单按钮
    document.getElementById('testFormBtn').addEventListener('click', () => {
      this.openTestForm();
    });

    // 清空数据按钮
    document.getElementById('clearDataBtn').addEventListener('click', () => {
      this.clearAllData();
    });

    // 返回按钮
    document.getElementById('backBtn').addEventListener('click', () => {
      this.showMainContent();
    });

    // 取消按钮
    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.showMainContent();
    });

    // 表单提交
    document.getElementById('resumeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });
  }

  // 显示主界面
  showMainContent() {
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('resumeEditor').classList.add('hidden');
  }

  // 显示简历编辑器
  showResumeEditor() {
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('resumeEditor').classList.remove('hidden');
    this.populateForm();
  }

  // 填充表单数据
  populateForm() {
    if (!this.resumeData) return;

    const form = document.getElementById('resumeForm');
    Object.keys(this.resumeData).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = this.resumeData[key] || '';
      }
    });
  }

  // 处理表单提交
  handleFormSubmit() {
    const form = document.getElementById('resumeForm');
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] = formData.entries()) {
      data[key] = value.trim()
    }

    // 验证必填字段
    if (!data.fullName || !data.phone || !data.email) {
      this.showMessage('请填写必填字段（姓名、手机号、邮箱）', 'error');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      this.showMessage('请输入正确的邮箱格式', 'error');
      return;
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(data.phone)) {
      this.showMessage('请输入正确的手机号格式', 'error');
      return;
    }

    this.saveResumeData(data);
    this.showMainContent();
  }

  // 更新UI
  updateUI() {
    const resumeInfo = document.getElementById('resumeInfo');
    const autoFillBtn = document.getElementById('autoFillBtn');

    if (this.resumeData) {
      resumeInfo.innerHTML = `
        <div class="resume-summary">
          <h3>${this.resumeData.fullName || '未填写姓名'}</h3>
          <p><strong>手机:</strong> ${this.resumeData.phone || '未填写'}</p>
          <p><strong>邮箱:</strong> ${this.resumeData.email || '未填写'}</p>
          <p><strong>学历:</strong> ${this.resumeData.education || '未填写'}</p>
          <p><strong>工作年限:</strong> ${this.resumeData.workYears || '未填写'}</p>
        </div>
      `;
      autoFillBtn.disabled = false;
    } else {
      resumeInfo.innerHTML = '<p class="no-resume">暂无简历信息</p>';
      autoFillBtn.disabled = true;
    }
  }

  // 检查当前页面是否支持自动填写
  async checkCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const statusIndicator = document.getElementById('statusIndicator');
      const statusText = statusIndicator.querySelector('.status-text');
      const statusDot = statusIndicator.querySelector('.status-dot');

      // 检查是否是测试表单页面或支持的招聘网站
      if (tab.url.includes('test-form.html') || this.isSupportedSite(tab.url)) {
        statusText.textContent = '可填写';
        statusDot.style.background = '#10B981';
      } else {
        statusText.textContent = '不支持';
        statusDot.style.background = '#EF4444';
      }
    } catch (error) {
      console.error('检查页面状态失败:', error);
    }
  }

  // 判断是否为支持的网站
  isSupportedSite(url) {
    const supportedSites = [
      'zhaopin.com',
      '51job.com',
      'boss.com',
      'lagou.com',
      'liepin.com',
      'test-form.html'
    ];
    return supportedSites.some(site => url.includes(site));
  }

  // 自动填写表单
  async autoFillForm() {
    if (!this.resumeData) {
      this.showMessage('请先填写简历信息', 'error');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 向内容脚本发送填写指令
      await chrome.tabs.sendMessage(tab.id, {
        action: 'autoFill',
        data: this.resumeData
      });

      this.showMessage('正在自动填写表单...');
      
      // 3秒后关闭弹窗
      setTimeout(() => {
        window.close();
      }, 3000);
    } catch (error) {
      console.error('自动填写失败:', error);
      this.showMessage('自动填写失败，请确保页面支持此功能', 'error');
    }
  }

  // 打开测试表单
  async openTestForm() {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('test-form.html')
      });
    } catch (error) {
      console.error('打开测试表单失败:', error);
      this.showMessage('打开测试表单失败', 'error');
    }
  }

  // 清空所有数据
  async clearAllData() {
    if (confirm('确定要清空所有简历数据吗？此操作不可恢复。')) {
      try {
        await chrome.storage.local.clear();
        this.resumeData = null;
        this.updateUI();
        this.showMessage('数据已清空');
      } catch (error) {
        console.error('清空数据失败:', error);
        this.showMessage('清空数据失败', 'error');
      }
    }
  }

  // 显示消息
  showMessage(text, type = 'success') {
    const message = document.getElementById('message');
    const messageText = message.querySelector('.message-text');
    
    messageText.textContent = text;
    message.className = `message ${type}`;
    message.classList.remove('hidden');

    // 3秒后自动隐藏
    setTimeout(() => {
      message.classList.add('hidden');
    }, 3000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new ResumeManager();
});