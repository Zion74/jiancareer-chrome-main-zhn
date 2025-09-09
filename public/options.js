// JianCareer AutoFill Options Script
// 处理设置页面的交互逻辑

class AutoFillOptions {
  constructor() {
    this.profiles = {};
    this.settings = {};
    this.websiteRules = {};
    this.analytics = {};
    this.currentEditingProfile = null;
    
    this.init();
  }

  async init() {
    console.log('[JianCareer AutoFill] Options page initialized');
    
    // 加载数据
    await this.loadData();
    
    // 初始化UI
    this.initializeUI();
    
    // 设置事件监听
    this.setupEventListeners();
    
    // 渲染内容
    this.renderProfiles();
    this.renderSettings();
    this.renderWebsites();
    this.renderAnalytics();
  }

  async loadData() {
    try {
      // 加载配置文件
      const profilesResponse = await chrome.runtime.sendMessage({
        type: 'GET_PROFILES'
      });
      
      if (profilesResponse.success) {
        this.profiles = profilesResponse.profiles;
      }
      
      // 加载设置
      const settingsResponse = await chrome.runtime.sendMessage({
        type: 'GET_SETTINGS'
      });
      
      if (settingsResponse.success) {
        this.settings = settingsResponse.settings;
      }
      
      // 加载网站规则
      const result = await chrome.storage.local.get(['websiteRules', 'analytics']);
      this.websiteRules = result.websiteRules || {};
      this.analytics = result.analytics || {
        totalFills: 0,
        successRate: 0,
        lastUsed: null,
        events: []
      };
      
    } catch (error) {
      console.error('[JianCareer AutoFill] Load data error:', error);
      this.showMessage('加载数据失败', 'error');
    }
  }

  initializeUI() {
    // 设置导航
    this.setupNavigation();
  }

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetSection = link.getAttribute('data-section');
        
