import { initTabs } from './modules/ui/tabs.js';
import { initBookmarkManager } from './modules/bookmarkManager.js';
import { initTagManager } from './modules/tagManager.js';
import { initCategoryView } from './modules/categoryView.js';
import { initImportExport } from './modules/importExport.js';
import { initDevTools } from './modules/devTools.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 初始化各模块
    initTabs();
    await initBookmarkManager();
    await initTagManager();
    initCategoryView();
    initImportExport();
    initDevTools();
}); 