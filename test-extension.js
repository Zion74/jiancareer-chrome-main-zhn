// 扩展功能测试脚本
// 在浏览器控制台中运行此脚本来测试各项功能

console.log('🧪 开始测试 JianCareer AutoFill 扩展功能...');

// 测试1: 检查字段映射是否加载
function testFieldMappings() {
  console.log('\n📋 测试1: 字段映射加载');
  
  if (window.__SJ_FIELD_MAPPINGS__) {
    const mappingCount = Object.keys(window.__SJ_FIELD_MAPPINGS__).length;
    console.log('✅ 字段映射已加载:', mappingCount, '个字段类型');
    console.log('📝 可用字段类型:', Object.keys(window.__SJ_FIELD_MAPPINGS__));
    return true;
  } else {
    console.log('❌ 字段映射未加载');
    return false;
  }
}

// 测试2: 检查浮窗是否存在
function testTutorWidget() {
  console.log('\n🎯 测试2: 教程浮窗');
  
  const widget = document.getElementById('sj-autofill-tutor');
  if (widget) {
    console.log('✅ 教程浮窗已创建');
    console.log('👁️ 浮窗可见性:', widget.classList.contains('sj-visible'));
    return true;
  } else {
    console.log('❌ 教程浮窗未找到');
    return false;
  }
}

// 测试3: 检查表单检测功能
function testFormDetection() {
  console.log('\n🔍 测试3: 表单检测');
  
  const forms = document.querySelectorAll('form');
  console.log('📊 页面表单数量:', forms.length);
  
  forms.forEach((form, index) => {
    const inputs = form.querySelectorAll('input, textarea, select');
    console.log(`📝 表单 ${index + 1}: ${inputs.length} 个字段`);
    
    inputs.forEach((input, i) => {
      const type = input.type || input.tagName.toLowerCase();
      const name = input.name || input.id || `field-${i}`;
      const placeholder = input.placeholder || '';
      console.log(`  - ${name} (${type}): "${placeholder}"`);
    });
  });
  
  return forms.length > 0;
}

// 测试4: 测试字段识别功能
function testFieldIdentification() {
  console.log('\n🎯 测试4: 字段识别');
  
  if (!window.__SJ_MATCH_FIELD__) {
    console.log('❌ 字段匹配函数不可用');
    return false;
  }
  
  const testFields = [
    { id: 'firstName', name: 'firstName', placeholder: '请输入您的姓' },
    { id: 'email', type: 'email', placeholder: '请输入邮箱地址' },
    { id: 'phone', type: 'tel', placeholder: '请输入手机号码' },
    { id: 'wechat', name: 'wechat', placeholder: '请输入微信号' }
  ];
  
  testFields.forEach(fieldData => {
    // 创建模拟元素
    const mockElement = {
      getAttribute: (attr) => fieldData[attr] || null,
      ...fieldData
    };
    
    // 测试各种字段类型的匹配
    const fieldTypes = ['firstName', 'email', 'phone', 'wechat'];
    fieldTypes.forEach(fieldType => {
      const mappings = window.__SJ_GET_FIELD_MAPPING__(fieldType);
      const matches = window.__SJ_MATCH_FIELD__(mockElement, mappings);
      if (matches) {
        console.log(`✅ 字段 "${fieldData.id || fieldData.name}" 识别为: ${fieldType}`);
      }
    });
  });
  
  return true;
}

// 测试5: 测试握手协议
async function testHandshake() {
  console.log('\n🤝 测试5: 握手协议');
  
  try {
    // 检查是否有 chrome.runtime
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.log('❌ Chrome 扩展 API 不可用（可能未安装扩展）');
      return false;
    }
    
    const response = await chrome.runtime.sendMessage({
      type: 'GET_HANDSHAKE_STATUS'
    });
    
    if (response && response.success) {
      console.log('✅ 握手协议状态:', response.status);
      console.log('📋 字段映射加载状态:', response.fieldMappingsLoaded);
      return true;
    } else {
      console.log('❌ 握手协议失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 握手协议错误:', error.message);
    return false;
  }
}

// 测试6: 测试存储功能
async function testStorage() {
  console.log('\n💾 测试6: 存储功能');
  
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.log('❌ Chrome 扩展 API 不可用');
      return false;
    }
    
    // 测试获取用户档案
    const profileResponse = await chrome.runtime.sendMessage({
      type: 'GET_SJ_PROFILE'
    });
    
    console.log('👤 用户档案状态:', profileResponse.success ? '已配置' : '未配置');
    
    // 测试获取投递记录
    const appsResponse = await chrome.runtime.sendMessage({
      type: 'GET_SJ_APPLICATIONS'
    });
    
    console.log('📊 投递记录数量:', appsResponse.applications?.length || 0);
    
    return true;
  } catch (error) {
    console.log('❌ 存储测试错误:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 JianCareer AutoFill 扩展功能测试开始\n');
  
  const results = {
    fieldMappings: testFieldMappings(),
    tutorWidget: testTutorWidget(),
    formDetection: testFormDetection(),
    fieldIdentification: testFieldIdentification(),
    handshake: await testHandshake(),
    storage: await testStorage()
  };
  
  console.log('\n📊 测试结果汇总:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? '通过' : '失败'}`);
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n🎯 总体结果: ${passedCount}/${totalCount} 项测试通过`);
  
  if (passedCount === totalCount) {
    console.log('🎉 所有功能测试通过！扩展工作正常。');
  } else {
    console.log('⚠️ 部分功能存在问题，请检查扩展配置。');
  }
  
  return results;
}

// 自动运行测试
runAllTests();

// 导出测试函数供手动调用
window.AutoFillProTests = {
  runAllTests,
  testFieldMappings,
  testTutorWidget,
  testFormDetection,
  testFieldIdentification,
  testHandshake,
  testStorage
};

console.log('\n💡 提示: 可以通过 window.AutoFillProTests.runAllTests() 重新运行测试');