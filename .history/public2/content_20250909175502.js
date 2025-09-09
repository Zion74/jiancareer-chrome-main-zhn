// 简历数据（MVP 硬编码）
const resumeData = {
  name: "张三",
  phone: "13800138000",
  email: "zhangsan@example.com",
  school: "北京大学",
  major: "计算机科学与技术",
};

// 字段映射（selector → resumeData key）
const fieldMap = {
  "#name": "name",
  "#phone": "phone",
  "#email": "email",
  "#school": "school",
  "#major": "major",
};

// 填充函数
function fillForm() {
  console.log("[OnceResume MVP] 开始自动填写...");

  for (let selector in fieldMap) {
    const element = document.querySelector(selector);
    if (element) {
      const key = fieldMap[selector];
      const value = resumeData[key];
      if (value !== undefined) {
        element.value = value;

        // 触发 input/change 事件，让页面监听器感知变化
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));

        console.log(`✅ 填写了 ${selector} → ${value}`);
      }
    } else {
      console.warn(`⚠️ 未找到字段：${selector}`);
    }
  }

  alert("🎉 简历已自动填写完成！请检查后提交。");
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm") {
    fillForm();
    sendResponse({ status: "done" });
  }
});