        // 更新导航状态
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // 显示对应部分
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(targetSection).classList.add('active');
      });
    });
  }

  setupEventListeners() {
    // 添加配置文件按钮
    document.getElementById('addProfileBtn').addEventListener('click', () => {
      this.openProfileModal();
    });
    
    // 模态框关闭
    document.getElementById('closeModal').addEventListener('click', () => {
      this.closeProfileModal();
    });
    
    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.closeProfileModal();
    });
    
    // 点击模态框外部关闭
    document.getElementById('profileModal').addEventListener('click', (e) => {
      if (e.target.id === 'profileModal') {
        this.closeProfileModal();
      }
    });
    
    // 配置文件表单提交
    document.getElementById('profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProfile();
    });
    
    // 设置表单提交
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
    
    // 清除数据按钮
    document.getElementById('clearDataBtn').addEventListener('click', () => {
      this.clearAllData();
    });
  }

  renderProfiles() {
    const profilesList = document.getElementById('profilesList');
    
    if (Object.keys(this.profiles).length === 0) {
      profilesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <h3>暂无配置文件</h3>
          <p>创建您的第一个配置文件来开始使用自动填表功能</p>
        </div>
      `;
      return;
    }
    
    profilesList.innerHTML = Object.values(this.profiles).map(profile => `
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-name">${profile.name || '未命名配置'}</div>
          <div class="profile-actions">
            <button class="btn btn-secondary" onclick="optionsInstance.editProfile('${profile.id}')">
              <span>✏️</span>
              <span>编辑</span>
            </button>
            <button class="btn btn-danger" onclick="optionsInstance.deleteProfile('${profile.id}')">
              <span>🗑️</span>
              <span>删除</span>
            </button>
          </div>
        </div>
        <div class="profile-info">
          ${profile.firstName || profile.lastName ? `
            <div class="info-item">
              <div class="info-label">姓名</div>
              <div>${[profile.firstName, profile.lastName].filter(Boolean).join(' ') || '未设置'}</div>
            </div>
          ` : ''}
          ${profile.email ? `
            <div class="info-item">
              <div class="info-label">邮箱</div>
              <div>${profile.email}</div>
            </div>
          ` : ''}
          ${profile.phone ? `
            <div class="info-item">
              <div class="info-label">电话</div>
              <div>${profile.phone}</div>
            </div>
          ` : ''}
          ${profile.location ? `
            <div class="info-item">
              <div class="info-label">所在地</div>
              <div>${profile.location}</div>
            </div>
          ` : ''}
          ${profile.company ? `
            <div class="info-item">
              <div class="info-label">公司</div>
              <div>${profile.company}</div>
            </div>
          ` : ''}
          ${profile.position ? `
            <div class="info-item">
              <div class="info-label">职位</div>
              <div>${profile.position}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  renderSettings() {
    // 填充设置表单
    document.getElementById('autoFill').checked = this.settings.autoFill || false;
    document.getElementById('fillDelay').value = this.settings.fillDelay || 500;
    document.getElementById('confirmBeforeFill').checked = this.settings.confirmBeforeFill !== false;
    document.getElementById('autoSubmit').checked = this.settings.autoSubmit || false;
    document.getElementById('encryptData').checked = this.settings.encryptData !== false;
    document.getElementById('theme').value = this.settings.theme || 'light';
  }

  renderWebsites() {
    const websitesList = document.getElementById('websitesList');
    
    if (Object.keys(this.websiteRules).length === 0) {
      websitesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌐</div>
          <h3>暂无网站规则</h3>
          <p>网站规则将在扩展初始化时自动加载</p>
        </div>
      `;
      return;
    }
    
    websitesList.innerHTML = Object.entries(this.websiteRules).map(([domain, rule]) => `
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-name">${rule.name}</div>
          <div class="profile-actions">
            <span class="count-badge" style="background: ${rule.isActive ? '#28a745' : '#dc3545'}">
              ${rule.isActive ? '已启用' : '已禁用'}
            </span>
          </div>
        </div>
        <div class="profile-info">
          <div class="info-item">
            <div class="info-label">域名</div>
            <div>${domain}</div>
          </div>
          <div class="info-item">
            <div class="info-label">优先级</div>
            <div>${rule.priority}</div>
          </div>
          <div class="info-item">
            <div class="info-label">支持字段</div>
            <div>${Object.keys(rule.selectors || {}).length} 个</div>
          </div>
          <div class="info-item">
            <div class="info-label">操作数量</div>
            <div>${(rule.actions || []).length} 个</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderAnalytics() {
    const statsGrid = document.getElementById('statsGrid');
    
    // 计算统计数据
    const totalFills = this.analytics.totalFills || 0;
    const successRate = this.analytics.successRate || 0;
    const lastUsed = this.analytics.lastUsed ? new Date(this.analytics.lastUsed).toLocaleDateString() : '从未使用';
    const totalProfiles = Object.keys(this.profiles).length;
    const supportedSites = Object.keys(this.websiteRules).length;
    
    // 获取每日统计数据
    chrome.storage.local.get(['dailyStats'], (result) => {
      const dailyStats = result.dailyStats || {};
      
      // 计算最近7天的统计
      const last7Days = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        last7Days.push({
          date: dateStr,
          shortDate: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          stats: dailyStats[dateStr] || { totalActions: 0, formDetections: 0, formFills: 0, successfulFills: 0, websites: [] }
        });
      }
      
      // 计算本周总计
      const weeklyTotals = last7Days.reduce((acc, day) => {
        acc.totalActions += day.stats.totalActions;
        acc.formDetections += day.stats.formDetections;
        acc.formFills += day.stats.formFills;
        acc.successfulFills += day.stats.successfulFills;
        return acc;
      }, { totalActions: 0, formDetections: 0, formFills: 0, successfulFills: 0 });
      
      const weeklySuccessRate = weeklyTotals.formFills > 0 ? 
        Math.round((weeklyTotals.successfulFills / weeklyTotals.formFills) * 100) : 0;
      
      // 获取最活跃的网站
      const websiteStats = {};
      Object.values(dailyStats).forEach(day => {
        if (day.websites) {
          day.websites.forEach(website => {
            websiteStats[website] = (websiteStats[website] || 0) + day.formFills;
          });
        }
      });
      
      const topWebsites = Object.entries(websiteStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      statsGrid.innerHTML = `
        <div class="stats-overview">
          <h3>📊 使用统计</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${totalFills}</div>
              <div class="stat-label">总填写次数</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${successRate}%</div>
              <div class="stat-label">成功率</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${totalProfiles}</div>
              <div class="stat-label">配置文件数</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${supportedSites}</div>
              <div class="stat-label">支持网站数</div>
            </div>
            <div class="stat-card" style="grid-column: span 2;">
              <div class="stat-label">最后使用时间</div>
              <div style="font-size: 18px; font-weight: 600; color: #4A90E2; margin-top: 8px;">${lastUsed}</div>
            </div>
          </div>
        </div>
        
        <div class="weekly-stats">
          <h4>📈 本周统计</h4>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${weeklyTotals.formDetections}</div>
              <div class="stat-label">本周检测</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${weeklyTotals.formFills}</div>
              <div class="stat-label">本周填写</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${weeklySuccessRate}%</div>
              <div class="stat-label">本周成功率</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${weeklyTotals.totalActions}</div>
              <div class="stat-label">总操作数</div>
            </div>
          </div>
        </div>
        
        <div class="daily-chart">
          <h4>📅 最近7天趋势</h4>
          <div class="chart-container">
            ${last7Days.map(day => `
              <div class="chart-bar">
                <div class="bar" style="height: ${Math.max(5, (day.stats.formFills / Math.max(1, Math.max(...last7Days.map(d => d.stats.formFills)))) * 100)}%" title="${day.stats.formFills} 次填写"></div>
                <div class="bar-label">${day.shortDate}</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        ${topWebsites.length > 0 ? `
          <div class="top-websites">
            <h4>🌐 最活跃网站</h4>
            <div class="website-list">
              ${topWebsites.map(([website, count]) => `
                <div class="website-item">
                  <span class="website-name">${website}</span>
                  <span class="website-count">${count} 次</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="recent-activity">
          <h4>🕒 最近活动</h4>
          <div class="activity-list">
            ${this.analytics.events ? this.analytics.events.slice(-10).reverse().map(event => `
              <div class="activity-item">
                <span class="activity-action">${this.getActionText(event.event)}</span>
                <span class="activity-url">${this.getDomainFromUrl(event.data.url || event.data.domain || 'unknown')}</span>
                <span class="activity-time">${this.formatTime(event.timestamp)}</span>
                ${event.success === false ? '<span class="activity-status failed">失败</span>' : '<span class="activity-status success">成功</span>'}
              </div>
            `).join('') : '<div class="empty-state">暂无活动记录</div>'}
          </div>
        </div>
        
        <div class="stats-actions">
          <button id="exportStats" class="btn btn-secondary">📤 导出数据</button>
          <button id="clearStats" class="btn btn-danger">🗑️ 清除统计</button>
        </div>
      `;
      
      // 绑定导出和清除事件
      document.getElementById('exportStats')?.addEventListener('click', () => this.exportStats());
      document.getElementById('clearStats')?.addEventListener('click', () => this.clearStats());
    });
  }
  
  getActionText(action) {
    const actionMap = {
      'form_detected': '检测到表单',
      'form_filled': '自动填写',
      'profile_selected': '选择配置',
      'manual_fill': '手动填写',
      'error': '操作失败'
    };
    return actionMap[action] || action;
  }
  
  getDomainFromUrl(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
  
  formatTime(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  exportStats() {
    chrome.storage.local.get(['analytics', 'dailyStats'], (result) => {
      const data = {
        analytics: result.analytics || {},
        dailyStats: result.dailyStats || {},
        exportTime: new Date().toISOString(),
        profiles: Object.keys(this.profiles).length,
        websites: Object.keys(this.websiteRules).length
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autofill-stats-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showMessage('统计数据已导出', 'success');
    });
  }
  
  clearStats() {
    if (!confirm('确定要清除所有统计数据吗？此操作不可撤销。')) {
      return;
    }
    
    chrome.storage.local.remove(['analytics', 'dailyStats'], () => {
      this.analytics = {
        totalFills: 0,
        successRate: 0,
        lastUsed: null,
        events: []
      };
      
      this.renderAnalytics();
      this.showMessage('统计数据已清除', 'success');
    });
  }

  openProfileModal(profile = null) {
    const modal = document.getElementById('profileModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('profileForm');
    
    this.currentEditingProfile = profile;
    
    if (profile) {
      modalTitle.textContent = '编辑配置文件';
      this.fillProfileForm(profile);
    } else {
      modalTitle.textContent = '添加配置文件';
      form.reset();
      document.getElementById('profileId').value = '';
    }
    
    modal.classList.add('show');
  }

  closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.remove('show');
    this.currentEditingProfile = null;
  }

  fillProfileForm(profile) {
    document.getElementById('profileId').value = profile.id || '';
    document.getElementById('profileName').value = profile.name || '';
    document.getElementById('firstName').value = profile.firstName || '';
    document.getElementById('lastName').value = profile.lastName || '';
    document.getElementById('email').value = profile.email || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('location').value = profile.location || '';
    document.getElementById('company').value = profile.company || '';
    document.getElementById('position').value = profile.position || '';
    document.getElementById('experience').value = profile.experience || '';
    document.getElementById('education').value = profile.education || '';
    document.getElementById('skills').value = profile.skills || '';
    document.getElementById('summary').value = profile.summary || '';
  }

  async saveProfile() {
    try {
      const formData = new FormData(document.getElementById('profileForm'));
      const profileData = {
        id: document.getElementById('profileId').value || null,
        name: document.getElementById('profileName').value,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        location: document.getElementById('location').value,
        company: document.getElementById('company').value,
        position: document.getElementById('position').value,
        experience: document.getElementById('experience').value,
        education: document.getElementById('education').value,
        skills: document.getElementById('skills').value,
        summary: document.getElementById('summary').value
      };
      
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_PROFILE',
        payload: profileData
      });
      
      if (response.success) {
        this.showMessage('配置文件保存成功', 'success');
        this.closeProfileModal();
        
        // 重新加载数据并渲染
        await this.loadData();
        this.renderProfiles();
      } else {
        this.showMessage(response.error || '保存失败', 'error');
      }
    } catch (error) {
      console.error('[JianCareer AutoFill] Save profile error:', error);
      this.showMessage('保存失败，请重试', 'error');
    }
  }

  async deleteProfile(profileId) {
    if (!confirm('确定要删除这个配置文件吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_PROFILE',
        payload: { profileId }
      });
      
      if (response.success) {
        this.showMessage('配置文件删除成功', 'success');
        
        // 重新加载数据并渲染
        await this.loadData();
        this.renderProfiles();
        this.renderAnalytics();
      } else {
        this.showMessage(response.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('[JianCareer AutoFill] Delete profile error:', error);
      this.showMessage('删除失败，请重试', 'error');
    }
  }

  editProfile(profileId) {
    const profile = this.profiles[profileId];
    if (profile) {
      this.openProfileModal(profile);
    }
  }

  async saveSettings() {
    try {
      const settingsData = {
        autoFill: document.getElementById('autoFill').checked,
        fillDelay: parseInt(document.getElementById('fillDelay').value) || 500,
        confirmBeforeFill: document.getElementById('confirmBeforeFill').checked,
        autoSubmit: document.getElementById('autoSubmit').checked,
        encryptData: document.getElementById('encryptData').checked,
        theme: document.getElementById('theme').value
      };
      
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        payload: settingsData
      });
      
      if (response.success) {
        this.showMessage('设置保存成功', 'success');
        this.settings = settingsData;
      } else {
        this.showMessage(response.error || '保存失败', 'error');
      }
    } catch (error) {
      console.error('[AutoFill Pro] Save settings error:', error);
      this.showMessage('保存失败，请重试', 'error');
    }
  }

  async clearAllData() {
    if (!confirm('确定要清除所有数据吗？这将删除所有配置文件、设置和使用记录，此操作不可撤销。')) {
      return;
    }
    
    try {
      await chrome.storage.local.clear();
      
      // 重新初始化默认数据
      await chrome.runtime.sendMessage({ type: 'INIT_DEFAULT_DATA' });
      
      this.showMessage('所有数据已清除', 'success');
      
      // 重新加载页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('[AutoFill Pro] Clear data error:', error);
      this.showMessage('清除数据失败', 'error');
    }
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

// 全局实例，供HTML中的onclick事件使用
let optionsInstance;

// 当DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
  optionsInstance = new AutoFillOptions();
});