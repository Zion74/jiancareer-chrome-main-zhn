// formFieldMappings.js
// 全局暴露，供 content.js 直接读取；可热改，无需重构建
window.__SJ_FIELD_MAPPINGS__ = {
  // 通用字段（英文 + 中文）
  firstName: [
    { name: 'firstName' }, { id: 'firstName' },
    { 'aria-label': /first\s*name/i },
    { placeholder: /姓|first/i }
  ],
  lastName: [
    { name: 'lastName' }, { id: 'lastName' },
    { 'aria-label': /last\s*name/i },
    { placeholder: /名|last/i }
  ],
  fullName: [
    { name: 'name' }, { id: 'name' }, { name: 'fullName' },
    { 'aria-label': /full\s*name|姓名/i },
    { placeholder: /姓名|全名|name/i }
  ],
  email: [
    { type: 'email' }, { name: 'email' },
    { 'aria-label': /email|邮箱/i },
    { placeholder: /邮箱|email/i }
  ],
  phone: [
    { type: 'tel' }, { name: 'phone' }, { name: 'mobile' },
    { 'aria-label': /phone|手机|电话/i },
    { placeholder: /手机|电话|phone/i }
  ],
  location: [
    { name: 'location' }, { name: 'address' }, { name: 'city' },
    { 'aria-label': /location|address|城市|地址/i },
    { placeholder: /城市|地点|地址|location/i }
  ],
  wechat: [
    { name: 'wechat' }, { id: 'wechat' }, { name: 'weixin' },
    { 'aria-label': /微信|wechat/i },
    { placeholder: /微信|wechat/i }
  ],
  qq: [
    { name: 'qq' }, { id: 'qq' },
    { 'aria-label': /QQ/i },
    { placeholder: /QQ/i }
  ],
  linkedin: [
    { name: /linkedin/i }, { id: /linkedin/i },
    { 'aria-label': /linkedin/i },
    { placeholder: /LinkedIn/i }
  ],
  github: [
    { name: /github/i }, { id: /github/i },
    { 'aria-label': /github/i },
    { placeholder: /GitHub/i }
  ],
  portfolio: [
    { name: /portfolio|website/i }, { id: /portfolio|website/i },
    { 'aria-label': /portfolio|website|作品集/i },
    { placeholder: /作品集|个人网站|portfolio/i }
  ],
  birthday: [
    { name: /birth|birthday|dob/i }, { id: /birth|birthday/i },
    { type: 'date' },
    { 'aria-label': /birth|birthday|出生|生日/i },
    { placeholder: /出生|生日|birthday/i }
  ],
  graduation: [
    { name: /graduation|grad/i }, { id: /graduation/i },
    { 'aria-label': /graduation|毕业/i },
    { placeholder: /毕业|graduation/i }
  ],
  gpa: [
    { name: /gpa/i }, { id: /gpa/i },
    { 'aria-label': /gpa|绩点/i },
    { placeholder: /GPA|绩点/i }
  ],
  // 教育相关字段
  school: [
    { name: /school|university|college/i },
    { 'aria-label': /学校|大学|school/i },
    { placeholder: /学校|大学|school/i }
  ],
  major: [
    { name: /major|专业/i },
    { 'aria-label': /major|专业/i },
    { placeholder: /专业|major/i }
  ],
  degree: [
    { name: /degree|学位/i },
    { 'aria-label': /degree|学位/i },
    { placeholder: /学位|degree/i }
  ],
  // 工作相关字段
  company: [
    { name: /company|employer/i },
    { 'aria-label': /company|公司|employer/i },
    { placeholder: /公司|company/i }
  ],
  position: [
    { name: /position|title|job/i },
    { 'aria-label': /position|职位|title/i },
    { placeholder: /职位|position/i }
  ],
  experience: [
    { name: /experience|工作经验/i },
    { 'aria-label': /experience|经验/i },
    { placeholder: /工作经验|experience/i }
  ],
  // 技能相关字段
  skills: [
    { name: /skills|技能/i },
    { 'aria-label': /skills|技能/i },
    { placeholder: /技能|skills/i }
  ],
  // 期望相关字段
  expectedSalary: [
    { name: /salary|expected.*salary|期望.*薪资/i },
    { 'aria-label': /salary|薪资|expected/i },
    { placeholder: /期望薪资|salary/i }
  ],
  expectedPosition: [
    { name: /expected.*position|期望.*职位/i },
    { 'aria-label': /expected.*position|期望.*职位/i },
    { placeholder: /期望职位|expected.*position/i }
  ],
  // 个人介绍
  selfIntroduction: [
    { name: /introduction|self.*intro|个人介绍/i },
    { 'aria-label': /introduction|介绍|self/i },
    { placeholder: /个人介绍|自我介绍|introduction/i }
  ],
  // 性别
  gender: [
    { name: /gender|sex|性别/i },
    { 'aria-label': /gender|性别/i },
    { placeholder: /性别|gender/i }
  ],
  // 年龄
  age: [
    { name: /age|年龄/i },
    { 'aria-label': /age|年龄/i },
    { placeholder: /年龄|age/i }
  ],
  
  // 测试字段：用于验证热改功能
  testField: [
    { name: 'testField' }, 
    { id: 'testField' }, 
    { placeholder: /测试字段|test field/i }
  ]
};

// 提供一个获取映射的辅助函数
window.__SJ_GET_FIELD_MAPPING__ = function(fieldName) {
  return window.__SJ_FIELD_MAPPINGS__[fieldName] || [];
};

// 提供一个检查字段是否匹配的辅助函数
window.__SJ_MATCH_FIELD__ = function(element, fieldMappings) {
  if (!fieldMappings || !Array.isArray(fieldMappings)) return false;
  
  for (const mapping of fieldMappings) {
    for (const [attr, value] of Object.entries(mapping)) {
      const elementValue = element.getAttribute(attr) || element[attr];
      
      if (value instanceof RegExp) {
        if (elementValue && value.test(elementValue)) return true;
      } else if (typeof value === 'string') {
        if (elementValue === value) return true;
      }
    }
  }
  
  return false;
};

// 热改功能验证：输出映射加载状态
console.log('[FormFieldMappings] 字段映射文件已加载，支持热改功能');
console.log('[FormFieldMappings] 当前映射字段数量:', Object.keys(window.__SJ_FIELD_MAPPINGS__).length);
console.log('✅ SJ Field Mappings loaded successfully!', Object.keys(window.__SJ_FIELD_MAPPINGS__).length, 'field types available');