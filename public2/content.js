// 简历自动填写内容脚本
class AutoFillManager {
  constructor() {
    this.fieldMappings = {
      // 姓名字段映射
      fullName: [
        'input[name*="name"]',
        'input[placeholder*="姓名"]',
        'input[placeholder*="真实姓名"]',
        'input[id*="name"]',
        'input[class*="name"]',
        'input[name="realName"]',
        'input[name="userName"]',
        'input[name="fullName"]',
      ],
      // 手机号字段映射
      phone: [
        'input[name*="phone"]',
        'input[name*="mobile"]',
        'input[placeholder*="手机"]',
        'input[placeholder*="电话"]',
        'input[id*="phone"]',
        'input[id*="mobile"]',
        'input[type="tel"]',
        'input[name="phoneNumber"]',
        'input[name="mobilePhone"]',
      ],
      // 邮箱字段映射
      email: [
        'input[type="email"]',
        'input[name*="email"]',
        'input[name*="mail"]',
        'input[placeholder*="邮箱"]',
        'input[placeholder*="邮件"]',
        'input[id*="email"]',
        'input[id*="mail"]',
      ],
      // 学历字段映射
      education: [
        'select[name*="education"]',
        'select[name*="degree"]',
        'select[placeholder*="学历"]',
        'select[id*="education"]',
        'select[id*="degree"]',
        'input[name*="education"]',
        'input[name*="degree"]',
      ],
      // 工作年限字段映射
      workYears: [
        'select[name*="experience"]',
        'select[name*="work"]',
        'select[name*="year"]',
        'input[name*="experience"]',
        'input[name*="workYear"]',
        'select[id*="experience"]',
        'select[id*="work"]',
      ],
      // 性别字段映射
      gender: [
        'select[name*="gender"]',
        'select[name*="sex"]',
        'input[name*="gender"]',
        'input[name*="sex"]',
        'select[id*="gender"]',
        'select[id*="sex"]',
      ],
      // 出生日期字段映射
      birthDate: [
        'input[type="date"]',
        'input[name*="birth"]',
        'input[name*="birthday"]',
        'input[placeholder*="出生"]',
        'input[id*="birth"]',
        'input[id*="birthday"]',
      ],
      // 毕业院校字段映射
      school: [
        'input[name*="school"]',
        'input[name*="university"]',
        'input[name*="college"]',
        'input[placeholder*="学校"]',
        'input[placeholder*="院校"]',
        'input[id*="school"]',
        'input[id*="university"]',
      ],
      // 专业字段映射
      major: [
        'input[name*="major"]',
        'input[name*="specialty"]',
        'input[placeholder*="专业"]',
        'input[id*="major"]',
        'input[id*="specialty"]',
      ],
      // 现居住地字段映射
      currentCity: [
        'input[name*="city"]',
        'input[name*="location"]',
        'input[name*="address"]',
        'input[placeholder*="城市"]',
        'input[placeholder*="地址"]',
        'select[name*="city"]',
        'select[name*="location"]',
      ],
      // 自我介绍字段映射
      selfIntroduction: [
        'textarea[name*="introduction"]',
        'textarea[name*="description"]',
        'textarea[name*="summary"]',
        'textarea[placeholder*="自我介绍"]',
        'textarea[placeholder*="个人简介"]',
        'textarea[id*="introduction"]',
        'textarea[id*="description"]',
      ],
    };

    this.init();
  }

