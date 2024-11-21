 
# Bookmark Manager Plus

开发一个 Chrome 拓展来管理用户的书签，以下是开发此拓展的大致捕捉和关键点：

## 1. 准备工作

- 环境设置：
  - 安装 Chrome 浏览器
  - 安装 Node.js

## 2. 基本文件结构
```
bookmark-manager/
│
├── manifest.json      // Chrome 扩展的配置文件
├── background.js      // 后台脚本，用于处理书签 API 调用
├── popup.html         // 弹窗界面文件
├── popup.js           // 弹窗逻辑脚本
├── styles.css         // 弹窗样式文件
├── icons/             // 图标文件
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
└── scripts/           // 脚本文件
    ├── bookmark.js    // 书签操作相关脚本
    ├── storage.js     // 本地存储相关脚本
    └── utils.js       // 工具函数脚本
```

## 3. 功能设计

- 管理书签：
  - 新增书签：可以手动输入书签信息，也可以通过导入书签文件导入书签
  - 编辑书签：可以编辑书签的名称、URL、标签、描述等信息
  - 删除书签：可以删除指定书签
  - 排序书签：可以对书签进行排序
  - 搜索书签：可以根据书签的名称、URL、标签、描述等信息进行搜索
  - 分类管理：可以对书签进行分类，并可以对分类进行重命名、删除等操作
- 管理标签：
  - 新增标签：可以手动输入标签名称，也可以通过导入标签文件导入标签
  - 编辑标签：可以编辑标签的名称、颜色等信息
  - 删除标签：可以删除指定标签
  - 分类管理：可以对标签进行分类，并可以对分类进行重命名、删除等操作
- 管理分类：
  - 新增分类：可以手动输入分类名称，也可以通过导入分类文件导入分类
  - 编辑分类：可以编辑分类的名称、描述等信息
  - 删除分类：可以删除指定分类
  - 排序分类：可以对分类进行排序
- 导入导出：
  - 导入书签：可以导入书签文件，包括书签文件、标签文件、分类文件等
  - 导出书签：可以导出书签文件，包括书签文件、标签文件、分类文件等
- 其他功能：
  - 备份与恢复：可以备份书签数据，并可以恢复备份数据
  - 自定义设置：可以自定义设置，包括书签排序方式、分类排序方式等
  - 帮助文档：可以查看帮助文档，包括使用说明、常见问题、更新日志等
  - 反馈建议：可以提交反馈建议，包括功能建议、Bug 反馈等
  - 关于：可以查看关于信息，包括版本号、作者信息、项目地址等
  - 其他：可以添加其他功能，如：定时备份、自动导入、自动分类等

## 4. manifest.json 配置文件

```
{
  "manifest_version": 3, // 必须为3，表示支持最新的Chrome扩展API
  "name": "Bookmark Manager", // 扩展名称
  "version": "1.0", // 当前扩展的版本号
  "description": "A simple Chrome extension to manage bookmarks.", // 扩展描述
  "permissions": [
    "bookmarks", // 使用书签相关API
    "storage"    // 用于本地存储数据
  ],
  "host_permissions": [
    "<all_urls>" // 如果需要访问特定网页上的书签，启用此项
  ],
  "background": {
    "service_worker": "background.js" // 背景脚本文件
  },
  "action": { // 弹出窗口设置
    "default_popup": "popup.html", // 弹出窗口的HTML文件
    "default_icon": {
      "16": "icon16.png", // 图标文件（16x16像素）
      "48": "icon48.png", // 图标文件（48x48像素）
      "128": "icon128.png" // 图标文件（128x128像素）
    }
  },
  "icons": { // 扩展图标
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}

```

1. manifest_version：版本号，目前为 2
2. name：拓展名称
3. version：版本号
4. description：拓展描述
5. permissions：权限列表，包括书签、存储、通知、下载、网页访问等
6. background：后台脚本配置，包括脚本文件
7. content_scripts：内容脚本配置，包括匹配所有网页、脚本文件
8. icons：图标配置，包括不同尺寸的图标文件
9. web_accessible_resources：可访问资源配置，包括样式文件
10. options_page：弹窗界面文件
11. browser_action：浏览器动作配置，包括默认图标、默认标题

## 优化
将 options.js 按功能模块拆分，采用模块化的方式重构。
```
options/
├── js/
│   ├── modules/
│   │   ├── bookmarkManager.js    // 书签管理相关
│   │   ├── tagManager.js         // 标签管理相关
│   │   ├── categoryView.js       // 分类视图相关
│   │   ├── importExport.js       // 导入导出功能
│   │   ├── devTools.js          // 开发测试工具
│   │   ├── ui/
│   │   │   ├── toast.js         // Toast 通知
│   │   │   ├── dialog.js        // 对话框
│   │   │   └── tabs.js          // 标签页切换
│   │   └── utils/
│   │       ├── storage.js       // 存储相关工具
│   │       └── domUtils.js      // DOM 操作工具
│   └── main.js                  // 主入口文件
└── options.html
```