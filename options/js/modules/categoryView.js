import { toast } from './ui/toast.js';
import { storage } from './utils/storage.js';

export function initCategoryView() {
    const tagsView = document.getElementById('tagsView');
    const foldersView = document.getElementById('foldersView');
    const viewBtns = document.querySelectorAll('.view-btn');
    
    // 视图切换
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const viewType = btn.dataset.view;
            if (viewType === 'tags') {
                tagsView.classList.add('active');
                foldersView.classList.remove('active');
                loadTagsView();
            } else {
                foldersView.classList.add('active');
                tagsView.classList.remove('active');
                loadFoldersView();
            }
        });
    });

    // 标签搜索
    const tagFilter = document.querySelector('.filter-input');
    tagFilter.addEventListener('input', (e) => {
        const filterText = e.target.value.toLowerCase();
        const tagElements = document.querySelectorAll('.tag-cloud-item');
        tagElements.forEach(tag => {
            const tagText = tag.textContent.toLowerCase();
            tag.style.display = tagText.includes(filterText) ? '' : 'none';
        });
    });

    // 初始加载标签视图
    loadTagsView();
}

// 加载标签视图
async function loadTagsView() {
    const tagsCloud = document.querySelector('.tags-cloud');
    const taggedBookmarks = document.querySelector('.tagged-bookmarks');
    
    try {
        const { bookmarkTags } = await storage.get(['bookmarkTags']);
        const tagStats = {};
        
        // 统计标签使用次数
        Object.values(bookmarkTags || {}).forEach(tags => {
            tags.forEach(tag => {
                tagStats[tag] = (tagStats[tag] || 0) + 1;
            });
        });
        
        // 渲染标签云
        tagsCloud.innerHTML = Object.entries(tagStats)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => `
                <div class="tag-cloud-item" data-tag="${tag}">
                    ${tag}
                    <span class="tag-count">${count}</span>
                </div>
            `).join('');
            
        // 标签点击事件
        tagsCloud.addEventListener('click', (e) => {
            const tagItem = e.target.closest('.tag-cloud-item');
            if (tagItem) {
                tagItem.classList.toggle('active');
                updateTaggedBookmarks();
            }
        });
        
        // 初始提示
        taggedBookmarks.innerHTML = '<p class="empty-message">请选择标签查看相关书签</p>';
        
    } catch (error) {
        console.error('Error loading tags view:', error);
        toast.error('加载标签视图失败');
    }
}

// 更新已选标签的书签列表
async function updateTaggedBookmarks() {
    const taggedBookmarks = document.querySelector('.tagged-bookmarks');
    const selectedTags = Array.from(document.querySelectorAll('.tag-cloud-item.active'))
        .map(tag => tag.dataset.tag);
    
    if (selectedTags.length === 0) {
        taggedBookmarks.innerHTML = '<p class="empty-message">请选择标签查看相关书签</p>';
        return;
    }
    
    try {
        const { bookmarkTags } = await storage.get(['bookmarkTags']);
        const matchedBookmarkIds = Object.entries(bookmarkTags || {})
            .filter(([_, tags]) => selectedTags.every(tag => tags.includes(tag)))
            .map(([id]) => id);
            
        const bookmarks = await chrome.bookmarks.get(matchedBookmarkIds);
        
        // 渲染匹配的书签
        taggedBookmarks.innerHTML = bookmarks.length ? bookmarks.map(bookmark => `
            <div class="bookmark-item">
                <div class="bookmark-info">
                    <img class="bookmark-favicon" src="/icons/icon16.png" alt="">
                    <a href="${bookmark.url}" class="bookmark-title" target="_blank">
                        ${bookmark.title || '未命名书签'}
                    </a>
                </div>
            </div>
        `).join('') : '<p class="empty-message">没有找到匹配的书签</p>';
        
    } catch (error) {
        console.error('Error updating tagged bookmarks:', error);
        toast.error('更新书签列表失败');
    }
}

// 加载文件夹视图
async function loadFoldersView() {
    const folderTree = document.querySelector('.folder-tree');
    const folderContent = document.querySelector('.folder-content');
    
    try {
        const tree = await chrome.bookmarks.getTree();
        
        // 渲染文件夹树
        function renderFolder(node, level = 0) {
            if (!node.children) return '';
            
            return node.children.map(child => {
                if (!child.url) {
                    return `
                        <div class="tree-item" data-id="${child.id}">
                            <span class="tree-toggle">▶</span>
                            <span class="tree-label">${child.title || '未命名文件夹'}</span>
                            ${child.children ? `
                                <div class="tree-children" style="display: none">
                                    ${renderFolder(child, level + 1)}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }
                return '';
            }).join('');
        }
        
        folderTree.innerHTML = renderFolder(tree[0]);
        
        // 文件夹点击事件
        folderTree.addEventListener('click', async (e) => {
            const treeItem = e.target.closest('.tree-item');
            const toggle = e.target.closest('.tree-toggle');
            
            if (toggle) {
                const children = treeItem.querySelector('.tree-children');
                if (children) {
                    children.style.display = children.style.display === 'none' ? 'block' : 'none';
                    toggle.textContent = children.style.display === 'none' ? '▶' : '▼';
                }
            } else if (treeItem) {
                const folderId = treeItem.dataset.id;
                const bookmarks = await chrome.bookmarks.getChildren(folderId);
                
                // 显示文件夹内容
                folderContent.innerHTML = bookmarks.length ? bookmarks.map(bookmark => `
                    <div class="bookmark-item">
                        <div class="bookmark-info">
                            <img class="bookmark-favicon" src="/icons/icon16.png" alt="">
                            <a href="${bookmark.url || '#'}" class="bookmark-title" target="_blank">
                                ${bookmark.title || '未命名书签'}
                            </a>
                        </div>
                    </div>
                `).join('') : '<p class="empty-message">此文件夹为空</p>';
            }
        });
        
    } catch (error) {
        console.error('Error loading folders view:', error);
        toast.error('加载文件夹视图失败');
    }
} 