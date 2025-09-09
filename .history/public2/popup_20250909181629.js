document.getElementById("fillBtn").addEventListener("click", () => {
  // 向当前活跃标签页的内容脚本发送消息
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "fillForm" }, (response) => {
      if (chrome.runtime.lastError) {
        alert("❌ 未检测到支持的表单页面，请先打开模拟表单页。");
      } else {
        console.log("填充请求已发送");
      }
    });
  });
});
