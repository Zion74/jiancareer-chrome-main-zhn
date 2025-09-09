// JianCareer AutoFill Popup Script

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.currentState = 1; // 1: 未登录首页, 2: 登录输入页, 3: 已登录主页, 4: 自动填写中, 5: 填写成功, 6: 填写失败, 7: 退出登录
    this.userAuth = null;
    this.autofillTimeout = null;
    this.returnTimeout = null;
    this.selectedResume = 'resume-a';
    this.autofillProgress = { filled: 0, total: 0 };
    this.autofillResult = null;
    this.lastError = null;
    this.init();
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
    
    // 设置事件监听器和更新UI
    this.setupEventListeners();
    try {
      this.setupMessageListener();
    } catch (error) {
      console.log('Message listener setup failed, continuing without it');
    }
    this.updateUI();
    await this.updateProfileDisplay();
  }

  async getCurrentTab() {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
      } else {
        // 浏览器环境下返回模拟的tab对象
        return {
          id: 1,
          url: window.location.href,
          title: document.title
        };
      }
    } catch (error) {
      console.error('Error getting current tab:', error);
      return null;
    }
  }

  async checkAuthStatus() {
    try {
      let authData = null;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['sj_auth']);
        authData = result.sj_auth;
      } else {
        const stored = localStorage.getItem('sj_auth');
        authData = stored ? JSON.parse(stored) : null;
      }
      
      this.userAuth = authData || null;
      
      if (this.userAuth) {
        this.currentState = 3; // 已登录主页
      } else {
        this.currentState = 1; // 未登录首页
      }
      return this.userAuth;
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
        this.currentState = 3; // 已登录主页
      } else {
        this.currentState = 1; // 未登录首页
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
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.create({ url: 'https://jiancareer.com/register' });
        } else {
          window.open('https://jiancareer.com/register', '_blank');
        }
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
    
    // 初始化状态提示组件
    this.initStatusIndicator();

    // 修改/查看资料按钮
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.create({ url: 'https://jiancareer.com/profile' });
        } else {
          window.open('https://jiancareer.com/profile', '_blank');
        }
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

    // 编辑简历按钮
    const editResumeBtn = document.getElementById('edit-resume-btn');
    if (editResumeBtn) {
      editResumeBtn.addEventListener('click', () => {
        this.switchToState(8);
        this.loadResumeData();
      });
    }

    // 返回主页按钮
    const backToMainBtn = document.getElementById('back-to-main-btn');
    if (backToMainBtn) {
      backToMainBtn.addEventListener('click', () => {
        this.switchToState(3);
      });
    }

    // 取消编辑按钮
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        this.switchToState(3);
      });
    }

    // 简历编辑表单提交
    const resumeEditForm = document.getElementById('resume-edit-form');
    if (resumeEditForm) {
      resumeEditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveResumeData();
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
        
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.tabs) {
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
        } else {
          // 浏览器环境，直接打开外部链接
          window.open('https://jiancareer.com/feedback', '_blank');
        }
      });
    }

    // 教程按钮点击
    const tutorialBtn = document.getElementById('tutorial-btn');
    if (tutorialBtn) {
      tutorialBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.tabs) {
          // Chrome扩展环境，优先使用扩展内的教程页面
          const tutorialUrl = chrome.runtime.getURL('mock-form.html');
          const fallbackUrl = './mock-form.html';
          
          // 检查教程页面是否存在
          fetch(tutorialUrl)
            .then(response => {
              if (response.ok) {
                chrome.tabs.create({ url: tutorialUrl });
              } else {
                chrome.tabs.create({ url: fallbackUrl });
              }
            })
            .catch(() => {
              // 如果检查失败，尝试使用相对路径
              chrome.tabs.create({ url: fallbackUrl });
            });
        } else {
          // 浏览器环境，直接打开mock-form.html页面
          window.open('./mock-form.html', '_blank');
        }
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
      case 8:
        statusText.textContent = this.userAuth?.username || 'user6687331s';
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
    
    // 显示状态提示组件 - 自动填写中
    this.showStatusIndicator('processing', '自动填写中', '正在分析表单结构...');
    
    // 重置进度
    this.autofillProgress = { filled: 0, total: 0 };
    
    try {
      // 检查是否在 Chrome 扩展环境中
      const isChromeExtension = typeof chrome !== 'undefined' && chrome.tabs;
      
      if (isChromeExtension) {
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
      } else {
        // 浏览器环境下的模拟填写
        this.simulateAutofillProcess();
      }
      
    } catch (error) {
      console.error('Autofill error:', error);
      this.handleAutofillError('ERROR', error.message);
    }
  }
  
  // 模拟自动填写过程（用于浏览器环境测试）
  simulateAutofillProcess() {
    // 更新状态为正在填写
    this.updateStatusIndicator('processing', '自动填写中', '正在填写表单字段...');
    
    // 模拟填写过程
    setTimeout(() => {
      // 随机决定填写结果
      const outcomes = ['success', 'partial', 'error'];
      const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      
      switch (randomOutcome) {
        case 'success':
          this.autofillResult = {
            filledCount: 8,
            totalCount: 8,
            detail: '所有字段填写成功'
          };
          this.showStatusIndicator('success', '填写完成', '您的信息已成功填入求职网站中！');
          break;
        case 'partial':
          this.autofillResult = {
            filledCount: 5,
            totalCount: 8,
            detail: '部分字段填写成功，请手动完善剩余信息'
          };
          this.showStatusIndicator('partial', '部分完成', '已填写5/8个字段，请手动完善剩余信息');
          break;
        case 'error':
          this.lastError = {
            reason: 'FORM_ERROR',
            title: '填写失败',
            detail: '表单结构发生变化，请手动填写',
            message: '表单结构发生变化，请手动填写'
          };
          this.showStatusIndicator('error', '填写失败', '表单结构发生变化，请手动填写');
          break;
      }
      
      // 3秒后隐藏状态提示
      setTimeout(() => {
        this.hideStatusIndicator();
      }, 3000);
    }, 2000);
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
      // 成功：更新状态提示为成功
      this.autofillProgress = {
        filled: response.filledCount || 0,
        total: response.totalCount || 0
      };
      this.autofillResult = {
        filledCount: response.filledCount || 0,
        totalCount: response.totalCount || 0,
        detail: response.detail || '填写成功'
      };
      
      // 显示成功状态
      this.showStatusIndicator('success', '填写完成', `已成功填写 ${response.filledCount}/${response.totalCount} 个字段`);
      
      // 3秒后隐藏状态提示
      setTimeout(() => {
        this.hideStatusIndicator();
      }, 3000);
    } else {
      // 失败：显示错误状态
      this.handleAutofillError(response.reason, response.detail, response.missingFields);
    }
  }

  handleAutofillError(reason, detail, missingFields) {
    // 清除超时定时器
    if (this.autofillTimeout) {
      clearTimeout(this.autofillTimeout);
      this.autofillTimeout = null;
    }

    // 用户取消，隐藏状态提示
    if (reason === 'CANCELLED') {
      this.hideStatusIndicator();
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
    
    // 根据错误类型显示不同的状态
    if (reason === 'PARTIAL') {
      this.showStatusIndicator('partial', '部分完成', errorConfig.detail);
    } else {
      this.showStatusIndicator('error', '填写失败', errorConfig.detail);
    }
    
    // 3秒后隐藏状态提示
    setTimeout(() => {
      this.hideStatusIndicator();
    }, 3000);
  }

  // 状态提示组件方法
  initStatusIndicator() {
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusIcon = document.getElementById('status-icon');
    this.statusText = document.getElementById('status-text');
    this.statusDetail = document.getElementById('status-detail');
  }
  
  showStatusIndicator(type, text, detail) {
    if (!this.statusIndicator) return;
    
    // 移除所有状态类
    this.statusIndicator.classList.remove('processing', 'success', 'partial', 'error');
    
    // 添加新的状态类
    this.statusIndicator.classList.add(type);
    
    // 更新内容
    this.updateStatusContent(type, text, detail);
    
    // 显示组件
    this.statusIndicator.classList.add('show');
  }
  
  updateStatusIndicator(type, text, detail) {
    if (!this.statusIndicator) return;
    
    // 移除所有状态类
    this.statusIndicator.classList.remove('processing', 'success', 'partial', 'error');
    
    // 添加新的状态类
    this.statusIndicator.classList.add(type);
    
    // 更新内容
    this.updateStatusContent(type, text, detail);
  }
  
  updateStatusContent(type, text, detail) {
    const icons = {
      processing: '⏳',
      success: '✅',
      partial: '⚠️',
      error: '❌'
    };
    
    if (this.statusIcon) {
      this.statusIcon.textContent = icons[type] || '⏳';
    }
    
    if (this.statusText) {
      this.statusText.textContent = text;
    }
    
    if (this.statusDetail) {
      this.statusDetail.textContent = detail;
    }
  }
  
  hideStatusIndicator() {
    if (!this.statusIndicator) return;
    
    this.statusIndicator.classList.remove('show');
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
        const homeUrl = 'https://jiancareer.com';
        try {
          if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: homeUrl });
          } else {
            window.open(homeUrl, '_blank');
          }
        } catch (error) {
          console.log('Chrome API not available, opening in browser mode');
          window.open(homeUrl, '_blank');
        }
      });
    }

    // 设置图标 - 打开扩展设置页
    const settingsIcon = document.querySelector('.nav-icon.settings');
    if (settingsIcon) {
      settingsIcon.addEventListener('click', () => {
        try {
          if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
            chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
          } else {
            // 浏览器环境下打开设置页面
            window.open('./options.html', '_blank');
          }
        } catch (error) {
          console.log('Chrome API not available, opening in browser mode');
          window.open('./options.html', '_blank');
        }
      });
    }

    // 首页图标 - 返回数据驱动落点
    const homeIcon = document.querySelector('.nav-icon.home');
    if (homeIcon) {
      homeIcon.addEventListener('click', async () => {
        try {
          let auth = null;
          if (typeof chrome !== 'undefined' && chrome.storage) {
            const result = await chrome.storage.local.get('sj_auth');
            auth = result.sj_auth;
          } else {
            const authData = localStorage.getItem('sj_auth');
            auth = authData ? JSON.parse(authData) : null;
          }
          
          if (auth) {
            // 已登录 - 返回档案管理中心或状态3
            this.currentState = 3;
            this.updateUI();
          } else {
            // 未登录 - 返回状态1或打开登录页
            this.currentState = 1;
            this.updateUI();
          }
        } catch (error) {
          console.error('Error checking auth status:', error);
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
        try {
          if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.remove('sj_auth');
          } else {
            localStorage.removeItem('sj_auth');
          }
          
          this.userAuth = null;
          this.currentState = 7;
          this.updateUI();
          
          // 2秒后返回状态1
          setTimeout(() => {
            this.currentState = 1;
            this.updateUI();
          }, 2000);
        } catch (error) {
          console.error('Error during logout:', error);
          // 即使出错也要清除本地状态
          this.userAuth = null;
          this.currentState = 1;
          this.updateUI();
        }
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
    // 在浏览器环境中，暂时跳过Chrome扩展API调用
    console.log('Message listener setup - running in browser mode');
    
    // 可以在这里添加其他消息监听逻辑
    // 例如：window.addEventListener('message', this.handleMessage.bind(this));
  }

  // 获取简历数据
  async getProfileData() {
    try {
      let profiles = null;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['profiles']);
        profiles = result.profiles;
      } else {
        const stored = localStorage.getItem('profiles');
        profiles = stored ? JSON.parse(stored) : null;
      }
      
      profiles = profiles || {};
      
      // 查找默认简历或第一个简历
      const defaultProfile = Object.values(profiles).find(p => p.isDefault) || Object.values(profiles)[0];
      
      if (defaultProfile && defaultProfile.data) {
        return defaultProfile.data;
      }
      
      // 如果没有简历数据，返回空数据
      return {
        name: '',
        phone: '',
        email: '',
        experience: '',
        education: '',
        salary: ''
      };
    } catch (error) {
      console.error('获取简历数据失败:', error);
      return {
        name: '',
        phone: '',
        email: '',
        experience: '',
        education: '',
        salary: ''
      };
    }
  }

  // 执行自动填写
  async performAutofill() {
    const autofillBtn = document.getElementById('autofill-btn');
    
    try {
      // 设置按钮加载状态
      if (autofillBtn) {
        autofillBtn.disabled = true;
        autofillBtn.classList.add('loading');
        autofillBtn.textContent = '填写中...';
      }
      
      // 显示加载状态
      this.showMessage('正在执行自动填写...', 'info');
      
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('无法获取当前标签页');
      }
      
      // 获取简历数据
      const profileData = await this.getProfileData();
      
      if (!profileData || !profileData.name) {
        this.showMessage('请先设置简历信息', 'error');
        return;
      }
      
      // 向content script发送填写消息
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'AUTOFILL_REQUEST',
        data: profileData
      });
      
      // 处理填写结果
      this.handleAutofillResult(response);
      
    } catch (error) {
      console.error('自动填写失败:', error);
      this.showMessage('自动填写失败: ' + error.message, 'error');
    } finally {
      // 恢复按钮状态
      if (autofillBtn) {
        autofillBtn.disabled = false;
        autofillBtn.classList.remove('loading');
        autofillBtn.textContent = '一键填写';
      }
    }
  }

  // 处理自动填写结果
  handleAutofillResult(response) {
    if (!response) {
      this.showMessage('填写失败：无响应', 'error');
      return;
    }

    const { success, message, stats } = response;

    if (success) {
      if (stats) {
        const { filled, total, failed } = stats;
        if (failed > 0) {
          // 部分成功
          this.showMessage(`填写完成：成功 ${filled}/${total} 个字段，${failed} 个失败`, 'warning');
        } else {
          // 完全成功
          this.showMessage(`填写成功：已填写 ${filled} 个字段`, 'success');
        }
      } else {
        this.showMessage('自动填写完成！', 'success');
      }
    } else {
      this.showMessage(message || '自动填写失败', 'error');
    }

    // 记录填写历史
    this.recordFillHistory(response);
  }

  // 记录填写历史
  async recordFillHistory(result) {
    try {
      let tab = null;
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      }
      
      const historyItem = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        url: tab?.url || window.location?.href || '',
        domain: tab?.url ? new URL(tab.url).hostname : (window.location?.hostname || ''),
        success: result.success,
        message: result.message,
        stats: result.stats || { filled: 0, total: 0, failed: 0 }
      };

      // 获取现有历史记录
      let history = [];
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const storage = await chrome.storage.local.get(['fillHistory']);
        history = storage.fillHistory || [];
      } else {
        const stored = localStorage.getItem('fillHistory');
        history = stored ? JSON.parse(stored) : [];
      }
      
      // 添加新记录（保留最近100条）
      history.unshift(historyItem);
      if (history.length > 100) {
        history.splice(100);
      }

      // 保存历史记录
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ fillHistory: history });
      } else {
        localStorage.setItem('fillHistory', JSON.stringify(history));
      }
      
      console.log('填写历史已记录:', historyItem);
    } catch (error) {
      console.error('记录填写历史失败:', error);
    }
  }

  // 加载简历数据到编辑表单
  async loadResumeData() {
    try {
      const profileData = await this.getProfileData();
      
      // 填充表单字段
      const nameInput = document.getElementById('edit-name');
      const phoneInput = document.getElementById('edit-phone');
      const emailInput = document.getElementById('edit-email');
      const experienceSelect = document.getElementById('edit-experience');
      const educationSelect = document.getElementById('edit-education');
      const salaryInput = document.getElementById('edit-salary');
      
      if (nameInput) nameInput.value = profileData.name || '';
      if (phoneInput) phoneInput.value = profileData.phone || '';
      if (emailInput) emailInput.value = profileData.email || '';
      if (experienceSelect) experienceSelect.value = profileData.experience || '';
      if (educationSelect) educationSelect.value = profileData.education || '';
      if (salaryInput) salaryInput.value = profileData.salary || '';
      
      console.log('简历数据已加载到表单:', profileData);
    } catch (error) {
      console.error('加载简历数据失败:', error);
      this.showMessage('加载简历数据失败', 'error');
    }
  }

  // 验证表单数据
  validateFormData(data) {
    const errors = {};
    
    // 验证姓名
    if (!data.name || data.name.length < 2) {
      errors.name = '姓名至少需要2个字符';
    }
    
    // 验证邮箱
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email) {
      errors.email = '邮箱不能为空';
    } else if (!emailRegex.test(data.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    // 验证手机号
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!data.phone) {
      errors.phone = '手机号不能为空';
    } else if (!phoneRegex.test(data.phone)) {
      errors.phone = '请输入有效的手机号码';
    }
    
    // 验证学历
    if (!data.education) {
      errors.education = '请选择学历';
    }
    
    return errors;
  }
  
  // 显示字段错误
  showFieldErrors(errors) {
    // 清除之前的错误状态
    document.querySelectorAll('.form-group input, .form-group select').forEach(field => {
      field.classList.remove('error', 'success');
    });
    document.querySelectorAll('.field-error').forEach(error => {
      error.classList.remove('show');
    });
    
    // 显示新的错误
    Object.keys(errors).forEach(fieldName => {
      const field = document.getElementById(fieldName);
      if (field) {
        field.classList.add('error');
        
        // 查找或创建错误提示元素
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
          errorElement = document.createElement('div');
          errorElement.className = 'field-error';
          field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = errors[fieldName];
        errorElement.classList.add('show');
      }
    });
  }
  
  // 保存简历数据
  async saveResumeData() {
    try {
      // 获取表单数据
      const nameInput = document.getElementById('edit-name');
      const phoneInput = document.getElementById('edit-phone');
      const emailInput = document.getElementById('edit-email');
      const experienceSelect = document.getElementById('edit-experience');
      const educationSelect = document.getElementById('edit-education');
      const salarySelect = document.getElementById('edit-salary');
      
      const resumeData = {
        name: nameInput?.value || '',
        phone: phoneInput?.value || '',
        email: emailInput?.value || '',
        experience: experienceSelect?.value || '',
        education: educationSelect?.value || '',
        salary: salarySelect?.value || ''
      };
      
      console.log('准备保存简历数据:', resumeData);
      
      // 验证表单数据
      const errors = this.validateFormData(resumeData);
      if (Object.keys(errors).length > 0) {
        this.showFieldErrors(errors);
        this.showMessage('请修正表单中的错误', 'error');
        return;
      }
      
      // 清除错误状态，显示成功状态
      document.querySelectorAll('.form-group input, .form-group select').forEach(field => {
        field.classList.remove('error');
        field.classList.add('success');
      });
      document.querySelectorAll('.field-error').forEach(error => {
        error.classList.remove('show');
      });
      
      // 获取现有的简历数据
      let profiles = null;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['profiles']);
        profiles = result.profiles;
      } else {
        const stored = localStorage.getItem('profiles');
        profiles = stored ? JSON.parse(stored) : null;
      }
      
      profiles = profiles || {};
      
      // 查找默认简历或创建新的默认简历
      let defaultProfile = Object.values(profiles).find(p => p.isDefault);
      
      if (defaultProfile) {
        // 更新现有默认简历
        defaultProfile.data = resumeData;
        defaultProfile.updatedAt = new Date().toISOString();
        profiles[defaultProfile.id] = defaultProfile;
      } else {
        // 创建新的默认简历
        const profileId = 'default';
        profiles[profileId] = {
          id: profileId,
          name: '默认简历',
          isDefault: true,
          data: resumeData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // 保存数据
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ profiles });
      } else {
        localStorage.setItem('profiles', JSON.stringify(profiles));
      }
      
      console.log('简历数据已保存:', resumeData);
      
      // 显示成功消息
      this.showMessage('简历数据保存成功！', 'success');
      
      // 延迟返回主页
      setTimeout(() => {
        this.switchToState(3);
      }, 1500);
      
    } catch (error) {
      console.error('Failed to save resume data:', error);
      this.showMessage('保存简历数据失败', 'error');
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

  // 更新简历显示
  async updateProfileDisplay() {
    try {
      const profileData = await this.getProfileData();
      
      // 更新显示的简历信息
      const nameElement = document.querySelector('.profile-name');
      const phoneElement = document.querySelector('.profile-phone');
      const emailElement = document.querySelector('.profile-email');
      const experienceElement = document.querySelector('.profile-experience');
      const educationElement = document.querySelector('.profile-education');
      const salaryElement = document.querySelector('.profile-salary');
      
      if (nameElement) nameElement.textContent = profileData.name || '未设置';
      if (phoneElement) phoneElement.textContent = profileData.phone || '未设置';
      if (emailElement) emailElement.textContent = profileData.email || '未设置';
      if (experienceElement) experienceElement.textContent = profileData.experience || '未设置';
      if (educationElement) educationElement.textContent = profileData.education || '未设置';
      if (salaryElement) salaryElement.textContent = profileData.salary || '未设置';
      
      console.log('简历显示已更新:', profileData);
    } catch (error) {
      console.error('更新简历显示失败:', error);
    }
  }

  showMessage(text, type = 'success') {
    const messageEl = document.getElementById('message');
    if (messageEl) {
      messageEl.textContent = text;
      messageEl.className = `message ${type} show`;
      
      // 3秒后自动隐藏
      setTimeout(() => {
        messageEl.className = 'message hidden';
      }, 3000);
    }
  }


}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('DOM loaded, initializing popup manager...');
    const popupManager = new PopupManager();
    await popupManager.init();
    console.log('Popup manager initialized successfully');
  } catch (error) {
    console.error('Error initializing popup manager:', error);
    // 显示错误信息给用户
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position: fixed; top: 10px; left: 10px; right: 10px; background: #ff4444; color: white; padding: 10px; border-radius: 4px; z-index: 9999;';
    errorDiv.textContent = '插件初始化失败，请刷新页面重试';
    document.body.appendChild(errorDiv);
    
    // 3秒后自动隐藏错误信息
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 3000);
  }
});

// 备用初始化方案 - 如果DOMContentLoaded已经触发
if (document.readyState === 'loading') {
  // DOM还在加载中，等待DOMContentLoaded事件
} else {
  // DOM已经加载完成，直接初始化
  setTimeout(async () => {
    try {
      console.log('DOM already loaded, initializing popup manager...');
      const popupManager = new PopupManager();
      await popupManager.init();
      console.log('Popup manager initialized successfully (fallback)');
    } catch (error) {
      console.error('Error in fallback initialization:', error);
    }
  }, 0);
}