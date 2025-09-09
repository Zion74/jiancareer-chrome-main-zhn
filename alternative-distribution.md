# AutoFill Pro 替代分发方式指导

除了通过 Chrome Web Store 官方渠道分发外，AutoFill Pro 还支持多种替代分发方式，以满足不同用户和组织的需求。

## 📦 分发方式概览

| 分发方式 | 适用场景 | 安全性 | 更新方式 | 技术要求 |
|----------|----------|--------|----------|----------|
| Chrome Web Store | 个人用户，公开发布 | 最高 | 自动更新 | 无 |
| GitHub Releases | 开发者，测试版本 | 高 | 手动更新 | 基础 |
| 企业内部分发 | 企业用户，定制版本 | 高 | 管理员控制 | 中等 |
| 开发者模式 | 开发测试，本地构建 | 中等 | 手动更新 | 高 |
| 私有服务器 | 特殊需求，完全控制 | 可控 | 自定义 | 高 |

---

## 🐙 GitHub Releases 分发

### 📋 概述

GitHub Releases 是开源项目常用的分发方式，适合开发者和高级用户。

### ✅ 优势
- **版本控制**: 完整的版本历史和变更记录
- **透明度**: 开源代码，用户可审查
- **灵活性**: 支持预发布版本和测试版
- **社区**: 用户可提交问题和功能请求

### 📥 安装步骤

#### 1. 下载扩展包
```bash
# 访问 GitHub Releases 页面
https://github.com/autofillpro/chrome-extension/releases

# 下载最新版本的 .zip 文件
wget https://github.com/autofillpro/chrome-extension/releases/download/v1.0.0/AutoFill-Pro-v1.0.0.zip
```

#### 2. 解压文件
```bash
# 解压到指定目录
unzip AutoFill-Pro-v1.0.0.zip -d AutoFill-Pro/
```

#### 3. 安装到 Chrome
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 启用 "开发者模式"
4. 点击 "加载已解压的扩展程序"
5. 选择解压后的文件夹

### 🔄 更新流程

#### 自动检查更新
```javascript
// 在扩展中添加更新检查逻辑
const checkForUpdates = async () => {
  const response = await fetch('https://api.github.com/repos/autofillpro/chrome-extension/releases/latest');
  const release = await response.json();
  const latestVersion = release.tag_name;
  
  // 比较版本号并提示用户更新
  if (isNewerVersion(latestVersion, currentVersion)) {
    showUpdateNotification(release.html_url);
  }
};
```

#### 手动更新步骤
1. 访问 GitHub Releases 页面
2. 下载最新版本
3. 删除旧版本扩展
4. 按照安装步骤重新安装

---

## 🏢 企业内部分发

### 📋 概述

企业内部分发适合需要定制化或统一管理的组织。

### ✅ 优势
- **集中管理**: IT 部门统一部署和管理
- **定制化**: 可根据企业需求定制功能
- **安全控制**: 完全控制分发和更新过程
- **合规性**: 满足企业安全和合规要求

### 🛠️ 部署方案

#### 方案一：Chrome 企业策略

**1. 准备扩展包**
```json
// enterprise-policy.json
{
  "ExtensionInstallForcelist": [
    "your-extension-id;https://your-server.com/autofill-pro.crx"
  ],
  "ExtensionSettings": {
    "your-extension-id": {
      "installation_mode": "force_installed",
      "update_url": "https://your-server.com/updates.xml"
    }
  }
}
```

**2. 配置组策略**
```powershell
# Windows 组策略配置
New-ItemProperty -Path "HKLM\SOFTWARE\Policies\Google\Chrome" -Name "ExtensionInstallForcelist" -Value @("your-extension-id;https://your-server.com/autofill-pro.crx") -PropertyType MultiString
```

**3. 创建更新服务器**
```xml
<!-- updates.xml -->
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='your-extension-id'>
    <updatecheck codebase='https://your-server.com/autofill-pro.crx' version='1.0.0' />
  </app>
</gupdate>
```

#### 方案二：内部应用商店

**1. 搭建内部商店**
```javascript
// 简单的内部扩展商店
const express = require('express');
const app = express();

app.get('/extensions', (req, res) => {
  res.json({
    extensions: [
      {
        id: 'autofill-pro',
        name: 'AutoFill Pro',
        version: '1.0.0',
        downloadUrl: '/download/autofill-pro-1.0.0.crx',
        description: '智能自动填表扩展'
      }
    ]
  });
});

app.listen(3000);
```

**2. 员工安装流程**
1. 访问内部扩展商店
2. 下载 AutoFill Pro
3. 按照安装指导进行安装
4. 使用企业配置模板

### 🔧 定制化选项

#### 企业配置模板
```json
// enterprise-config.json
{
  "companyName": "Your Company",
  "defaultProfiles": [
    {
      "name": "企业标准模板",
      "fields": {
        "company": "Your Company",
        "department": "IT Department",
        "email": "@company.com"
      }
    }
  ],
  "restrictedSites": [
    "competitor.com",
    "blocked-site.com"
  ],
  "features": {
    "dataExport": false,
    "cloudSync": false,
    "statistics": true
  }
}
```

