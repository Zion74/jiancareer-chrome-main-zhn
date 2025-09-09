// JianCareer AutoFill Popup Script

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.currentState = 'login-initial'; // 状态: login-initial, login-form, logged-in, filling, success, partial-missing, failed
    this.userAuth = null;
    this.autofillTimeout = null;
    this.returnTimeout = null;
    this.selectedResume = 'resume-a';
    this.autofillProgress = { filled: 0, total: 0 };
    this.autofillResult = null;
    this.lastError = null;
    this.init();
    this.setupMessageListener();
  }

  async init() {
    // 检查是否在 Chrome 扩展环境中
    const isChromeExtension = typeof chrome !== 'undefined' && chrome.tabs && chrome.storage;
    
    if (isChromeExtension) {
      try {
        this.currentTab = await this.getCurrentTab();
      } catch (error) {
        console.error('Error getting current tab:', error);
      }
      
      try {
        await this.checkAuthStatus();
      } catch (error) {
        console.error('Error checking auth status:', error);
        this.checkAuthStatusFallback();
      }
    } else {
      // 浏览器环境，直接使用后备方案
      this.checkAuthStatusFallback();
    }
    
    this.setupEventListeners();
    this.updateUI();
  }

  async getCurrentTab() {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTab = tab;
      } else {
        // 浏览器环境下的模拟
        this.currentTab = { url: 'http://localhost:8080/popup.html' };
      }
    } catch (error) {
      console.error('Error getting current tab:', error);
      throw error;
    }
  }

  async checkAuthStatus() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['sj_auth']);
        this.userAuth = result.sj_auth || null;
      } else {
        throw new Error('Chrome storage not available');
      }
      
      if (this.userAuth) {
        this.currentState = 'logged-in'; // 已登录主页
      } else {
        this.currentState = 'login-initial'; // 未登录首页
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      throw error;
    }
  }
  
  checkAuthStatusFallback() {
    try {
      // 使用 localStorage 作为后备方案
      const authData = localStorage.getItem('sj_auth');
      this.userAuth = authData ? JSON.parse(authData) : null;
      
      if (this.userAuth) {
        this.currentState = 'logged-in'; // 已登录主页
      } else {
        this.currentState = 'login-initial'; // 未登录首页
      }
    } catch (error) {
      console.error('Error in fallback auth check:', error);
      this.currentState = 1;
    }
  }

  setupEventListeners() {
    // 登录按钮点击
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        this.switchToState(2);
      });
    }

    // 注册按钮点击
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
      registerBtn.addEventListener('click', () => {
        window.open('https://jiancareer.com/register', '_blank');
      });
    }

    // 返回按钮点击
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.switchToState(1);
      });
    }

    // 登录表单提交
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // 一键填入按钮
    const autofillBtn = document.getElementById('autofill-btn');
    if (autofillBtn) {
      autofillBtn.addEventListener('click', () => {
        this.handleAutofill();
      });
    }

    // 修改/查看资料按钮
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        window.open('https://jiancareer.com/profile', '_blank');
      });
    }

    // 简历选择器
    const resumeSelector = document.getElementById('resume-selector');
    if (resumeSelector) {
      resumeSelector.addEventListener('change', (e) => {
        this.selectedResume = e.target.value;
        this.updateSelectedResume(e.target.value);
      });
    }

    // 顶部导航图标
    this.setupNavigationIcons();

    // 状态 5 和 6 的按钮
    this.setupStateButtons();

    // 底部反馈链接
    const feedbackLink = document.getElementById('feedback-link');
    if (feedbackLink) {
      feedbackLink.addEventListener('click', (e) => {
        e.preventDefault();
        // 优先使用扩展内帮助页，如果不存在则使用外部反馈页面
        const helpUrl = chrome.runtime.getURL('help.html');
        const fallbackUrl = 'https://jiancareer.com/feedback';
        
        // 检查帮助页面是否存在
        fetch(helpUrl)
          .then(response => {
            if (response.ok) {
              chrome.tabs.create({ url: helpUrl });
            } else {
              chrome.tabs.create({ url: fallbackUrl });
            }
          })
          .catch(() => {
            // 如果检查失败，直接使用外部链接
            chrome.tabs.create({ url: fallbackUrl });
          });
      });
    }
  }

  updateSiteInfo() {
    if (!this.tabInfo) return;
    
    const siteNameEl = document.getElementById('siteName');
    const siteUrlEl = document.getElementById('siteUrl');
    
    if (this.tabInfo.supported) {
      siteNameEl.textContent = this.tabInfo.websiteRule.name;
      siteNameEl.style.color = '#28a745';
    } else {
      siteNameEl.textContent = this.tabInfo.hostname;
      siteNameEl.style.color = '#666';
    }
    
    siteUrlEl.textContent = this.tabInfo.url;
  }

  updateStatus() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (this.tabInfo && this.tabInfo.supported) {
      statusDot.classList.add('active');
      statusText.textContent = '支持自动填写';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = '不支持此网站';
    }
  }

  updateProfileSelector() {
    const profileSelect = document.getElementById('profileSelect');
    
    // 清空现有选项
    profileSelect.innerHTML = '<option value="">选择配置文件...</option>';
    
    // 添加配置文件选项
    Object.values(this.profiles).forEach(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name || '未命名配置';
      profileSelect.appendChild(option);
    });
    
    // 如果没有配置文件，添加创建提示
    if (Object.keys(this.profiles).length === 0) {
      const option = document.createElement('option');
      option.value = 'create';
      option.textContent = '创建新配置文件...';
      profileSelect.appendChild(option);
    }
  }

  updateButtonStates() {
    const fillBtn = document.getElementById('fillBtn');
    const profileSelect = document.getElementById('profileSelect');
    
    // 只有选择了配置文件且检测到表单时才能填写
    const canFill = profileSelect.value && 
                   profileSelect.value !== 'create' && 
                   this.formsData && 
                   this.formsData.formsCount > 0;
    
    fillBtn.disabled = !canFill;
  }

  switchToState(newState) {
    this.currentState = newState;
    this.updateUI();
  }

  updateUI() {
    // 隐藏所有状态
    for (let i = 1; i <= 7; i++) {
      const stateEl = document.getElementById(`state-${i}`);
      if (stateEl) {
        stateEl.classList.add('hidden');
      }
    }

    // 显示当前状态
    const currentStateEl = document.getElementById(`state-${this.currentState}`);
    if (currentStateEl) {
      currentStateEl.classList.remove('hidden');
    }

    // 更新状态文本和特定状态的内容
    const statusText = document.getElementById('status-text');
    switch (this.currentState) {
      case 1:
        statusText.textContent = '请登录';
        break;
      case 2:
        statusText.textContent = '请登录';
        break;
      case 3:
        statusText.textContent = this.userAuth?.username || 'user6687331s';
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
          usernameDisplay.textContent = this.userAuth?.username || 'user6687331s';
        }
        break;
      case 4:
        statusText.textContent = this.userAuth?.username || 'user6687331s';
        this.updateAutofillProgress();
        break;
      case 5:
        statusText.textContent = this.userAuth?.username || 'user6687331s';
        
        // 更新成功统计信息
        if (this.autofillResult) {
          const statsElement = document.querySelector('.success-stats');
          if (statsElement) {
            statsElement.innerHTML = `
              <div>成功填写 ${this.autofillResult.filledCount} / ${this.autofillResult.totalCount} 个字段</div>
              <div style="margin-top: 4px; color: #666; font-size: 12px;">${this.autofillResult.detail}</div>
            `;
          }
        }
        
        this.scheduleReturnToState3();
        break;
      case 6:
        statusText.textContent = this.userAuth?.username || 'user6687331s';
        this.updateErrorMessage();
        break;
      case 7:
        statusText.textContent = '已退出登录';
        
        // 显示退出成功信息
        const logoutMessageElement = document.querySelector('.logout-message');
        if (logoutMessageElement) {
          logoutMessageElement.textContent = '您已成功退出登录，感谢使用简职涯！';
        }
        
        // 2秒后自动返回状态 1
        setTimeout(() => {
          if (this.currentState === 7) {
            this.currentState = 1;
            this.updateUI();
          }
        }, 2000);
        break;
    }
  }

  // 状态 1: 未登录首页按钮处理
  openRegisterPage() {
    const signupUrl = 'https://jiancareer.com/signup' || chrome.runtime.getURL('../jiancareer-front-end-main/signup.html');
    chrome.tabs.create({ url: signupUrl });
  }

  openWebsite() {
    const homeUrl = 'https://jiancareer.com' || chrome.runtime.getURL('../jiancareer-front-end-main/index.html');
    chrome.tabs.create({ url: homeUrl });
  }

  // 状态 2: 登录输入页处理
  async handleLogin() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('error-message');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
      this.showError('请输入账号和密码');
      return;
    }
    
    try {
      const success = await this.performLogin(username, password);
      
      if (!success) {
        this.showError('登录失败，请检查账号和密码');
      }
      // 成功的情况已在 performLogin 中处理
    } catch (error) {
      console.error('Login error:', error);
      this.showError('登录过程中发生错误');
    }
  }

  async performLogin(username, password) {
    try {
      // 模拟登录成功（实际项目中这里应该是真实的 API 调用）
      const authData = {
        username: username,
        token: 'mock_token_' + Date.now(),
        loginTime: new Date().toISOString()
      };
      
      // 存储认证信息
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.set({ sj_auth: authData });
        } else {
          // 浏览器环境下使用 localStorage
          localStorage.setItem('sj_auth', JSON.stringify(authData));
        }
      } catch (storageError) {
        console.error('Storage error:', storageError);
        // 使用 localStorage 作为后备
        localStorage.setItem('sj_auth', JSON.stringify(authData));
      }
      
      this.userAuth = authData;
      
      // 切换到已登录状态
      this.switchToState(3);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  showError(message) {
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }

  // 状态 3: 已登录主页处理
  async handleAutofill() {
    if (!this.selectedResume) {
      this.showError('请先选择简历版本');
      return;
    }

    console.log('开始自动填写');
    // 切换到状态 4：自动填写中
    this.switchToState(4);
    
    // 重置进度
    this.autofillProgress = { filled: 0, total: 0 };
    
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 获取简历数据
      const profileData = await this.getProfileData();
      
      // 设置超时处理（15秒）
      this.autofillTimeout = setTimeout(() => {
        this.handleAutofillError('TIMEOUT', '超时，请重试');
      }, 15000);
      
      // 发送自动填写消息到 content script
      chrome.tabs.sendMessage(tab.id, {
        type: 'JC_AUTOFILL',
        resumeKey: this.selectedResume,
        profileSummary: profileData
      }, (response) => {
        if (chrome.runtime.lastError) {
          this.handleAutofillError('NO_CONTENT_SCRIPT', '无法与当前页面通信，请在目标职位页面重试');
          return;
        }
        
        this.handleAutofillResponse(response);
      });
      
    } catch (error) {
      console.error('Autofill error:', error);
      this.handleAutofillError('ERROR', error.message);
    }
  }

  sendAutofillMessage() {
    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const message = {
          type: 'JC_AUTOFILL',
          resumeKey: this.selectedResume,
          profileSummary: this.userAuth
        };
        
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            this.handleAutofillError('NO_CONTENT_SCRIPT', '无法与当前页面通信，请在目标职位页面重试');
            return;
          }
          
          if (response) {
            this.handleAutofillResponse(response);
          }
        });
      }
    });
  }

  handleAutofillResponse(response) {
    // 清除超时定时器
    if (this.autofillTimeout) {
      clearTimeout(this.autofillTimeout);
      this.autofillTimeout = null;
    }

    if (response.ok) {
      // 成功：切换到状态 5
      this.autofillProgress = {
        filled: response.filledCount || 0,
        total: response.totalCount || 0
      };
      this.autofillResult = {
        filledCount: response.filledCount || 0,
        totalCount: response.totalCount || 0,
        detail: response.detail || '填写成功'
      };
      this.switchToState(5);
    } else {
      // 失败：切换到状态 6
      this.handleAutofillError(response.reason, response.detail, response.missingFields);
    }
  }

  handleAutofillError(reason, detail, missingFields) {
    // 清除超时定时器
    if (this.autofillTimeout) {
      clearTimeout(this.autofillTimeout);
      this.autofillTimeout = null;
    }

    // 用户取消，直接返回状态 3
    if (reason === 'CANCELLED') {
      this.switchToState(3);
      return;
    }
    
    // 获取错误配置
    const errorConfig = this.getErrorMessage(reason, detail, missingFields);
    this.lastError = {
      reason,
      title: errorConfig.title,
      detail: errorConfig.detail,
      message: errorConfig.detail,
      missingFields,
      showEditButton: errorConfig.showEditButton
    };
    
    this.switchToState(6);
  }

  // 获取错误信息
  getErrorMessage(reason, detail, missingFields) {
    const errorConfigs = {
      'PARTIAL': {
        title: '部分字段填写失败',
        detail: `部分字段未填：${missingFields ? missingFields.join(', ') : '未知字段'}`,
        showEditButton: true
      },
      'UNSUPPORTED_SITE': {
        title: '站点不支持',
        detail: '当前站点暂不支持自动填写',
        showEditButton: false
      },
      'NO_FORM': {
        title: '未找到表单',
        detail: '未找到可填写的表单，请确认页面已加载完成',
        showEditButton: false
      },
      'NO_PROFILE': {
        title: '简历资料不完整',
        detail: '请先完善简历资料后再试',
        showEditButton: true
      },
      'NO_CONTENT_SCRIPT': {
        title: '页面通信失败',
        detail: '无法与当前页面通信，请在目标职位页面重试',
        showEditButton: false
      },
      'CANCELLED': {
        title: '操作已取消',
        detail: '用户主动取消了填写操作',
        showEditButton: false
      },
      'TIMEOUT': {
        title: '操作超时',
        detail: '填写操作超时，请检查网络后重试',
        showEditButton: false
      },
      'UNKNOWN': {
        title: '未知错误',
        detail: detail || '发生未知错误，请重试',
        showEditButton: false
      }
    };
    
    return errorConfigs[reason] || errorConfigs['UNKNOWN'];
  }

  // 设置导航图标事件
  setupNavigationIcons() {
    // Logo 点击 - 打开官网首页
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', () => {
        // 优先使用正式域名，开发时使用本地文件
        const homeUrl = 'https://jiancareer.com' || chrome.runtime.getURL('../jiancareer-front-end-main/index.html');
        chrome.tabs.create({ url: homeUrl });
      });
    }

    // 设置图标 - 打开扩展设置页
    const settingsIcon = document.querySelector('.nav-icon.settings');
    if (settingsIcon) {
      settingsIcon.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      });
    }

    // 首页图标 - 返回数据驱动落点
    const homeIcon = document.querySelector('.nav-icon.home');
    if (homeIcon) {
      homeIcon.addEventListener('click', async () => {
        const auth = await chrome.storage.local.get('sj_auth');
        if (auth.sj_auth) {
          // 已登录 - 返回档案管理中心或状态3
          this.currentState = 3;
          this.updateUI();
        } else {
          // 未登录 - 返回状态1或打开登录页
          this.currentState = 1;
          this.updateUI();
        }
      });
    }

    // 关闭图标 - 关闭弹窗
    const closeIcon = document.querySelector('.nav-icon.close');
    if (closeIcon) {
      closeIcon.addEventListener('click', () => {
        window.close();
      });
    }

    // 退出登录图标
    const logoutIcon = document.querySelector('.nav-icon.logout');
    if (logoutIcon) {
      logoutIcon.addEventListener('click', async () => {
        await chrome.storage.local.remove('sj_auth');
        this.currentState = 7;
        this.updateUI();
        
        // 2秒后返回状态1
        setTimeout(() => {
          this.currentState = 1;
          this.updateUI();
        }, 2000);
      });
    }
  }

  setupStateButtons() {
    // 状态 6 的重试按钮
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.handleAutofill();
      });
    }

    // 状态 6 的修改资料按钮
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => {
        window.open('https://jiancareer.com/profile', '_blank');
      });
    }

    // 状态 5 的关闭按钮
    const closeSuccessBtn = document.getElementById('close-success-btn');
    if (closeSuccessBtn) {
      closeSuccessBtn.addEventListener('click', () => {
        // 清除自动返回定时器
        if (this.returnTimeout) {
          clearTimeout(this.returnTimeout);
          this.returnTimeout = null;
        }
        // 清除结果数据并返回状态 3
        this.autofillResult = null;
        this.switchToState(3);
      });
    }

    // 状态 6 的关闭按钮
    const closeErrorBtn = document.getElementById('close-error-btn');
    if (closeErrorBtn) {
      closeErrorBtn.addEventListener('click', () => {
        this.switchToState(3);
      });
    }
  }

  updateAutofillProgress() {
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    const resumeVersionText = document.getElementById('resume-version-text');
    
    if (progressText) {
      if (this.autofillProgress.total > 0) {
        progressText.textContent = `已填 ${this.autofillProgress.filled}/${this.autofillProgress.total} 个字段`;
      } else {
        progressText.textContent = '正在分析表单...';
      }
    }
    
    if (progressBar) {
      const percentage = this.autofillProgress.total > 0 
        ? (this.autofillProgress.filled / this.autofillProgress.total) * 100 
        : 0;
      progressBar.style.width = `${percentage}%`;
    }
    
    if (resumeVersionText) {
      const resumeNames = {
        'resume-a': '简历版本 A',
        'resume-b': '简历版本 B',
        'resume-c': '简历版本 C'
      };
      resumeVersionText.textContent = `使用：${resumeNames[this.selectedResume] || '默认简历'}`;
    }
  }

  scheduleReturnToState3() {
    // 清除之前的定时器
    if (this.returnTimeout) {
      clearTimeout(this.returnTimeout);
    }
    
    // 设置5秒后自动返回状态3
    this.returnTimeout = setTimeout(() => {
      if (this.currentState === 5) {
        this.currentState = 3;
        this.autofillResult = null; // 清除结果数据
        this.updateUI();
      }
    }, 5000);
  }

  updateErrorMessage() {
    const errorMessageEl = document.getElementById('error-message');
    if (errorMessageEl && this.lastError) {
      errorMessageEl.textContent = this.lastError.message;
    }
    
    // 更新错误信息显示
    const errorMessageElement = document.querySelector('.error-message');
    const errorDetailElement = document.querySelector('.error-detail');
    
    if (errorMessageElement && this.lastError) {
      errorMessageElement.textContent = this.lastError.title || '填写失败，请重试';
    }
    
    if (errorDetailElement && this.lastError) {
      errorDetailElement.textContent = this.lastError.detail || '请检查表单或重新尝试';
    }
    
    // 根据错误类型显示或隐藏修改资料按钮
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
      if (this.lastError && this.lastError.showEditButton) {
        editProfileBtn.style.display = 'block';
      } else {
        editProfileBtn.style.display = 'none';
      }
    }
  }

  // 设置消息监听器
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'JC_AUTOFILL_PROGRESS') {
        this.autofillProgress = message.progress;
        this.updateAutofillProgress(message.progress);
      }
      return true;
    });
  }

  // 获取简历数据
  async getProfileData() {
    try {
      const result = await chrome.storage.local.get('sj_profile');
      return result.sj_profile || {
        name: '测试用户',
        phone: '13800138000',
        email: 'test@example.com',
        experience: '3-5年',
        education: '本科',
        resumeText: '这是一份测试简历内容...'
      };
    } catch (error) {
      console.error('Failed to get profile data:', error);
      return {};
    }
  }

  goToHomePage() {
    // 根据登录状态决定首页
    if (this.userAuth) {
      this.switchToState(3);
    } else {
      this.switchToState(1);
    }
  }

  handleLogout() {
    // 清除登录信息
    chrome.storage.local.remove('sj_auth', () => {
      this.userAuth = null;
      this.switchToState(7);
      
      // 2秒后自动跳转到状态 1
      setTimeout(() => {
        this.switchToState(1);
      }, 2000);
    });
  }

  openProfilePage() {
    // 这里应该跳转到状态 4（档案管理页）
    // 目前先打开设置页面
    chrome.runtime.openOptionsPage();
  }

  openFeedback() {
    chrome.tabs.create({
      url: 'https://jiancareer.com/feedback'
    });
  }

  showMessage(text, type = 'success') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 3000);
  }
}

// 当DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});