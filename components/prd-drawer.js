/**
 * PRD 文档抽屉组件
 * 在原型页面中引入此组件，即可通过悬浮按钮查看对应的 PRD 文档
 * 
 * 使用方式：
 * <script src="../components/prd-drawer.js" data-doc="../docs/your-doc.md"></script>
 */

(function () {
    // 获取配置
    const script = document.currentScript;
    const scriptDir = script.src.substring(0, script.src.lastIndexOf('/'));
    const configUrl = scriptDir + '/../docs/config.json';
    const buttonPosition = script.getAttribute('data-position') || 'bottom-right';

    // PlantUML 服务地址（可配置）
    // - 方式1：在 script 标签上配置：data-plantuml-server="https://xxx/plantuml"
    // - 方式2：全局变量：window.PLANTUML_SERVER = "https://xxx/plantuml"
    // - 方式3：全局变量：window.PLANTUML_SERVERS = ["https://a/plantuml", "https://b/plantuml"]
    const configuredPlantUMLServer = script.getAttribute('data-plantuml-server') ||
        (typeof window !== 'undefined' ? window.PLANTUML_SERVER : undefined);
    const configuredPlantUMLServers = (typeof window !== 'undefined' && Array.isArray(window.PLANTUML_SERVERS))
        ? window.PLANTUML_SERVERS
        : [];
    const PLANTUML_SERVERS = [
        ...configuredPlantUMLServers,
        configuredPlantUMLServer,
        'https://www.plantuml.com/plantuml',
        'https://plantuml.com/plantuml',
    ].filter(Boolean);

    // 配置数据
    let config = { docs: [], pageMapping: {} };
    let currentDoc = null; // 当前显示的文档
    let currentView = 'list'; // 'list' 或 'doc'

    // ============================================================
    // 缓存策略
    //  - .md 文档内容：不缓存，每次强制重新拉取
    //  - UI 状态（滚动位置、章节位置、大纲展开）：sessionStorage
    //    （关掉浏览器标签页就清空，重新打开看到的是新内容 + 顶部位置）
    //  - 用户主动选择的文档：localStorage（这是偏好，应跨标签页保留）
    // ============================================================
    const SESSION_PREFIX = 'prd-sess-';

    function sessGet(key) {
        try { return sessionStorage.getItem(SESSION_PREFIX + key); } catch (e) { return null; }
    }
    function sessSet(key, value) {
        try { sessionStorage.setItem(SESSION_PREFIX + key, String(value)); } catch (e) {}
    }
    function sessDel(key) {
        try { sessionStorage.removeItem(SESSION_PREFIX + key); } catch (e) {}
    }

    // 用户主动选择缓存：按页面分别存储 { pageName: docFile }
    function getUserChoiceKey() {
        return 'prd-user-choice-' + getPageName();
    }
    function getUserChoice() {
        try {
            return localStorage.getItem(getUserChoiceKey());
        } catch (e) {
            return null;
        }
    }
    function setUserChoice(docFile) {
        try {
            localStorage.setItem(getUserChoiceKey(), docFile);
        } catch (e) {
            // 忽略存储失败
        }
    }
    function clearUserChoice() {
        try {
            localStorage.removeItem(getUserChoiceKey());
        } catch (e) {
            // 忽略
        }
    }

    // 获取当前页面名（标准化处理，兼容多种环境）
    function getPageName() {
        let pathname = window.location.pathname;

        // 移除尾部斜杠
        pathname = pathname.replace(/\/$/, '');

        // 提取最后一个 / 之后的部分
        let pageName = pathname.split('/').pop() || 'index.html';

        // 如果没有文件扩展名，自动补上 .html
        if (pageName && !pageName.includes('.')) {
            pageName = pageName + '.html';
        }

        return pageName || 'index.html';
    }

    // 从 pageMapping 中查找映射（支持多种格式的降级匹配）
    function getPageMapping(pageName) {
        // 1. 精确匹配
        if (config.pageMapping[pageName]) {
            return config.pageMapping[pageName];
        }

        // 2. 如果有 .html 扩展名，尝试去掉后再匹配
        if (pageName.endsWith('.html')) {
            const nameWithoutExt = pageName.replace('.html', '');
            if (config.pageMapping[nameWithoutExt]) {
                return config.pageMapping[nameWithoutExt];
            }
        }

        // 3. 如果没有 .html 扩展名，尝试加上后再匹配
        if (!pageName.endsWith('.html')) {
            const nameWithExt = pageName + '.html';
            if (config.pageMapping[nameWithExt]) {
                return config.pageMapping[nameWithExt];
            }
        }

        return undefined;
    }

    // 动态加载依赖库
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function loadDependencies() {
        // 加载 marked.js（如果未加载）
        if (typeof marked === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/marked/16.3.0/lib/marked.umd.min.js');
        }
        // 加载 mermaid.js（如果未加载）
        if (typeof mermaid === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.4.0/mermaid.min.js');
        }
    }

    // 位置映射
    const positions = {
        'bottom-right': 'right: 32px; bottom: 32px;',
        'bottom-left': 'left: 24px; bottom: 24px;',
        'top-right': 'right: 24px; top: 24px;',
        'top-left': 'left: 24px; top: 24px;'
    };

    // 注入样式
    const style = document.createElement('style');
    style.textContent = `
        .prd-fab {
            position: fixed;
            ${positions[buttonPosition] || positions['bottom-right']}
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0 18px 0 14px;
            height: 44px;
            border-radius: 22px;
            background: #1a1a2e;
            color: white;
            border: none;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: transform 0.2s, background 0.2s;
            z-index: 10000;
        }
        .prd-fab:hover {
            transform: scale(1.05);
            background: #2d2d44;
        }
        .prd-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s;
            z-index: 10001;
        }
        .prd-overlay.open {
            opacity: 1;
            visibility: visible;
        }
        .prd-drawer {
            position: fixed;
            top: 0;
            right: 0;
            width: 60vw;
            min-width: 800px;
            height: 100vh;
            background: #fff;
            box-shadow: -4px 0 30px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            z-index: 10002;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .prd-drawer.open {
            transform: translateX(0);
        }
        .prd-header {
            padding: 16px 24px;
            background: #1a1a2e;
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }
        .prd-breadcrumb {
            display: flex;
            align-items: center;
            font-size: 15px;
        }
        .prd-breadcrumb-item {
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        .prd-breadcrumb-item:hover {
            opacity: 1;
        }
        .prd-breadcrumb-root {
            opacity: 0.7;
        }
        .prd-breadcrumb-sep {
            margin: 0 10px;
            opacity: 0.5;
        }
        .prd-breadcrumb-current {
            opacity: 1;
            cursor: default;
        }
        .prd-breadcrumb.at-list .prd-breadcrumb-sep,
        .prd-breadcrumb.at-list .prd-breadcrumb-current {
            display: none;
        }
        .prd-breadcrumb.at-list .prd-breadcrumb-root {
            opacity: 1;
            cursor: default;
        }
        .prd-close {
            background: none;
            border: none;
            color: white;
            font-size: 28px;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
            line-height: 1;
        }
        .prd-close:hover {
            opacity: 1;
        }
        .prd-body {
            flex: 1;
            display: flex;
            overflow: hidden;
            position: relative;
        }
        /* 文档列表视图 */
        .prd-doc-list {
            position: absolute;
            inset: 0;
            background: #fff;
            padding: 24px;
            overflow-y: auto;
            display: none;
        }
        .prd-doc-list.show {
            display: block;
        }
        .prd-doc-list-inner {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px 0;
        }
        .prd-doc-item {
            display: flex;
            align-items: center;
            padding: 16px 24px;
            margin-bottom: 10px;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid #eee;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .prd-doc-item:hover {
            background: #f8f9ff;
            border-color: #4f46e5;
            transform: translateX(4px);
        }
        .prd-doc-item-index {
            font-size: 14px;
            color: #999;
            font-weight: 600;
            width: 32px;
            flex-shrink: 0;
        }
        .prd-doc-item-icon {
            font-size: 20px;
            margin-right: 16px;
            color: #444;
        }
        .prd-doc-item-name {
            font-size: 15px;
            font-weight: 500;
            color: #333;
            flex: 1;
        }
        .prd-doc-item:hover .prd-doc-item-index,
        .prd-doc-item:hover .prd-doc-item-name {
            color: #4f46e5;
        }
        /* 文档内容视图 */
        .prd-doc-view {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        .prd-doc-view.hidden {
            display: none;
        }
        /* 左侧目录 */
        .prd-toc {
            width: 240px;
            background: #f8f9fa;
            border-left: 1px solid #eee;
            flex-shrink: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .prd-toc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid #eee;
            background: #fff;
            flex-shrink: 0;
        }
        .prd-toc-title {
            font-size: 14px;
            font-weight: 600;
            color: #333;
        }
        .prd-toc-toggle {
            background: none;
            border: none;
            width: 28px;
            height: 28px;
            padding: 4px;
            cursor: pointer;
            color: #666;
            border-radius: 4px;
            transition: all 0.15s;
        }
        .prd-toc-toggle:hover {
            background: #eee;
            color: #333;
        }
        .prd-toc-toggle svg {
            width: 100%;
            height: 100%;
        }
        .prd-toc-collapsed {
            display: none;
            width: 36px;
            background: #f8f9fa;
            border-left: 1px solid #eee;
            flex-shrink: 0;
            padding-top: 12px;
        }
        .prd-toc-collapsed.show {
            display: block;
        }
        .prd-toc.hidden {
            display: none;
        }
        .prd-toc-expand {
            background: none;
            border: none;
            width: 28px;
            height: 28px;
            margin: 0 auto;
            display: block;
            padding: 4px;
            cursor: pointer;
            color: #666;
            border-radius: 4px;
            transition: all 0.15s;
        }
        .prd-toc-expand:hover {
            background: #ddd;
            color: #333;
        }
        .prd-toc-expand svg {
            width: 100%;
            height: 100%;
        }
        .prd-toc-list {
            padding: 8px 0;
            flex: 1;
            overflow-y: auto;
        }
        .prd-toc-group {
        }
        .prd-toc-parent {
            display: flex;
            align-items: center;
            padding: 10px 16px;
            color: #333;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
            border-left: 3px solid transparent;
        }
        .prd-toc-parent > span:last-child {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .prd-toc-parent:hover {
            background: #eee;
        }
        .prd-toc-parent.active {
            background: #e8e8ff;
            color: #4f46e5;
            border-left-color: #4f46e5;
        }
        .prd-toc-arrow {
            width: 16px;
            height: 16px;
            margin-right: 6px;
            transition: transform 0.2s;
            flex-shrink: 0;
        }
        .prd-toc-arrow.collapsed {
            transform: rotate(-90deg);
        }
        .prd-toc-arrow.empty {
            visibility: hidden;
        }
        .prd-toc-children {
            overflow: hidden;
            transition: max-height 0.25s ease;
        }
        .prd-toc-children.collapsed {
            max-height: 0 !important;
        }
        .prd-toc-child {
            display: block;
            padding: 8px 16px 8px 38px;
            color: #666;
            text-decoration: none;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.15s;
            border-left: 3px solid transparent;
        }
        .prd-toc-child:hover {
            background: #eee;
            color: #333;
        }
        .prd-toc-child.active {
            background: #e8e8ff;
            color: #4f46e5;
            border-left-color: #4f46e5;
        }
        .prd-toc-child.level-3 {
            padding-left: 52px;
            font-size: 12px;
        }
        .prd-content {
            flex: 1;
            padding: 30px;
            overflow-y: auto;
            background: #fff;
            color: #111827;
        }
        /* Markdown 渲染样式 */
        .prd-content h1 {
            font-size: 2em;
            font-weight: 700;
            color: #1a1a2e;
            margin: 1.5em 0 1em;
            padding-bottom: 0.4em;
            border-bottom: 2px solid #e5e7eb;
            position: relative;
        }
        .prd-content h1::after {
            content: '';
            position: absolute;
            left: 0;
            bottom: -2px;
            width: 80px;
            height: 3px;
            background: #667eea;
            border-radius: 2px;
        }

        .prd-content h2 {
            font-size: 1.6em;
            font-weight: 600;
            color: #1a1a2e;
            margin: 1.8em 0 0.8em;
            padding: 0.4em 0;
            border-left: 4px solid #667eea;
            padding-left: 16px;
            background: linear-gradient(to right, rgba(102, 126, 234, 0.05), transparent);
        }

        .prd-content h3 {
            font-size: 1.3em;
            font-weight: 600;
            color: #2d3748;
            margin: 1.6em 0 0.8em;
            padding: 0.3em 0;
            position: relative;
            padding-left: 12px;
        }
        .prd-content h3::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 0.8em;
            background: #a5b4fc;
            border-radius: 2px;
        }

        .prd-content h4 {
            font-size: 1.1em;
            font-weight: 600;
            color: #4a5568;
            margin: 1.4em 0 0.6em;
            padding-left: 8px;
            position: relative;
        }
        .prd-content h4::before {
            content: '·';
            position: absolute;
            left: -4px;
            color: #a5b4fc;
            font-weight: bold;
        }

        .prd-content h5 {
            font-size: 1em;
            font-weight: 600;
            color: #4a5568;
            margin: 1.2em 0 0.5em;
            padding-left: 12px;
            position: relative;
        }
        .prd-content h5::before {
            content: '›';
            position: absolute;
            left: 0;
            color: #a5b4fc;
        }
        .prd-content p { line-height: 1.8; margin: 0.8em 0; color: #444; }
        /* 列表样式：强制使用浏览器默认多级圆点，仅做轻量缩进/间距调整 */
        .prd-content ul {
            list-style-type: disc;
            list-style-position: outside;
            margin: 0.6em 0 0.6em 1.8em;
            padding-left: 0;
        }
        .prd-content ul ul {
            list-style-type: circle;
            margin-left: 1.5em;
        }
        .prd-content ul ul ul {
            list-style-type: square;
        }
        .prd-content ol {
            list-style-type: decimal;
            list-style-position: outside;
            margin: 0.6em 0 0.6em 1.8em;
            padding-left: 0;
        }
        .prd-content li {
            line-height: 1.8;
            margin: 0.2em 0;
        }
        .prd-content code {
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            color: #e83e8c;
        }
        .prd-content pre {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1em 0;
        }
        .prd-content pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        .prd-content blockquote {
            border-left: 4px solid #e5e7eb;
            padding: 6px 12px;
            color: #666;
            margin: 0.5em 0;
            background: #f8f9fa;
            border-radius: 0 8px 8px 0;
        }
        .prd-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
            font-size: 0.95em;
        }
        .prd-content th, .prd-content td {
            border: 1px solid #ddd;
            padding: 10px 12px;
            text-align: left;
        }
        .prd-content th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .prd-content thead {
            position: static;
        }
        .prd-content a {
            color: #667eea;
        }
        .prd-content img {
            max-width: 100%;
            border-radius: 8px;
        }
        .prd-content hr {
            border: none;
            border-top: 1px solid #eee;
            margin: 1.5em 0;
        }
        .prd-loading {
            text-align: center;
            padding: 40px;
            color: #999;
        }
        .prd-content .mermaid {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 1em 0;
            text-align: center;
        }
        .prd-content .prd-plantuml {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 1em 0;
            text-align: center;
        }
        .prd-content .prd-plantuml img {
            max-width: 100%;
            height: auto;
        }
    `;
    document.head.appendChild(style);

    // 创建 DOM 结构
    const container = document.createElement('div');
    container.innerHTML = `
        <button class="prd-fab" title="查看设计文档">📄 文档</button>
        <div class="prd-overlay"></div>
        <div class="prd-drawer">
            <div class="prd-header">
                <div class="prd-breadcrumb">
                    <span class="prd-breadcrumb-item prd-breadcrumb-root" title="全部文档">📁 全部文档</span>
                    <span class="prd-breadcrumb-sep">›</span>
                    <span class="prd-breadcrumb-item prd-breadcrumb-current">📄 文档</span>
                </div>
                <button class="prd-close">×</button>
            </div>
            <div class="prd-body">
                <!-- 文档列表视图 -->
                <div class="prd-doc-list">
                    <div class="prd-doc-list-inner"></div>
                </div>
                <!-- 文档内容视图 -->
                <div class="prd-doc-view">
                    <div class="prd-content">
                        <div class="prd-loading">加载中...</div>
                    </div>
                    <nav class="prd-toc">
                        <div class="prd-toc-header">
                            <span class="prd-toc-title">大纲</span>
                            <button class="prd-toc-toggle" title="隐藏大纲">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="13 17 18 12 13 7"></polyline>
                                    <polyline points="6 17 11 12 6 7"></polyline>
                                </svg>
                            </button>
                        </div>
                        <div class="prd-toc-list"></div>
                    </nav>
                    <div class="prd-toc-collapsed">
                        <button class="prd-toc-expand" title="显示大纲">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="11 7 6 12 11 17"></polyline>
                                <polyline points="18 7 13 12 18 17"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // 获取元素
    const fab = container.querySelector('.prd-fab');
    const overlay = container.querySelector('.prd-overlay');
    const drawer = container.querySelector('.prd-drawer');
    const closeBtn = container.querySelector('.prd-close');
    const breadcrumbRoot = container.querySelector('.prd-breadcrumb-root');
    const breadcrumbSep = container.querySelector('.prd-breadcrumb-sep');
    const breadcrumbCurrent = container.querySelector('.prd-breadcrumb-current');
    const docList = container.querySelector('.prd-doc-list');
    const docListInner = container.querySelector('.prd-doc-list-inner');
    const docView = container.querySelector('.prd-doc-view');
    const toc = container.querySelector('.prd-toc');
    const tocList = container.querySelector('.prd-toc-list');
    const tocToggle = container.querySelector('.prd-toc-toggle');
    const tocCollapsed = container.querySelector('.prd-toc-collapsed');
    const tocExpand = container.querySelector('.prd-toc-expand');
    const content = container.querySelector('.prd-content');

    let configLoaded = false;

    // 初始化大纲状态
    const isTocHidden = localStorage.getItem('prd-toc-hidden') === 'true';
    if (isTocHidden) {
        toc.classList.add('hidden');
        tocCollapsed.classList.add('show');
    }

    // 大纲显示/隐藏切换
    tocToggle.addEventListener('click', () => {
        toc.classList.add('hidden');
        tocCollapsed.classList.add('show');
        localStorage.setItem('prd-toc-hidden', 'true');
    });

    tocExpand.addEventListener('click', () => {
        toc.classList.remove('hidden');
        tocCollapsed.classList.remove('show');
        localStorage.setItem('prd-toc-hidden', 'false');
    });

    // 加载配置
    async function loadConfig() {
        if (configLoaded) return;
        try {
            const res = await fetch(configUrl);
            if (res.ok) {
                config = await res.json();
            }
        } catch (e) {
            console.warn('PRD config not found, using defaults');
        }
        configLoaded = true;
    }

    // 渲染文档列表
    function renderDocList() {
        docListInner.innerHTML = '';

        // 添加标题
        const header = document.createElement('div');
        header.style.padding = '0 0 16px 4px';
        header.style.color = '#666';
        header.style.fontSize = '14px';
        header.textContent = `共 ${config.docs.length} 篇文档`;
        docListInner.appendChild(header);

        config.docs.forEach((doc, index) => {
            const item = document.createElement('div');
            item.className = 'prd-doc-item';
            item.innerHTML = `
                <span class="prd-doc-item-index">${String(index + 1).padStart(2, '0')}</span>
                <span class="prd-doc-item-icon">📄</span>
                <div class="prd-doc-item-name">${doc.name}</div>
            `;
            item.onclick = () => openDoc(doc.file, doc.name, 'user');
            docListInner.appendChild(item);
        });
    }

    // 切换到列表视图
    function showListView() {
        currentView = 'list';
        docList.classList.add('show');
        docView.classList.add('hidden');
        container.querySelector('.prd-breadcrumb').classList.add('at-list');
    }

    // 切换到文档视图
    function showDocView(docName) {
        currentView = 'doc';
        docList.classList.remove('show');
        docView.classList.remove('hidden');
        container.querySelector('.prd-breadcrumb').classList.remove('at-list');
        breadcrumbCurrent.textContent = '📄 ' + docName;
    }

    // 打开指定文档
    // source: 'user' 表示用户主动选择（写入按页缓存）；其他值不写入
    async function openDoc(file, name, source) {
        currentDoc = file;
        if (source === 'user') {
            setUserChoice(file);
        }
        showDocView(name || file);
        await loadDocContent(scriptDir + '/../docs/' + file);
    }

    // 打开抽屉
    async function open() {
        overlay.classList.add('open');
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';

        // 加载配置
        await loadConfig();
        renderDocList();

        // 1) 优先使用用户主动选择的缓存（按页面分别存储）
        const userChoice = getUserChoice();
        if (userChoice) {
            const docInfo = config.docs.find(d => d.file === userChoice);
            if (docInfo) {
                await openDoc(userChoice, docInfo.name);
                return;
            }
            // 缓存指向已不存在的文档时，清掉缓存并回退
            clearUserChoice();
        }

        // 2) 回退：使用页面映射
        const pageName = getPageName();
        const mapping = getPageMapping(pageName);

        if (mapping === '*') {
            // 显示文档列表
            showListView();
        } else if (mapping) {
            // 显示具体文档（通过映射找到）
            const docInfo = config.docs.find(d => d.file === mapping);
            const docName = docInfo ? docInfo.name : mapping;
            await openDoc(mapping, docName);
        } else {
            // 备选方案：尝试将页面名转换为 markdown 文件名
            const docFile = pageName.replace('.html', '.md');
            const docInfo = config.docs.find(d => d.file === docFile);
            if (docInfo) {
                await openDoc(docFile, docInfo.name);
            } else {
                // 如果还是找不到，显示文档列表
                showListView();
            }
        }
    }

    // 关闭抽屉
    function close() {
        overlay.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    async function openDocByPath(file, name) {
        overlay.classList.add('open');
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';

        await loadConfig();
        renderDocList();
        await openDoc(file, name || file);
    }

    // 点击面包屑返回列表
    breadcrumbRoot.addEventListener('click', () => {
        if (currentView === 'doc') {
            showListView();
        }
    });

    // 加载文档内容
    async function loadDocContent(docPath) {
        try {
            content.innerHTML = '<div class="prd-loading">加载中...</div>';
            tocList.innerHTML = ''; // 清空大纲

            // 先加载依赖库
            await loadDependencies();

            // 强制不走任何缓存：cache:'no-store' + 时间戳参数
            // 这样磁盘缓存和内存缓存都会被绕过，每次都拿到最新内容
            const noCacheUrl = docPath + (docPath.includes('?') ? '&' : '?') + '_t=' + Date.now();
            const res = await fetch(noCacheUrl, { cache: 'no-store' });
            if (!res.ok) throw new Error('文档未找到: ' + docPath);
            const md = await res.text();

            content.innerHTML = marked.parse(md);

            // 修复图片路径：将相对于 md 文件的路径转换为相对于 docs 目录的路径
            const images = content.querySelectorAll('img');
            images.forEach(img => {
                const src = img.getAttribute('src');
                // 如果是相对路径（不是 http/https/data 开头），添加 docs 目录前缀
                if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/')) {
                    img.src = '../docs/' + src;
                }
            });

            // 生成目录
            buildTOC();

            // 先渲染 PlantUML 图表（在 Mermaid 之前，避免冲突）
            await renderPlantUML();

            // 渲染 Mermaid 图表
            if (typeof mermaid !== 'undefined') {
                const codeBlocks = content.querySelectorAll('pre code');
                codeBlocks.forEach((block) => {
                    const text = block.textContent.trim();
                    // 排除 PlantUML 代码块
                    if (block.className.includes('language-plantuml') || text.startsWith('@start')) {
                        return;
                    }
                    const isMermaid = block.className.includes('language-mermaid') ||
                        block.className.includes('mermaid') ||
                        /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline)/.test(text);

                    if (isMermaid) {
                        const pre = block.parentElement;
                        const div = document.createElement('div');
                        div.className = 'mermaid';
                        div.textContent = text;
                        pre.replaceWith(div);
                    }
                });

                mermaid.initialize({ startOnLoad: false, theme: 'default' });
                await mermaid.run({ querySelector: '.prd-content .mermaid' });
            }

            // 恢复滚动条位置（在所有内容渲染完成后执行）
            // 使用 sessionStorage：保留本次会话的滚动位置，但重新打开/刷新可拉到最新内容
            const savedScroll = sessGet('scroll-' + currentDoc);
            if (savedScroll) {
                setTimeout(() => {
                    content.scrollTop = parseInt(savedScroll);
                }, 50); // 稍微增加延时确保布局稳定
            } else {
                content.scrollTop = 0;
            }
        } catch (e) {
            content.innerHTML = '<div class="prd-loading">❌ ' + e.message + '</div>';
        }
    }

    // 加载 pako 库用于 deflate 压缩
    async function loadPako() {
        if (typeof pako === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js');
        }
    }

    // PlantUML 编码函数（使用 PlantUML 官方的编码方式：deflate + 自定义64位编码）
    function encodePlantUML(code) {
        // PlantUML 使用自定义的 64 位编码
        function encode6bit(b) {
            if (b < 10) return String.fromCharCode(48 + b); // 0-9
            b -= 10;
            if (b < 26) return String.fromCharCode(65 + b); // A-Z
            b -= 26;
            if (b < 26) return String.fromCharCode(97 + b); // a-z
            b -= 26;
            if (b === 0) return '-';
            if (b === 1) return '_';
            return '?';
        }

        function append3bytes(b1, b2, b3) {
            const c1 = b1 >> 2;
            const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
            const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
            const c4 = b3 & 0x3F;
            return encode6bit(c1 & 0x3F) + encode6bit(c2 & 0x3F) + encode6bit(c3 & 0x3F) + encode6bit(c4 & 0x3F);
        }

        // 将字符串转为 UTF-8 字节数组
        const encoder = new TextEncoder();
        const data = encoder.encode(code);

        // 使用 pako 进行 deflate 压缩（level 9，raw deflate）
        const compressed = pako.deflateRaw(data, { level: 9 });

        let result = '';
        for (let i = 0; i < compressed.length; i += 3) {
            if (i + 2 === compressed.length) {
                result += append3bytes(compressed[i], compressed[i + 1], 0);
            } else if (i + 1 === compressed.length) {
                result += append3bytes(compressed[i], 0, 0);
            } else {
                result += append3bytes(compressed[i], compressed[i + 1], compressed[i + 2]);
            }
        }
        return result;
    }

    // 渲染 PlantUML 图表
    async function renderPlantUML() {
        const codeBlocks = content.querySelectorAll('pre code');
        const plantUMLBlocks = [];
        const imageLoadPromises = [];

        console.log('[PlantUML] 检测到代码块数量:', codeBlocks.length);

        codeBlocks.forEach((block, index) => {
            const text = block.textContent.trim();
            console.log(`[PlantUML] 代码块 ${index}: className="${block.className}", 内容前50字符="${text.substring(0, 50)}"`);

            // 检测 language-plantuml 类名或 PlantUML 语法标记
            const isPlantUML = block.className.includes('language-plantuml') ||
                block.className.includes('plantuml') ||
                text.startsWith('@startuml') ||
                text.startsWith('@startmindmap') ||
                text.startsWith('@startwbs') ||
                text.startsWith('@startgantt');

            console.log(`[PlantUML] 代码块 ${index} 是否为 PlantUML:`, isPlantUML);

            if (isPlantUML) {
                plantUMLBlocks.push({ block, text });
            }
        });

        console.log('[PlantUML] 找到 PlantUML 代码块数量:', plantUMLBlocks.length);

        if (plantUMLBlocks.length === 0) return;

        // 加载 pako 库
        await loadPako();

        // 处理所有 PlantUML 代码块
        for (const { block, text } of plantUMLBlocks) {
            try {
                const pre = block.parentElement;
                console.log('[PlantUML] 开始编码，原始代码长度:', text.length);
                const encoded = encodePlantUML(text);
                console.log('[PlantUML] 编码结果:', encoded.substring(0, 100) + '...');

                const buildImageUrl = (serverBase, encodedText) => {
                    const base = String(serverBase || '').replace(/\/$/, '');
                    return `${base}/svg/${encodedText}`;
                };

                // 创建图片容器
                const container = document.createElement('div');
                container.className = 'prd-plantuml';
                container.style.cssText = 'background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 1em 0; text-align: center;';

                // 创建加载提示
                const loading = document.createElement('div');
                loading.style.cssText = 'color: #666; padding: 10px;';
                loading.textContent = '加载 PlantUML 图表中...';
                container.appendChild(loading);

                // 创建图片元素
                const img = document.createElement('img');

                const loadPromise = new Promise((resolve) => {
                    let done = false;
                    let serverIndex = 0;
                    const tried = [];

                    const finish = () => {
                        if (done) return;
                        done = true;
                        resolve();
                    };

                    const tryLoadNextServer = () => {
                        const serverBase = PLANTUML_SERVERS[serverIndex++];
                        if (!serverBase) {
                            console.error('[PlantUML] all servers failed:', tried);
                            loading.remove();
                            const errorMsg = document.createElement('div');
                            errorMsg.style.cssText = 'color: #e74c3c; padding: 20px; text-align: left;';
                            errorMsg.innerHTML =
                                '❌ PlantUML 图表加载失败（可能是网络/代理拦截或 PlantUML 公共服务限流，例如 509）' +
                                `<br><small>已尝试服务：${tried.map(s => s.replace(/^https?:\/\//, '')).join(' / ') || '无'}</small>` +
                                '<br><small>建议：配置内网 PlantUML 服务：在页面设置 window.PLANTUML_SERVER 或 script 标签加 data-plantuml-server</small>';
                            container.innerHTML = '';
                            container.appendChild(errorMsg);
                            finish();
                            return;
                        }

                        const imageUrl = buildImageUrl(serverBase, encoded);
                        tried.push(serverBase);
                        console.log('[PlantUML] 图片URL:', imageUrl);
                        img.src = imageUrl;
                    };

                    img.onload = () => {
                        if (done) return;
                        loading.remove();
                        img.style.display = 'block';
                        finish();
                    };

                    img.onerror = (e) => {
                        console.error('PlantUML image load error:', e, 'current src:', img.src);
                        // 自动切换下一个服务地址
                        tryLoadNextServer();
                    };

                    // 启动首次加载
                    tryLoadNextServer();
                });
                imageLoadPromises.push(loadPromise);

                img.alt = 'PlantUML Diagram';
                img.style.cssText = 'max-width: 100%; height: auto; display: none;';

                container.appendChild(img);
                pre.replaceWith(container);
            } catch (e) {
                console.error('PlantUML render error:', e);
                const pre = block.parentElement;
                const errorDiv = document.createElement('div');
                errorDiv.className = 'prd-plantuml';
                errorDiv.style.cssText = 'background: #fee; padding: 20px; border-radius: 8px; margin: 1em 0; color: #e74c3c;';
                errorDiv.textContent = '❌ PlantUML 渲染错误: ' + e.message;
                pre.replaceWith(errorDiv);
            }
        }

        // 等待所有图片加载完成
        if (imageLoadPromises.length > 0) {
            console.log(`[PlantUML] Waiting for ${imageLoadPromises.length} images...`);
            await Promise.all(imageLoadPromises);
            console.log('[PlantUML] All images loaded');
        }
    }

    // 绑定事件
    fab.addEventListener('click', open);
    overlay.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });

    window.prdDrawer = {
        open,
        close,
        openDocByPath,
    };

    // 生成目录
    function buildTOC() {
        // 获取所有标题
        const headings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
        tocList.innerHTML = '';

        // 构建树状结构（支持任意层级）
        const tree = [];
        const stack = [{ level: 0, children: tree }];

        headings.forEach((heading, index) => {
            const id = 'prd-heading-' + index;
            heading.id = id;
            const level = parseInt(heading.tagName.charAt(1));
            const node = { heading, id, level, children: [] };

            // 找到合适的父级
            while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }
            stack[stack.length - 1].children.push(node);
            stack.push(node);
        });

        // 箭头 SVG
        const arrowSvg = '<svg class="prd-toc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';

        // 大纲展开状态存储 key（用 sessionStorage：本次会话内保持展开状态）
        const tocStateKey = 'toc-state-' + (currentDoc || 'default');

        // 获取保存的展开状态
        function getCollapsedNodes() {
            try {
                return JSON.parse(sessGet(tocStateKey)) || {};
            } catch (e) {
                return {};
            }
        }

        // 保存展开状态
        function saveCollapsedNodes(collapsed) {
            sessSet(tocStateKey, JSON.stringify(collapsed));
        }

        // 生成节点唯一标识（标题文字 + 层级）
        function getNodeKey(node) {
            return node.heading.textContent.trim() + '|h' + node.level;
        }

        let collapsedNodes = getCollapsedNodes();

        // 递归渲染树
        function renderNode(node, container, depth = 0) {
            const groupEl = document.createElement('div');
            groupEl.className = 'prd-toc-group';

            // 标题项
            const itemEl = document.createElement('div');
            itemEl.className = 'prd-toc-parent';
            itemEl.style.paddingLeft = (16 + depth * 12) + 'px';
            const headingText = node.heading.textContent;
            itemEl.innerHTML = (node.children.length > 0 ? arrowSvg : '<span class="prd-toc-arrow empty"></span>') +
                '<span title="' + headingText.replace(/"/g, '&quot;') + '">' + headingText + '</span>';
            itemEl.dataset.id = node.id;

            // 子级容器
            const childrenEl = document.createElement('div');
            childrenEl.className = 'prd-toc-children';

            // 递归渲染子级
            node.children.forEach(child => {
                renderNode(child, childrenEl, depth + 1);
            });

            // 计算子级高度用于动画
            if (node.children.length > 0) {
                childrenEl.style.maxHeight = (countNodes(node) * 40) + 'px';
            }

            // 恢复保存的展开/收起状态
            const nodeKey = getNodeKey(node);
            if (node.children.length > 0 && collapsedNodes[nodeKey]) {
                const arrow = itemEl.querySelector('.prd-toc-arrow');
                if (arrow) arrow.classList.add('collapsed');
                childrenEl.classList.add('collapsed');
            }

            // 点击箭头只展开/收起
            const arrow = itemEl.querySelector('.prd-toc-arrow');
            if (arrow && node.children.length > 0) {
                arrow.onclick = (e) => {
                    e.stopPropagation();
                    const isCollapsed = arrow.classList.toggle('collapsed');
                    childrenEl.classList.toggle('collapsed');

                    // 保存状态
                    if (isCollapsed) {
                        collapsedNodes[nodeKey] = true;
                    } else {
                        delete collapsedNodes[nodeKey];
                    }
                    saveCollapsedNodes(collapsedNodes);
                };
            }

            // 点击文字跳转并选中
            const textSpan = itemEl.querySelector('span:last-child');
            if (textSpan) {
                textSpan.style.cursor = 'pointer';
                textSpan.onclick = (e) => {
                    e.stopPropagation();
                    node.heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setActive(node.id);
                };
            }

            groupEl.appendChild(itemEl);
            groupEl.appendChild(childrenEl);
            container.appendChild(groupEl);
        }

        // 计算节点总数（用于动画高度）
        function countNodes(node) {
            let count = node.children.length;
            node.children.forEach(child => {
                count += countNodes(child);
            });
            return count;
        }

        // 渲染顶层节点
        tree.forEach(node => renderNode(node, tocList));

        // 设置高亮
        function setActive(id) {
            tocList.querySelectorAll('.prd-toc-parent, .prd-toc-child').forEach(el => {
                el.classList.toggle('active', el.dataset.id === id);
            });
            // 自动将高亮项滚动到可视区域
            const activeEl = tocList.querySelector('.prd-toc-parent.active, .prd-toc-child.active');
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'instant', block: 'nearest' });
            }
        }

        // 默认高亮第一个
        if (tree.length > 0) {
            setActive(tree[0].id);
        }

        // 收集所有节点用于滚动高亮
        function getAllNodes(nodes) {
            let all = [];
            nodes.forEach(n => {
                all.push(n);
                all = all.concat(getAllNodes(n.children));
            });
            return all;
        }
        const allNodes = getAllNodes(tree);

        // 更新滚动监听
        content.removeEventListener('scroll', scrollHandler);

        let saveScrollTimer = null;
        function scrollHandler() {
            // 保存滚动位置（防抖处理）- 用 sessionStorage
            if (saveScrollTimer) clearTimeout(saveScrollTimer);
            saveScrollTimer = setTimeout(() => {
                if (currentDoc) {
                    sessSet('scroll-' + currentDoc, content.scrollTop);
                }
            }, 200);

            let current = null;
            allNodes.forEach((node) => {
                const rect = node.heading.getBoundingClientRect();
                const contentRect = content.getBoundingClientRect();
                if (rect.top <= contentRect.top + 100) {
                    current = node;
                }
            });
            if (current) {
                setActive(current.id);
            }
        }
        content.addEventListener('scroll', scrollHandler);
    }

    // 暴露 API
    window.PRDDrawer = { open, close, reload: () => { loaded = false; loadDoc(); } };
})();