#### 品牌定制
```css
/* 企业主题样式 */
:root {
  --primary-color: #your-brand-color;
  --logo-url: url('data:image/svg+xml;base64,your-logo-base64');
}

.popup-header {
  background: var(--primary-color);
}

.logo::before {
  content: var(--logo-url);
}
```

---

## 🔧 开发者模式分发

### 📋 概述

开发者模式适合开发测试和高级用户使用。

### 🛠️ 本地构建

#### 1. 环境准备
```bash
# 安装 Node.js 和 npm
npm install -g pnpm

# 克隆项目
git clone https://github.com/autofillpro/chrome-extension.git
cd chrome-extension

# 安装依赖
pnpm install
```

#### 2. 构建扩展
```bash
# 开发模式构建
pnpm run dev

# 生产模式构建
pnpm run build

# 打包为 .crx 文件
pnpm run pack
```

#### 3. 加载扩展
1. 打开 `chrome://extensions/`
2. 启用开发者模式
3. 点击 "加载已解压的扩展程序"
4. 选择 `dist` 目录

### 🔄 热重载开发

```bash
# 启动开发服务器
pnpm run dev:watch

# 自动重载扩展
pnpm run reload
```

---

## 🖥️ 私有服务器分发

### 📋 概述

私有服务器分发提供最大的控制权和定制性。

### 🏗️ 服务器搭建

#### 1. 基础服务器
```javascript
// server.js - 简单的分发服务器
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// 扩展下载端点
app.get('/download/:version', (req, res) => {
  const version = req.params.version;
  const filePath = path.join(__dirname, 'releases', `autofill-pro-${version}.crx`);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('Version not found');
  }
});

// 更新检查端点
app.get('/updates.xml', (req, res) => {
  const updateXml = generateUpdateXml();
  res.set('Content-Type', 'application/xml');
  res.send(updateXml);
});

app.listen(8080);
```

#### 2. 安全配置
```javascript
// 添加认证和 HTTPS
const https = require('https');
const jwt = require('jsonwebtoken');

// JWT 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.sendStatus(401);
  }
  
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// 保护下载端点
app.get('/download/:version', authenticateToken, (req, res) => {
  // 下载逻辑
});
```

#### 3. 自动更新机制
```javascript
// 扩展内的更新检查
const checkForUpdates = async () => {
  try {
    const response = await fetch('https://your-server.com/api/version', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const { latestVersion, downloadUrl } = await response.json();
    
    if (isNewerVersion(latestVersion, currentVersion)) {
      showUpdatePrompt(downloadUrl);
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
};
```

---

## 📊 分发统计和监控

### 📈 使用统计

```javascript
// 统计代码示例
const trackInstallation = async () => {
  await fetch('https://analytics.your-server.com/install', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: chrome.runtime.getManifest().version,
      installDate: new Date().toISOString(),
      userAgent: navigator.userAgent,
      source: 'github-releases' // 或其他分发渠道
    })
  });
};
```

### 📊 监控面板

```javascript
// 简单的监控面板
app.get('/admin/stats', authenticateAdmin, (req, res) => {
  const stats = {
    totalDownloads: getTotalDownloads(),
    activeUsers: getActiveUsers(),
    versionDistribution: getVersionDistribution(),
    distributionChannels: getChannelStats()
  };
  
  res.json(stats);
});
```

---

## ⚠️ 安全注意事项

### 🔒 通用安全原则

1. **代码签名**: 使用有效的代码签名证书
2. **HTTPS 传输**: 所有下载链接使用 HTTPS
3. **完整性验证**: 提供文件哈希值供验证
4. **访问控制**: 实施适当的访问控制机制
5. **日志记录**: 记录所有下载和安装活动

### 🛡️ 文件完整性验证

```bash
# 生成文件哈希
sha256sum autofill-pro-1.0.0.crx > autofill-pro-1.0.0.crx.sha256

# 用户验证
sha256sum -c autofill-pro-1.0.0.crx.sha256
```

### 🔐 数字签名

```bash
# 使用 GPG 签名
gpg --armor --detach-sign autofill-pro-1.0.0.crx

# 验证签名
gpg --verify autofill-pro-1.0.0.crx.asc autofill-pro-1.0.0.crx
```

---

## 📞 技术支持

### 🆘 常见问题

**Q: 扩展无法加载？**
A: 检查是否启用了开发者模式，确认文件完整性。

**Q: 如何更新扩展？**
A: 根据分发方式选择对应的更新流程。

**Q: 企业部署遇到问题？**
A: 联系企业支持团队获取定制化解决方案。

### 📧 联系方式

- **技术支持**: tech-support@autofillpro.com
- **企业合作**: enterprise@autofillpro.com
- **开发者社区**: https://github.com/autofillpro/chrome-extension/discussions

---

**最后更新**: 2025年1月20日  
**文档版本**: 1.0  
**适用版本**: AutoFill Pro 1.0.0+