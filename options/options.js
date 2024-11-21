document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // 标签页切换功能
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const targetPane = document.getElementById(tab.dataset.tab);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // 书签管理相关代码
    const bookmarkList = document.querySelector('.bookmark-list');
    const bookmarkTemplate = document.getElementById('bookmarkTemplate');
    const searchInput = document.getElementById('searchBookmark');
    const emptyState = document.getElementById('bookmarkEmptyState');

    // 分页配置
    const PAGE_SIZE = 10;
    let currentPage = 1;
    let totalPages = 1;
    let currentBookmarks = [];

    // 添加分页控件到HTML
    const paginationHTML = `
        <div class="pagination">
            <button class="pagination-btn prev-btn" disabled>
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
                上一页
            </button>
            <div class="pagination-info">
                第 <span class="current-page">1</span> 页 / 共 <span class="total-pages">1</span> 页
            </div>
            <div class="pagination-jump">
                跳转到 <input type="number" class="jump-input" min="1" value="1"> 页
                <button class="jump-btn">跳转</button>
            </div>
            <button class="pagination-btn next-btn" disabled>
                下一页
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
            </button>
        </div>
    `;
    bookmarkList.insertAdjacentHTML('afterend', paginationHTML);

    // 获取分页元素
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const currentPageSpan = document.querySelector('.current-page');
    const totalPagesSpan = document.querySelector('.total-pages');

    // 获取跳转相关元素
    const jumpInput = document.querySelector('.jump-input');
    const jumpBtn = document.querySelector('.jump-btn');

    // 更新分页信息
    function updatePagination() {
        currentPageSpan.textContent = currentPage;
        totalPagesSpan.textContent = totalPages;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        
        // 更新跳转输入框的值和范围
        jumpInput.value = currentPage;
        jumpInput.max = totalPages;
    }

    // 加载书签树
    function loadBookmarks() {
        try {
            chrome.bookmarks.getTree((bookmarkTreeNodes) => {
                if (chrome.runtime.lastError) {
                    console.error('Error loading bookmarks:', chrome.runtime.lastError);
                    showError('加载书签时出错');
                    return;
                }

                const bookmarks = [];
                
                function processNode(node, path = '') {
                    if (node.url) {
                        bookmarks.push({
                            id: node.id,
                            title: node.title || '未命名书签',
                            url: node.url,
                            path: path,
                            dateAdded: node.dateAdded
                        });
                    }
                    
                    if (node.children) {
                        node.children.forEach(child => processNode(child, path));
                    }
                }
                
                bookmarkTreeNodes.forEach(node => processNode(node));
                
                // 按添加时间排序
                bookmarks.sort((a, b) => b.dateAdded - a.dateAdded);
                
                if (bookmarks.length === 0) {
                    showEmptyState();
                } else {
                    hideEmptyState();
                    currentBookmarks = bookmarks;
                    totalPages = Math.ceil(bookmarks.length / PAGE_SIZE);
                    updatePagination();
                    renderBookmarksPage(currentPage);
                }
            });
        } catch (error) {
            console.error('Error in loadBookmarks:', error);
            showError('加载书签时出错');
        }
    }

    // 渲染当前页的书签
    function renderBookmarksPage(page) {
        const startIndex = (page - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const pageBookmarks = currentBookmarks.slice(startIndex, endIndex);
        renderBookmarks(pageBookmarks);
    }

    // 分页按钮事件监听
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderBookmarksPage(currentPage);
            updatePagination();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderBookmarksPage(currentPage);
            updatePagination();
        }
    });

    // 跳转功能
    function jumpToPage() {
        const pageNum = parseInt(jumpInput.value);
        if (isNaN(pageNum)) {
            alert('请输入有效的页码');
            return;
        }
        
        if (pageNum < 1 || pageNum > totalPages) {
            alert(`请输入1到${totalPages}之间的页码`);
            return;
        }

        currentPage = pageNum;
        renderBookmarksPage(currentPage);
        updatePagination();
    }

    // 添加跳转按钮点击事件
    jumpBtn.addEventListener('click', jumpToPage);

    // 添加输入框回车事件
    jumpInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            jumpToPage();
        }
    });

    // 搜索功能更新
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            const searchTerm = e.target.value.trim();
            
            if (searchTerm === '') {
                loadBookmarks();
                jumpInput.value = 1; // 重置跳转输入框
                return;
            }

            try {
                chrome.bookmarks.search(searchTerm, (results) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error searching bookmarks:', chrome.runtime.lastError);
                        return;
                    }

                    const bookmarks = results.filter(bookmark => bookmark.url);
                    
                    if (bookmarks.length === 0) {
                        showEmptyState();
                        emptyState.querySelector('p').textContent = '未找到相关书签';
                    } else {
                        hideEmptyState();
                        currentBookmarks = bookmarks;
                        currentPage = 1;
                        totalPages = Math.ceil(bookmarks.length / PAGE_SIZE);
                        updatePagination();
                        renderBookmarksPage(currentPage);
                    }
                });
            } catch (error) {
                console.error('Error in search:', error);
                showError('搜索书签时出错');
            }
        }, 300);
    });

    // 显示空状态
    function showEmptyState() {
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.querySelector('p').textContent = '暂无书签';
        }
    }

    // 隐藏空状态
    function hideEmptyState() {
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }

    // 显示错误信息
    function showError(message) {
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.querySelector('p').textContent = message;
        }
    }

    // 渲染书签列表
    function renderBookmarks(bookmarks) {
        try {
            // 清空现有列表
            const children = Array.from(bookmarkList.children);
            children.forEach(child => {
                if (child.id !== 'bookmarkEmptyState') {
                    child.remove();
                }
            });

            bookmarks.forEach(bookmark => {
                const bookmarkElement = bookmarkTemplate.content.cloneNode(true);
                const item = bookmarkElement.querySelector('.bookmark-item');
                
                const titleElement = item.querySelector('.bookmark-title');
                const faviconElement = item.querySelector('.bookmark-favicon');
                
                titleElement.textContent = bookmark.title || '未命名书签';
                titleElement.href = bookmark.url;
                
                // 设置默认图标，避免chrome://favicon的问题
                faviconElement.src = '/icons/icon16.png';
                
                // 移除旧的点击事件，现在使用a标签的默认行为
                
                item.querySelector('.edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    editBookmark(bookmark);
                });
                
                item.querySelector('.delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteBookmark(bookmark, item);
                });
                
                bookmarkList.appendChild(bookmarkElement);
            });
        } catch (error) {
            console.error('Error in renderBookmarks:', error);
            showError('渲染书签时出错');
        }
    }

    // 删除书签
    function deleteBookmark(bookmark, item) {
        if (confirm(`确定要删除书签 "${bookmark.title}" 吗？`)) {
            try {
                chrome.bookmarks.remove(bookmark.id, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error removing bookmark:', chrome.runtime.lastError);
                        return;
                    }
                    item.remove();
                    if (bookmarkList.children.length === 1) {
                        showEmptyState();
                    }
                });
            } catch (error) {
                console.error('Error in deleteBookmark:', error);
            }
        }
    }

    // 获取编辑表单相关元素
    const bookmarkEditForm = document.querySelector('.bookmark-edit-form');
    const bookmarkEditEmpty = document.querySelector('.bookmark-edit-empty');
    const bookmarkTitleInput = document.getElementById('bookmarkTitle');
    const bookmarkUrlInput = document.getElementById('bookmarkUrl');
    const bookmarkDescriptionInput = document.getElementById('bookmarkDescription');
    const bookmarkFolderSelect = document.getElementById('bookmarkFolder');
    const saveBookmarkBtn = document.getElementById('saveBookmark');
    const cancelEditBtn = document.getElementById('cancelEdit');

    let currentEditingBookmark = null;

    // 获取标签相关元素
    const tagsInput = document.getElementById('bookmarkTags');
    const tagsList = document.getElementById('tagsList');
    const presetTags = document.getElementById('presetTags');

    let currentTags = new Set();

    // 创建标签元素
    function createTagElement(tagText) {
        const tag = document.createElement('span');
        tag.className = 'tag-item';
        tag.innerHTML = `
            ${tagText}
            <span class="tag-remove">×</span>
        `;
        
        tag.querySelector('.tag-remove').addEventListener('click', () => {
            tag.remove();
            currentTags.delete(tagText);
        });
        
        return tag;
    }

    // 添加标签
    function addTag(tagText) {
        tagText = tagText.trim();
        if (tagText && !currentTags.has(tagText)) {
            currentTags.add(tagText);
            tagsList.appendChild(createTagElement(tagText));
            tagsInput.value = '';
        }
    }

    // 标签输入事件处理
    tagsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tagText = tagsInput.value.trim();
            if (tagText) {
                addTag(tagText);
            }
        } else if (e.key === 'Backspace' && tagsInput.value === '') {
            const tags = tagsList.getElementsByClassName('tag-item');
            if (tags.length > 0) {
                const lastTag = tags[tags.length - 1];
                currentTags.delete(lastTag.textContent.trim());
                lastTag.remove();
            }
        }
    });

    // 预设标签点击事件
    presetTags.addEventListener('click', (e) => {
        if (e.target.classList.contains('preset-tag')) {
            addTag(e.target.dataset.tag);
        }
    });

    // 修改编辑函数，添加标签处理
    function editBookmark(bookmark) {
        currentEditingBookmark = bookmark;
        
        // 切换到编辑标签页
        document.querySelector('[data-tab="bookmark-edit"]').click();
        
        // 显示表单，隐藏空状态
        bookmarkEditForm.style.display = 'block';
        bookmarkEditEmpty.style.display = 'none';
        
        // 填充表单数据
        bookmarkTitleInput.value = bookmark.title || '';
        bookmarkUrlInput.value = bookmark.url || '';
        
        // 获取并填充描述信息（如果存在）
        chrome.storage.local.get(['bookmarkDescriptions'], (result) => {
            const descriptions = result.bookmarkDescriptions || {};
            bookmarkDescriptionInput.value = descriptions[bookmark.id] || '';
        });
        
        // 加载并选择当前文件夹
        loadBookmarkFolders(bookmark.parentId);
        
        // 清空并加载标签
        currentTags.clear();
        tagsList.innerHTML = '';
        
        // 从storage中获取标签
        chrome.storage.local.get(['bookmarkTags'], (result) => {
            const tags = result.bookmarkTags?.[bookmark.id] || [];
            tags.forEach(tag => addTag(tag));
        });
    }

    // 加载书签文件夹
    function loadBookmarkFolders(selectedId) {
        chrome.bookmarks.getTree((bookmarkTreeNodes) => {
            bookmarkFolderSelect.innerHTML = '<option value="">选择文件夹</option>';
            
            function processNode(node, level = 0) {
                if (!node.url) { // 只处理文件夹
                    const option = document.createElement('option');
                    option.value = node.id;
                    option.textContent = '  '.repeat(level) + (node.title || '根文件夹');
                    option.selected = node.id === selectedId;
                    bookmarkFolderSelect.appendChild(option);
                    
                    if (node.children) {
                        node.children.forEach(child => processNode(child, level + 1));
                    }
                }
            }
            
            bookmarkTreeNodes.forEach(node => processNode(node));
        });
    }

    // 保存书签
    saveBookmarkBtn.addEventListener('click', () => {
        if (!currentEditingBookmark) return;
        
        const updates = {
            title: bookmarkTitleInput.value.trim(),
            url: bookmarkUrlInput.value.trim()
        };
        
        // 果选择了新文件夹，则移动书签
        if (bookmarkFolderSelect.value && bookmarkFolderSelect.value !== currentEditingBookmark.parentId) {
            chrome.bookmarks.move(currentEditingBookmark.id, {
                parentId: bookmarkFolderSelect.value
            });
        }
        
        // 更新书签基本信息
        chrome.bookmarks.update(currentEditingBookmark.id, updates, (result) => {
            if (chrome.runtime.lastError) {
                alert('保存失败：' + chrome.runtime.lastError.message);
                return;
            }
            
            // 保存描述信息到storage
            const description = bookmarkDescriptionInput.value.trim();
            chrome.storage.local.get(['bookmarkDescriptions'], (result) => {
                const descriptions = result.bookmarkDescriptions || {};
                if (description) {
                    descriptions[currentEditingBookmark.id] = description;
                } else {
                    delete descriptions[currentEditingBookmark.id];
                }
                
                chrome.storage.local.set({ bookmarkDescriptions: descriptions }, () => {
                    // 保存标签
                    chrome.storage.local.get(['bookmarkTags'], (result) => {
                        const bookmarkTags = result.bookmarkTags || {};
                        bookmarkTags[currentEditingBookmark.id] = Array.from(currentTags);
                        
                        chrome.storage.local.set({ bookmarkTags }, () => {
                            // 重新加载书签列表
                            loadBookmarks();
                            // 重置编辑状态
                            resetEditForm();
                            // 切换回管理页面
                            document.querySelector('[data-tab="bookmark-manage"]').click();
                        });
                    });
                });
            });
        });
    });

    // 取消编辑
    cancelEditBtn.addEventListener('click', () => {
        resetEditForm();
        document.querySelector('[data-tab="bookmark-manage"]').click();
    });

    // 重置编辑表单
    function resetEditForm() {
        currentEditingBookmark = null;
        bookmarkEditForm.style.display = 'none';
        bookmarkEditEmpty.style.display = 'flex';
        bookmarkTitleInput.value = '';
        bookmarkUrlInput.value = '';
        bookmarkDescriptionInput.value = '';
        bookmarkFolderSelect.innerHTML = '<option value="">选择文件夹</option>';
        currentTags.clear();
        tagsList.innerHTML = '';
    }

    // 初始化时显示空状态
    resetEditForm();

    // 初始加载
    loadBookmarks();

    // 在现有代码中添加自定义标签相关功能

    // 获取添加签按钮
    const addCustomTagBtn = document.getElementById('addCustomTag');

    // 创建对话框HTML
    function createDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'custom-tag-dialog';
        dialog.innerHTML = `
            <div class="dialog-header">
                <h3>添加自定义标签</h3>
            </div>
            <div class="dialog-content">
                <input type="text" class="form-input" id="customTagInput" placeholder="输入标签名称">
            </div>
            <div class="dialog-actions">
                <button class="dialog-btn cancel">取消</button>
                <button class="dialog-btn confirm">确定</button>
            </div>
        `;
        return dialog;
    }

    // 创建遮罩层
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        return overlay;
    }

    // 显示添加标签对话框
    function showAddTagDialog() {
        const overlay = createOverlay();
        const dialog = createDialog();
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        const customTagInput = dialog.querySelector('#customTagInput');
        const cancelBtn = dialog.querySelector('.cancel');
        const confirmBtn = dialog.querySelector('.confirm');

        // 聚焦输入框
        customTagInput.focus();

        // 回车键确认
        customTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            }
        });

        // 取消按钮
        cancelBtn.addEventListener('click', () => {
            closeDialog();
        });

        // 认按钮
        confirmBtn.addEventListener('click', handleConfirm);

        // 点击遮罩层关闭
        overlay.addEventListener('click', () => {
            closeDialog();
        });

        function handleConfirm() {
            const tagName = customTagInput.value.trim();
            if (tagName) {
                // 添加到预设标签表
                const presetTag = document.createElement('span');
                presetTag.className = 'preset-tag';
                presetTag.dataset.tag = tagName;
                presetTag.textContent = tagName;
                
                // 插入到"添加标签"按钮之前
                addCustomTagBtn.parentNode.insertBefore(presetTag, addCustomTagBtn);

                // 保存自定义标签到storage
                saveCustomTag(tagName);
            }
            closeDialog();
        }

        function closeDialog() {
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
        }
    }

    // 保存自定义标签到storage
    function saveCustomTag(tagName) {
        chrome.storage.local.get(['customTags'], (result) => {
            const customTags = result.customTags || [];
            if (!customTags.includes(tagName)) {
                customTags.push(tagName);
                chrome.storage.local.set({ customTags });
            }
        });
    }

    // 加载自定义标签
    function loadCustomTags() {
        chrome.storage.local.get(['customTags'], (result) => {
            const customTags = result.customTags || [];
            customTags.forEach(tagName => {
                const presetTag = document.createElement('span');
                presetTag.className = 'preset-tag';
                presetTag.dataset.tag = tagName;
                presetTag.textContent = tagName;
                addCustomTagBtn.parentNode.insertBefore(presetTag, addCustomTagBtn);
            });
        });
    }

    // 添加标签按钮点击事件
    addCustomTagBtn.addEventListener('click', showAddTagDialog);

    // 在页面加载时加载自定义标签
    document.addEventListener('DOMContentLoaded', () => {
        loadCustomTags();
    });

    // 在现有代码中添加分类相关功能

    // 视图切换
    const viewBtns = document.querySelectorAll('.view-btn');
    const categoryViews = document.querySelectorAll('.category-view');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewType = btn.dataset.view;
            
            // 更新按钮状态
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 更新视图显示
            categoryViews.forEach(view => {
                view.classList.remove('active');
                if (view.id === `${viewType}View`) {
                    view.classList.add('active');
                }
            });
            
            // 加载对应视图的数据
            if (viewType === 'tags') {
                loadTagsView();
            } else {
                loadFoldersView();
            }
        });
    });

    // 加载标签视图
    function loadTagsView() {
        const tagsCloud = document.querySelector('.tags-cloud');
        const taggedBookmarks = document.querySelector('.tagged-bookmarks');
        
        // 获取所有标签及其使用次数
        chrome.storage.local.get(['bookmarkTags'], (result) => {
            const bookmarkTags = result.bookmarkTags || {};
            const tagStats = {};
            const tagHierarchy = {}; // 存储标签层级关系
            
            // 统计标签使用次数并构建层级关系
            Object.entries(bookmarkTags).forEach(([bookmarkId, tags]) => {
                tags.forEach(tag => {
                    // 更新标签计数
                    tagStats[tag] = (tagStats[tag] || 0) + 1;
                    
                    // 处理可能的层级标签（使用/分隔）
                    if (tag.includes('/')) {
                        const parts = tag.split('/');
                        let currentLevel = tagHierarchy;
                        let currentPath = '';
                        
                        parts.forEach((part, index) => {
                            currentPath = currentPath ? `${currentPath}/${part}` : part;
                            if (!currentLevel[currentPath]) {
                                currentLevel[currentPath] = {
                                    name: part,
                                    fullPath: currentPath,
                                    count: 0,
                                    children: {}
                                };
                            }
                            currentLevel[currentPath].count++;
                            currentLevel = currentLevel[currentPath].children;
                        });
                    } else {
                        if (!tagHierarchy[tag]) {
                            tagHierarchy[tag] = {
                                name: tag,
                                fullPath: tag,
                                count: 0,
                                children: {}
                            };
                        }
                        tagHierarchy[tag].count++;
                    }
                });
            });
            
            // 渲染标签云（树形结构）
            tagsCloud.innerHTML = '';
            renderTagTree(tagHierarchy, tagsCloud);
        });
    }

    // 渲染标签树
    function renderTagTree(hierarchy, container, level = 0) {
        Object.values(hierarchy).sort((a, b) => b.count - a.count).forEach(node => {
            const hasChildren = Object.keys(node.children).length > 0;
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-tree-item';
            tagElement.style.paddingLeft = `${level * 20}px`;
            
            tagElement.innerHTML = `
                ${hasChildren ? `<span class="tag-toggle">▶</span>` : '<span class="tag-toggle-placeholder"></span>'}
                <div class="tag-cloud-item" data-path="${node.fullPath}">
                    ${node.name}
                    <span class="tag-count">${node.count}</span>
                </div>
            `;
            
            // 创建子标签容器
            if (hasChildren) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tag-children';
                childrenContainer.style.display = 'none';
                
                // 渲染子标签
                renderTagTree(node.children, childrenContainer, level + 1);
                
                // 切换展开/折叠
                const toggle = tagElement.querySelector('.tag-toggle');
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggle.textContent = toggle.textContent === '▶' ? '▼' : '▶';
                    childrenContainer.style.display = childrenContainer.style.display === 'none' ? 'block' : 'none';
                });
                
                tagElement.appendChild(childrenContainer);
            }
            
            // 标签点击事件
            const tagCloudItem = tagElement.querySelector('.tag-cloud-item');
            tagCloudItem.addEventListener('click', () => {
                // 切换选中状态
                tagCloudItem.classList.toggle('active');
                updateTaggedBookmarks();
            });
            
            container.appendChild(tagElement);
        });
    }

    // 更新标签筛选的书签列表
    function updateTaggedBookmarks() {
        const selectedTags = Array.from(document.querySelectorAll('.tag-cloud-item.active'))
            .map(tag => tag.dataset.path);
        
        if (selectedTags.length === 0) {
            document.querySelector('.tagged-bookmarks').innerHTML = 
                '<p class="empty-message">请选择标签查看相关书签</p>';
            return;
        }
        
        chrome.storage.local.get(['bookmarkTags'], (result) => {
            const bookmarkTags = result.bookmarkTags || {};
            const matchedBookmarkIds = Object.entries(bookmarkTags)
                .filter(([_, tags]) => {
                    // 检查是否匹配所有选中的标签（包括父级标签）
                    return selectedTags.every(selectedTag => {
                        return tags.some(tag => 
                            tag === selectedTag || tag.startsWith(selectedTag + '/'));
                    });
                })
                .map(([id]) => id);
            
            // 获取并显示匹配的书签
            chrome.bookmarks.get(matchedBookmarkIds, (bookmarks) => {
                renderBookmarkList(bookmarks, '.tagged-bookmarks');
            });
        });
    }

    // 加载文件夹视图
    function loadFoldersView() {
        const folderTree = document.querySelector('.folder-tree');
        
        chrome.bookmarks.getTree((tree) => {
            folderTree.innerHTML = '';
            renderFolderTree(tree[0], folderTree);
        });
    }

    // 渲染文件夹树
    function renderFolderTree(node, container, level = 0) {
        if (!node.children) return;
        
        node.children.forEach(child => {
            const item = document.createElement('div');
            item.className = 'tree-item';
            item.style.paddingLeft = `${level * 20}px`;
            
            if (child.children) {
                item.innerHTML = `
                    <span class="tree-toggle">▶</span>
                    <span class="tree-label">${child.title || '未命名文件夹'}</span>
                `;
                
                const childContainer = document.createElement('div');
                childContainer.className = 'tree-children';
                childContainer.style.display = 'none';
                
                item.querySelector('.tree-toggle').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const toggle = item.querySelector('.tree-toggle');
                    toggle.classList.toggle('expanded');
                    childContainer.style.display = childContainer.style.display === 'none' ? 'block' : 'none';
                });
                
                renderFolderTree(child, childContainer, level + 1);
                container.appendChild(item);
                container.appendChild(childContainer);
            }
        });
    }

    // 初始加载标签视图
    loadTagsView();

    // 添加书签排序功能
    function addSortingFeatures() {
        const sortOptions = {
            date: (a, b) => b.dateAdded - a.dateAdded,
            name: (a, b) => a.title.localeCompare(b.title),
            url: (a, b) => a.url.localeCompare(b.url)
        };

        // 添加排序下拉菜单到HTML
        const sortSelect = document.createElement('select');
        sortSelect.className = 'sort-select';
        sortSelect.innerHTML = `
            <option value="date">按时间排序</option>
            <option value="name">按称排序</option>
            <option value="url">按URL排序</option>
        `;

        // 将排序选择器添加到搜索框旁边
        document.querySelector('.bookmark-search').insertAdjacentElement('beforebegin', sortSelect);

        // 监听排序变化
        sortSelect.addEventListener('change', (e) => {
            const sortFn = sortOptions[e.target.value];
            currentBookmarks.sort(sortFn);
            renderBookmarksPage(currentPage);
        });
    }

    // 添加批量操作功能
    function addBatchOperations() {
        // 添加批量操作按钮
        const batchOpsHTML = `
            <div class="batch-operations" style="display: none;">
                <button class="batch-btn delete-selected">删除选中</button>
                <button class="batch-btn move-selected">移动到文件夹</button>
                <button class="batch-btn add-tags">添加标签</button>
            </div>
        `;
        
        document.querySelector('.bookmark-manage-header').insertAdjacentHTML('beforeend', batchOpsHTML);

        // 添加复选框到书签项模板
        const checkboxHTML = `<input type="checkbox" class="bookmark-checkbox">`;
        document.querySelector('.bookmark-info').insertAdjacentHTML('afterbegin', checkboxHTML);

        // 处理批量操作
        const batchOps = document.querySelector('.batch-operations');
        let selectedBookmarks = new Set();

        // 监听复选框变化
        bookmarkList.addEventListener('change', (e) => {
            if (e.target.classList.contains('bookmark-checkbox')) {
                const bookmarkItem = e.target.closest('.bookmark-item');
                const bookmarkId = bookmarkItem.dataset.id;

                if (e.target.checked) {
                    selectedBookmarks.add(bookmarkId);
                } else {
                    selectedBookmarks.delete(bookmarkId);
                }

                batchOps.style.display = selectedBookmarks.size > 0 ? 'flex' : 'none';
            }
        });
    }

    // 增强编辑功能
    function enhanceEditFeatures() {
        // 添加URL验证
        bookmarkUrlInput.addEventListener('blur', validateUrl);
        
        // 添加标题自动获取
        bookmarkUrlInput.addEventListener('blur', async () => {
            if (!bookmarkTitleInput.value) {
                try {
                    const response = await fetch(bookmarkUrlInput.value);
                    const text = await response.text();
                    const match = text.match(/<title>(.*?)<\/title>/i);
                    if (match && match[1]) {
                        bookmarkTitleInput.value = match[1].trim();
                    }
                } catch (error) {
                    console.error('Error fetching title:', error);
                }
            }
        });

        // 添加标签自动完成
        function setupTagAutocomplete() {
            let allTags = new Set();
            
            // 获取所有已使用的标签
            chrome.storage.local.get(['bookmarkTags'], (result) => {
                const bookmarkTags = result.bookmarkTags || {};
                Object.values(bookmarkTags).forEach(tags => {
                    tags.forEach(tag => allTags.add(tag));
                });
            });

            // 实现自动完成
            tagsInput.addEventListener('input', () => {
                const value = tagsInput.value.toLowerCase();
                if (value) {
                    const matches = Array.from(allTags)
                        .filter(tag => tag.toLowerCase().includes(value));
                    showAutocompleteSuggestions(matches);
                }
            });
        }
    }

    // 增强分类功能
    function enhanceCategoryFeatures() {
        // 添加标签搜索和过滤
        const tagFilter = document.querySelector('.filter-input');
        tagFilter.addEventListener('input', (e) => {
            const filterText = e.target.value.toLowerCase();
            const tagElements = document.querySelectorAll('.tag-cloud-item');
            
            tagElements.forEach(tag => {
                const tagText = tag.textContent.toLowerCase();
                tag.style.display = tagText.includes(filterText) ? '' : 'none';
            });
        });

        // 改进文件夹视图
        function enhanceFolderView() {
            const folderContent = document.querySelector('.folder-content');
            
            // 添加文件夹操作按钮
            function addFolderOperations(folderId) {
                return `
                    <div class="folder-operations">
                        <button class="folder-op-btn rename">重命名</button>
                        <button class="folder-op-btn create-subfolder">新建子文件夹</button>
                        <button class="folder-op-btn delete">删除文件夹</button>
                    </div>
                `;
            }

            // 显示文件夹内容时添加拖拽排序
            function enableDragSort() {
                new Sortable(folderContent, {
                    animation: 150,
                    onEnd: async (evt) => {
                        const bookmarkId = evt.item.dataset.id;
                        const nextId = evt.item.nextElementSibling?.dataset.id;
                        
                        try {
                            await chrome.bookmarks.move(bookmarkId, {
                                parentId: currentFolderId,
                                index: evt.newIndex
                            });
                        } catch (error) {
                            console.error('Error moving bookmark:', error);
                        }
                    }
                });
            }
        }
    }

    // 添加书签统计功能
    function addBookmarkStatistics() {
        // 创建统计面板
        const statsPanel = document.createElement('div');
        statsPanel.className = 'stats-panel';
        statsPanel.innerHTML = `
            <div class="stats-item">
                <span class="stats-label">总书签数</span>
                <span class="stats-value" id="totalBookmarks">0</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">总文件夹数</span>
                <span class="stats-value" id="totalFolders">0</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">使用最多的标签</span>
                <span class="stats-value" id="topTags">-</span>
            </div>
        `;

        // 更新统计数据
        async function updateStatistics() {
            const tree = await chrome.bookmarks.getTree();
            let bookmarkCount = 0;
            let folderCount = 0;
            
            function countItems(node) {
                if (node.url) bookmarkCount++;
                if (node.children) {
                    folderCount++;
                    node.children.forEach(countItems);
                }
            }
            
            tree.forEach(countItems);
            
            document.getElementById('totalBookmarks').textContent = bookmarkCount;
            document.getElementById('totalFolders').textContent = folderCount;
            
            // 获取标签统计
            chrome.storage.local.get(['bookmarkTags'], (result) => {
                const tagCounts = {};
                Object.values(result.bookmarkTags || {}).forEach(tags => {
                    tags.forEach(tag => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    });
                });
                
                const topTags = Object.entries(tagCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([tag, count]) => `${tag}(${count})`)
                    .join(', ');
                    
                document.getElementById('topTags').textContent = topTags;
            });
        }
    }
});
