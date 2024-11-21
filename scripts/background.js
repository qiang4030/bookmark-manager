// 创建右键菜单
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "openOptions",
    title: "Bookmark Manager Plus",
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