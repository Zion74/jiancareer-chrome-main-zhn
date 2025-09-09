# JianCareer AutoFill Chrome Web Store 发布指南

## 🎯 发布概览

本指南详细说明了如何将 JianCareer AutoFill Chrome 扩展发布到 Chrome Web Store。

### 📋 发布前准备清单
- [ ] Google 开发者账户 ($5 注册费)
- [ ] 扩展文件包 (ZIP 格式)
- [ ] 图标和截图素材
- [ ] 扩展描述文本
- [ ] 隐私政策文档
- [ ] 支持网站或联系方式

---

## 🚀 详细发布流程

### 第一步: 创建开发者账户

#### 1.1 注册 Google 开发者账户
1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. 使用 Google 账户登录
3. 支付 $5 一次性注册费用
4. 填写开发者信息:
   - 开发者名称: "JianCareer Team"
   - 联系邮箱: support@autofillpro.com
   - 网站 URL: https://autofillpro.com (可选)

#### 1.2 开发者验证
- 完成身份验证流程
- 提供必要的身份证明文件
- 等待验证通过 (通常1-2个工作日)

### 第二步: 准备扩展文件

#### 2.1 构建生产版本
```bash
# 在项目根目录执行
npm run build

# 检查构建结果
ls dist/
```

#### 2.2 创建发布包
1. 确保 `dist` 目录包含所有必要文件:
   ```
   dist/
   ├── manifest.json
   ├── popup/
   │   ├── index.html
   │   ├── assets/
   └── content/
       └── content.js
   ```

2. 创建 ZIP 文件:
   - 选择 `dist` 目录下的所有文件
   - 压缩为 `AutoFill-Pro-v1.0.0.zip`
   - 确保文件大小 < 128MB

