// 测试自动填写功能的脚本

// 模拟简历数据
const testProfileData = {
  name: '张三丰',
  firstName: '三丰',
  lastName: '张',
  fullName: '张三丰',
  phone: '13812345678',
  mobile: '13812345678',
  email: 'zhangsan@example.com',
  wechat: 'zhangsan123',
  city: '北京',
  location: '北京',
  github: 'https://github.com/zhangsan',
  githubUrl: 'https://github.com/zhangsan',
  university: '清华大学',
  school: '清华大学',
  major: '计算机科学与技术',
  specialty: '计算机科学与技术',
  graduationDate: '2023年6月',
  graduationTime: '2023年6月',
  gpa: '3.9',
  expectedSalary: '20000-30000',
  salary: '20000-30000',
  selfIntroduction: '我是一名优秀的软件工程师，具有丰富的项目经验。',
  introduction: '我是一名优秀的软件工程师，具有丰富的项目经验。',
  description: '我是一名优秀的软件工程师，具有丰富的项目经验。',
  resumeText: '我是一名优秀的软件工程师，具有丰富的项目经验。',
  summary: '我是一名优秀的软件工程师，具有丰富的项目经验。',
  workExperience: '5年软件开发经验',
  experience: '5年软件开发经验',
  education: '本科',
  degree: '本科',
  skills: 'Java, Python, JavaScript, React, Spring Boot',
  specialties: 'Java, Python, JavaScript, React, Spring Boot'
};

// 测试字段映射
function testFieldMapping() {
  console.log('=== 测试字段映射 ===');
  
  const mockFieldMappings = {
    name: '#name, input[name="name"], input[placeholder*="姓名"], input[placeholder*="名字"]',
    firstName: '#firstName, input[name="firstName"], input[placeholder*="名字"], input[placeholder*="姓名"]',
    lastName: '#lastName, input[name="lastName"], input[placeholder*="姓氏"], input[placeholder*="姓"]',
    phone: '#phone, input[name="phone"], input[type="tel"], input[placeholder*="电话"], input[placeholder*="手机"]',
    email: '#email, input[name="email"], input[type="email"], input[placeholder*="邮箱"], input[placeholder*="email"]',
    university: '#university, input[name="university"], input[name="school"], input[placeholder*="学校"], input[placeholder*="院校"]',
    major: '#major, input[name="major"], input[placeholder*="专业"]',
    location: '#location, input[name="location"], input[placeholder*="城市"], input[placeholder*="地址"]',
    education: '#education, select[name="education"], input[name="education"], select[placeholder*="学历"], input[placeholder*="学历"]',
    github: '#github, input[name="github"], input[placeholder*="github"], input[placeholder*="GitHub"]',
    gpa: '#gpa, input[name="gpa"], input[placeholder*="GPA"], input[placeholder*="绩点"]',
    skills: '#skills, textarea[name="skills"], textarea[placeholder*="技能"], textarea[placeholder*="专业"]',
    introduction: '#introduction, textarea[name="introduction"], textarea[placeholder*="简介"], textarea[placeholder*="介绍"]',
    experience: '#experience, textarea[name="experience"], textarea[placeholder*="经验"], textarea[placeholder*="经历"]',
    salary: '#salary, input[name="salary"], input[placeholder*="薪资"], input[placeholder*="工资"]',
    resume: '#resume, input[type="file"][name="resume"], input[accept*=".pdf"]',
    wechat: '#wechat, input[name="wechat"], input[placeholder*="微信"]',
    graduationTime: '#graduationTime, input[name="graduationTime"], input[name="graduation"], input[placeholder*="毕业"]'
  };
  
  // 检查每个字段是否能找到对应的元素
  for (const [fieldType, selector] of Object.entries(mockFieldMappings)) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`✓ 找到字段: ${fieldType} -> ${element.tagName}#${element.id || element.name}`);
    } else {
      console.warn(`✗ 未找到字段: ${fieldType} (${selector})`);
    }
  }
}

// 测试字段值获取
function testFieldValueMapping() {
  console.log('\n=== 测试字段值映射 ===');
  
  // 模拟getFieldValue方法
  function getFieldValue(fieldType, profileData) {
    // 处理姓名分离逻辑
    let firstName = profileData.firstName;
    let lastName = profileData.lastName;
    
    // 如果没有分离的姓名，尝试从fullName中分离
    if (!firstName && !lastName && profileData.fullName) {
      const fullName = profileData.fullName.trim();
      if (fullName.length >= 2) {
        // 中文姓名：第一个字符为姓，其余为名
        lastName = fullName.charAt(0);
        firstName = fullName.substring(1);
      } else {
        firstName = fullName;
        lastName = '';
      }
    }
    
    // 如果还是没有，使用name字段
    if (!firstName && !lastName && profileData.name) {
      const name = profileData.name.trim();
      if (name.length >= 2) {
        lastName = name.charAt(0);
        firstName = name.substring(1);
      } else {
        firstName = name;
        lastName = '';
      }
    }
    
    const mapping = {
      name: profileData.name || profileData.fullName || firstName + lastName,
      firstName: firstName || profileData.firstName,
      lastName: lastName || profileData.lastName || profileData.surname,
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
  
  // 测试所有字段的值映射
  const fieldTypes = ['name', 'firstName', 'lastName', 'phone', 'email', 'university', 'major', 'location', 'education', 'github', 'gpa', 'skills', 'introduction', 'experience', 'salary', 'wechat', 'graduationTime'];
  
  fieldTypes.forEach(fieldType => {
    const value = getFieldValue(fieldType, testProfileData);
    if (value) {
      console.log(`✓ ${fieldType}: ${value}`);
    } else {
      console.warn(`✗ ${fieldType}: 无值`);
    }
  });
}

// 运行测试
function runTests() {
  console.log('开始测试自动填写功能...');
  testFieldMapping();
  testFieldValueMapping();
  console.log('\n测试完成！');
}

// 页面加载完成后运行测试
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTests);
} else {
  runTests();
}

// 导出测试函数供手动调用
window.testAutofill = {
  runTests,
  testFieldMapping,
  testFieldValueMapping,
  testProfileData
};