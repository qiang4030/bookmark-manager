import { toast } from './ui/toast.js';
import { showConfirm } from './ui/dialog.js';
import { storage } from './utils/storage.js';

// 导出功能
export async function exportBookmarks() {
    try {
        // 获取完整的书签树
        const tree = await chrome.bookmarks.getTree();
        const { bookmarkDescriptions, bookmarkTags } = await storage.get([
            'bookmarkDescriptions',
            'bookmarkTags'
        ]);

        // 过滤并重构书签树
        function processNode(node) {
            const result = {
                id: node.id,
                title: node.title
            };

            if (node.url) {
                result.url = node.url;
                if (node.dateAdded) {
                    result.dateAdded = node.dateAdded;
                }
            }

            if (node.children) {
                result.children = node.children.map(child => processNode(child));
            }

            return result;
        }

        // 构建导出数据
        const exportData = {
            bookmarks: tree.map(node => processNode(node)),
            descriptions: bookmarkDescriptions || {},
            tags: bookmarkTags || {},
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        // 创建下载
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookmarks_backup_${date}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        toast.success('书签导出成功');
    } catch (error) {
        console.error('Export error:', error);
        toast.error('导出失败：' + error.message);
    }
}

// 导入功能
export async function importBookmarks(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // 验证数据格式
        if (!data.bookmarks?.[0]) {
            throw new Error('无效的书签数据格式');
        }
        
        // 确认导入
        const confirmed = await showConfirm(
            '导入将覆盖现有的书签描述和标签信息，是否继续？'
        );
        
        if (!confirmed) return;

        // 清空现有书签
        const [existingBar, existingOther] = await Promise.all([
            chrome.bookmarks.getChildren('1'),  // 书签栏
            chrome.bookmarks.getChildren('2')   // 其他书签
        ]);

        // 删除现有书签
        await Promise.all([
            ...existingBar.map(b => chrome.bookmarks.removeTree(b.id)),
            ...existingOther.map(b => chrome.bookmarks.removeTree(b.id))
        ]);

        // 导入书签
        const rootNode = data.bookmarks[0];
        if (rootNode.children) {
            for (const child of rootNode.children) {
                // 根据文件夹名称确定目标ID
                const targetId = child.title === '书签栏' ? '1' : '2';
                if (child.children) {
                    for (const bookmark of child.children) {
                        await importBookmarkTree(bookmark, targetId);
                    }
                }
            }
        }
        
        // 导入额外信息
        await storage.set({
            bookmarkDescriptions: data.descriptions || {},
            bookmarkTags: data.tags || {}
        });
        
        toast.success('书签导入成功');
        
    } catch (error) {
        console.error('Import error:', error);
        toast.error('导入失败：' + error.message);
    }
}

// 递归导入书签树
async function importBookmarkTree(node, parentId) {
    try {
        if (node.url) {
            // 创建书签
            return await chrome.bookmarks.create({
                parentId: parentId,
                title: node.title || '',
                url: node.url,
                // 如果有日期信息，也一并导入
                ...(node.dateAdded ? { dateAdded: node.dateAdded } : {})
            });
        } else if (node.children) {
            // 创建文件夹
            const folder = await chrome.bookmarks.create({
                parentId: parentId,
                title: node.title || '未命名文件夹',
                // 如果有日期信息，也一并导入
                ...(node.dateAdded ? { dateAdded: node.dateAdded } : {})
            });
            
            // 递归处理子项
            for (const child of node.children) {
                await importBookmarkTree(child, folder.id);
            }
            return folder;
        }
    } catch (error) {
        console.error('Error importing node:', node, error);
        throw error;
    }
}

// 初始化导入/导出功能
export function initImportExport() {
    const exportBtn = document.getElementById('exportBtn');
    const importInput = document.getElementById('importInput');
    
    exportBtn.addEventListener('click', exportBookmarks);
    
    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importBookmarks(file);
            e.target.value = ''; // 清空input，允许重复导入同一文件
        }
    });
} 