  init() {
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "autoFill") {
        this.performAutoFill(request.data);
        sendResponse({ success: true });
      }
      return true;
    });

    // 页面加载完成后检测表单
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.detectForms();
      });
    } else {
      this.detectForms();
    }
  }

  // 检测页面中的表单
  detectForms() {
    const forms = document.querySelectorAll("form");
    const inputs = document.querySelectorAll("input, select, textarea");

    if (forms.length > 0 || inputs.length > 0) {
      console.log(`检测到 ${forms.length} 个表单，${inputs.length} 个输入字段`);
      this.addAutoFillButton();
    }
  }

  // 添加自动填写按钮到页面
  addAutoFillButton() {
    // 避免重复添加
    if (document.getElementById("autoFillFloatBtn")) {
      return;
    }

    const button = document.createElement("div");
    button.id = "autoFillFloatBtn";
    button.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: #6366F1;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        user-select: none;
      " onmouseover="this.style.background='#5B5BD6'" onmouseout="this.style.background='#6366F1'">
        🚀 一键填写简历
      </div>
    `;

    button.addEventListener("click", () => {
      this.requestAutoFill();
    });

    document.body.appendChild(button);
  }

  // 请求自动填写
  async requestAutoFill() {
    try {
      const result = await chrome.storage.local.get(["resumeData"]);
      if (result.resumeData) {
        this.performAutoFill(result.resumeData);
      } else {
        this.showNotification("请先在插件中填写简历信息", "warning");
      }
    } catch (error) {
      console.error("获取简历数据失败:", error);
      this.showNotification("获取简历数据失败", "error");
    }
  }

  // 执行自动填写
  performAutoFill(resumeData) {
    let filledCount = 0;
    let totalFields = 0;

    // 遍历所有字段映射
    Object.keys(this.fieldMappings).forEach((fieldKey) => {
      const value = resumeData[fieldKey];
      if (!value) return;

      const selectors = this.fieldMappings[fieldKey];
      let fieldFilled = false;

      // 尝试每个选择器
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);

        elements.forEach((element) => {
          if (fieldFilled) return; // 已经填写过这个字段了

          totalFields++;
          if (this.fillField(element, fieldKey, value)) {
            filledCount++;
            fieldFilled = true;
            console.log(`成功填写字段: ${fieldKey} = ${value}`);
          }
        });

        if (fieldFilled) break;
      }
    });

    // 显示填写结果
    const message = `自动填写完成！成功填写 ${filledCount}/${totalFields} 个字段`;
    this.showNotification(message, filledCount > 0 ? "success" : "warning");

    // 高亮显示已填写的字段
    this.highlightFilledFields();
  }

  // 填写单个字段
  fillField(element, fieldKey, value) {
    try {
      if (element.disabled || element.readOnly) {
        return false;
      }

      const tagName = element.tagName.toLowerCase();
      const inputType = element.type ? element.type.toLowerCase() : "";

      // 处理不同类型的输入元素
      if (tagName === "input") {
        if (
          inputType === "text" ||
          inputType === "email" ||
          inputType === "tel" ||
          inputType === "date"
        ) {
          return this.fillTextInput(element, value, fieldKey);
        } else if (inputType === "radio") {
          return this.fillRadioInput(element, value);
        } else if (inputType === "checkbox") {
          return this.fillCheckboxInput(element, value);
        }
      } else if (tagName === "select") {
        return this.fillSelectInput(element, value);
      } else if (tagName === "textarea") {
        return this.fillTextareaInput(element, value);
      }

      return false;
    } catch (error) {
      console.error(`填写字段失败: ${fieldKey}`, error);
      return false;
    }
  }

  // 填写文本输入框
  fillTextInput(element, value, fieldKey) {
    // 特殊处理日期字段
    if (fieldKey === "birthDate" && element.type === "date") {
      // 确保日期格式为 YYYY-MM-DD
      const dateValue = this.formatDate(value);
      if (dateValue) {
        element.value = dateValue;
        this.triggerEvents(element);
        return true;
      }
      return false;
    }

    element.value = value;
    this.triggerEvents(element);
    return true;
  }

  // 填写下拉选择框
  fillSelectInput(element, value) {
    const options = element.querySelectorAll("option");

    // 首先尝试精确匹配
    for (const option of options) {
      if (option.textContent.trim() === value || option.value === value) {
        element.value = option.value;
        this.triggerEvents(element);
        return true;
      }
    }

    // 然后尝试模糊匹配
    for (const option of options) {
      if (
        option.textContent.includes(value) ||
        value.includes(option.textContent.trim())
      ) {
        element.value = option.value;
        this.triggerEvents(element);
        return true;
      }
    }

    return false;
  }

  // 填写单选框
  fillRadioInput(element, value) {
    const name = element.name;
    const radios = document.querySelectorAll(
      `input[name="${name}"][type="radio"]`
    );

    for (const radio of radios) {
      const label = this.getFieldLabel(radio);
      if (label && (label.includes(value) || value.includes(label))) {
        radio.checked = true;
        this.triggerEvents(radio);
        return true;
      }
    }

    return false;
  }

  // 填写复选框
  fillCheckboxInput(element, value) {
    const label = this.getFieldLabel(element);
    if (label && (label.includes(value) || value.includes(label))) {
      element.checked = true;
      this.triggerEvents(element);
      return true;
    }
    return false;
  }

  // 填写文本域
  fillTextareaInput(element, value) {
    element.value = value;
    this.triggerEvents(element);
    return true;
  }

  // 获取字段标签
  getFieldLabel(element) {
    // 尝试通过 label 标签获取
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent.trim();
      }
    }

    // 尝试通过父元素中的 label 获取
    const parentLabel = element.closest("label");
    if (parentLabel) {
      return parentLabel.textContent.trim();
    }

    // 尝试通过相邻元素获取
    const prevElement = element.previousElementSibling;
    if (
      prevElement &&
      (prevElement.tagName === "LABEL" || prevElement.tagName === "SPAN")
    ) {
      return prevElement.textContent.trim();
    }

    return element.placeholder || element.name || "";
  }

  // 触发相关事件
  triggerEvents(element) {
    const events = ["input", "change", "blur", "keyup"];
    events.forEach((eventType) => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });
  }

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("日期格式化失败:", error);
      return null;
    }
  }

  // 高亮显示已填写的字段
  highlightFilledFields() {
    const style = document.createElement("style");
    style.textContent = `
      .auto-filled-field {
        border: 2px solid #10B981 !important;
        background-color: #F0FDF4 !important;
        transition: all 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);

    // 为所有已填写的字段添加高亮样式
    setTimeout(() => {
      const inputs = document.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        if (input.value && input.value.trim() !== "") {
          input.classList.add("auto-filled-field");

          // 3秒后移除高亮
          setTimeout(() => {
            input.classList.remove("auto-filled-field");
          }, 3000);
        }
      });
    }, 100);
  }

  // 显示通知
  showNotification(message, type = "info") {
    // 移除已存在的通知
    const existingNotification = document.getElementById(
      "autoFillNotification"
    );
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.id = "autoFillNotification";

    const colors = {
      success: { bg: "#10B981", border: "#059669" },
      warning: { bg: "#F59E0B", border: "#D97706" },
      error: { bg: "#EF4444", border: "#DC2626" },
      info: { bg: "#3B82F6", border: "#2563EB" },
    };

    const color = colors[type] || colors.info;

    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 10001;
        background: ${color.bg};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease-out;
      ">
        ${message}
      </div>
    `;

    // 添加动画样式
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
}

// 初始化自动填写管理器
const autoFillManager = new AutoFillManager();
