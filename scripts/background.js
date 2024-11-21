// 创建右键菜单
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "openOptions",
    title: "打开书签管理器",
    contexts: ["all"],
  });
});

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "openOptions") {
    // chrome.tabs.create({
    //   url: "chrome://bookmarks",
    // });
    chrome.runtime.openOptionsPage();
  }
});

// 监听书签创建事件
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs[0]) {
      try {
        // 在标签页中执行脚本获取描述信息
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            // 优先获取 meta description
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
              return metaDesc.getAttribute('content');
            }
            
            // 如果没有 meta description，尝试获取第一段文本
            const firstParagraph = document.querySelector('p');
            if (firstParagraph) {
              const text = firstParagraph.textContent.trim();
              return text.length > 200 ? text.substring(0, 200) + '...' : text;
            }
            
            return '';
          }
        });
        
        const description = results?.[0]?.result || '';
        
        // 先打开选项页面
        const optionsUrl = chrome.runtime.getURL('options/options.html');
        const existingOptionsTab = await chrome.tabs.query({ url: optionsUrl });
        
        if (existingOptionsTab.length > 0) {
          // 如果选项页面已经打开，激活它并发送消息
          await chrome.tabs.update(existingOptionsTab[0].id, { active: true });
          chrome.tabs.sendMessage(existingOptionsTab[0].id, {
            type: 'EDIT_BOOKMARK',
            bookmarkId: id,
            description: description
          });
        } else {
          // 创建新的选项页面
          const tab = await chrome.tabs.create({ url: optionsUrl });
          // 等待页面加载完成后发送消息
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              chrome.tabs.sendMessage(tab.id, {
                type: 'EDIT_BOOKMARK',
                bookmarkId: id,
                description: description
              });
            }
          });
        }
      } catch (error) {
        console.error('Error getting description:', error);
        // 即使获取描述失败，也要打开选项页面
        chrome.runtime.openOptionsPage();
      }
    }
  });
});
