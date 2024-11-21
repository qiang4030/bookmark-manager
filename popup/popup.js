document.addEventListener('DOMContentLoaded', () => {
    // 获取按钮元素
    const openOptionsBtn = document.getElementById('openOptionsBtn');
    
    // 添加点击事件监听器
    openOptionsBtn.addEventListener('click', () => {
        // 使用Chrome API打开选项页面
        if (chrome.runtime.openOptionsPage) {
            // 新版Chrome浏览器使用这个API
            chrome.runtime.openOptionsPage();
        } else {
            // 兼容旧版本
            window.open(chrome.runtime.getURL('options/options.html'));
        }
    });
});