#### 2.3 验证 manifest.json
```json
{
  "manifest_version": 3,
  "name": "AutoFill Pro - 智能自动填表助手",
  "version": "1.0.0",
  "description": "智能自动填表工具，一键填写求职申请、注册表单，支持主流招聘网站，提升效率90%，安全可靠。",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 第三步: 上传和配置扩展

#### 3.1 创建新扩展项目
1. 登录 Chrome Web Store Developer Dashboard
2. 点击 "Add new item" 按钮
3. 上传准备好的 ZIP 文件
4. 等待文件处理完成

#### 3.2 填写基本信息

**扩展详情**:
- **名称**: JianCareer AutoFill - 智能自动填表助手
- **摘要**: 智能自动填表工具，一键填写求职申请、注册表单，支持主流招聘网站，提升效率90%，安全可靠。
- **类别**: 生产力工具 (Productivity)
- **语言**: 中文(简体), English

**详细描述**: (使用之前准备的详细描述文本)

#### 3.3 上传图标和截图

**图标要求**:
- 128x128 像素 PNG 格式
- 上传 `store-assets/icons/store-icon.png`

**截图要求**:
1. 上传 4 张应用截图 (1280x800 像素)
2. 按顺序上传:
   - screenshot-1-main-panel.png
   - screenshot-2-autofill-demo.png
   - screenshot-3-settings.png
   - screenshot-4-analytics.png

**宣传图片** (可选):
- 大宣传图: 440x280 像素
- 小宣传图: 220x140 像素

#### 3.4 隐私设置

**隐私政策**:
- 提供隐私政策 URL: https://autofillpro.com/privacy
- 或直接在文本框中粘贴隐私政策内容

**数据使用声明**:
- [ ] 不收集用户数据
- [ ] 数据仅在本地存储
- [ ] 不与第三方共享信息

**权限说明**:
- `activeTab`: 在当前标签页识别和填写表单
- `storage`: 本地存储用户信息模板和设置
- `scripting`: 注入内容脚本实现自动填表功能

#### 3.5 分发设置

**可见性**:
- [x] 公开 - 在 Chrome Web Store 中列出
- [ ] 不公开 - 仅通过直接链接访问

**地区限制**:
- 选择 "所有地区" 或指定特定国家/地区

**定价**:
- 选择 "免费"

### 第四步: 提交审核

#### 4.1 最终检查
- [ ] 所有必填字段已完成
- [ ] 图标和截图已上传
- [ ] 隐私政策已提供
- [ ] 扩展功能正常工作
- [ ] 描述准确无误

#### 4.2 提交审核
1. 点击 "Submit for review" 按钮
2. 确认提交信息
3. 等待审核结果

#### 4.3 审核时间
- **首次提交**: 通常需要 1-3 个工作日
- **更新版本**: 通常需要几小时到 1 个工作日
- **复杂扩展**: 可能需要更长时间

---

## 📋 审核常见问题和解决方案

### 问题 1: 权限过度申请
**症状**: 审核被拒，提示权限申请过多

**解决方案**:
1. 检查 `manifest.json` 中的权限列表
2. 移除不必要的权限
3. 在描述中详细说明每个权限的用途
4. 重新提交审核

### 问题 2: 功能描述不准确
**症状**: 实际功能与描述不符

**解决方案**:
1. 更新扩展描述，确保与实际功能一致
2. 更新截图，展示真实的功能界面
3. 测试所有声称的功能
4. 重新提交

### 问题 3: 隐私政策问题
**症状**: 缺少隐私政策或政策不完整

**解决方案**:
1. 创建完整的隐私政策文档
2. 确保政策涵盖所有数据收集和使用情况
3. 提供可访问的隐私政策 URL
4. 重新提交

### 问题 4: 图标质量问题
**症状**: 图标模糊或不符合规范

**解决方案**:
1. 重新制作高质量图标 (128x128 像素)
2. 确保图标在不同背景下清晰可见
3. 使用 PNG 格式，避免 JPEG
4. 重新上传并提交

---

## 🎉 发布成功后的操作

### 发布确认
1. 收到审核通过邮件通知
2. 扩展在 Chrome Web Store 上线
3. 获得扩展的商店 URL

### 推广和营销
1. **社交媒体宣传**:
   - 在 LinkedIn、Twitter 等平台分享
   - 创建产品介绍视频

2. **内容营销**:
   - 撰写博客文章介绍功能
   - 制作使用教程和指南

3. **用户反馈收集**:
   - 监控用户评论和评分
   - 及时回复用户问题
   - 收集功能改进建议

### 数据监控
1. **安装数据**:
   - 监控每日安装量
   - 分析用户地理分布
   - 跟踪增长趋势

2. **用户反馈**:
   - 定期查看用户评论
   - 分析评分变化
   - 识别常见问题

3. **性能指标**:
   - 监控扩展性能
   - 跟踪错误报告
   - 优化用户体验

---

## 🔄 版本更新流程

### 准备更新
1. 修复已知问题
2. 添加新功能
3. 更新版本号 (遵循语义化版本)
4. 更新 changelog

### 发布更新
1. 构建新版本
2. 在开发者控制台上传新的 ZIP 文件
3. 更新版本说明
4. 提交审核

### 更新最佳实践
- 保持向后兼容性
- 提供详细的更新说明
- 逐步推出重大更改
- 监控更新后的用户反馈

---

## 📞 支持和资源

### 官方资源
- [Chrome Web Store 开发者文档](https://developer.chrome.com/docs/webstore/)
- [Chrome 扩展开发指南](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 迁移指南](https://developer.chrome.com/docs/extensions/migrating/)

### 社区支持
- [Chrome Extensions Google Group](https://groups.google.com/a/chromium.org/g/chromium-extensions)
- [Stack Overflow - Chrome Extension](https://stackoverflow.com/questions/tagged/google-chrome-extension)
- [Reddit - Chrome Extensions](https://www.reddit.com/r/chrome_extensions/)

### 联系方式
- **技术支持**: support@autofillpro.com
- **商务合作**: business@autofillpro.com
- **问题反馈**: https://github.com/autofillpro/feedback

---

**注意**: 此指南基于 Chrome Web Store 当前政策和流程，政策可能会更新。发布前请查看最新的官方文档和要求。