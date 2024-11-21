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
    chrome.runtime.openOptionsPage();
  }
});

// 监听书签创建事件
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  // 检查是否是通过导入创建的书签
  if (bookmark.url) {
    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0] && tabs[0].url === bookmark.url) {
        // 只有当创建的书签URL与当前标签页URL匹配时，才获取描述信息
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              const metaDesc = document.querySelector('meta[name="description"]');
              if (metaDesc) {
                return metaDesc.getAttribute('content');
              }
              
              const firstParagraph = document.querySelector('p');
              if (firstParagraph) {
                const text = firstParagraph.textContent.trim();
                return text.length > 200 ? text.substring(0, 200) + '...' : text;
              }
              
              return '';
            }
          });
          
          const description = results?.[0]?.result || '';
          
          // 打开选项页面
          const optionsUrl = chrome.runtime.getURL('options/options.html');
          const existingOptionsTab = await chrome.tabs.query({ url: optionsUrl });
          
          if (existingOptionsTab.length > 0) {
            await chrome.tabs.update(existingOptionsTab[0].id, { active: true });
            chrome.tabs.sendMessage(existingOptionsTab[0].id, {
              type: 'EDIT_BOOKMARK',
              bookmarkId: id,
              description: description
            });
          } else {
            const tab = await chrome.tabs.create({ url: optionsUrl });
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
          chrome.runtime.openOptionsPage();
        }
      }
    });
  }
});
