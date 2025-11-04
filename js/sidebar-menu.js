/**
 * 侧边栏菜单组件
 * 提供统一的左侧导航菜单功能
 */

// 菜单配置
const SIDEBAR_MENU_CONFIG = [
    {
        id: 'ai-storybook',
        name: 'AI绘本',
        icon: 'book-open',
        link: 'home.html',
        badge: null
    },
    {
        id: 'smart-teaching',
        name: '智能教学',
        icon: 'graduation-cap',
        link: '#',
        badge: null
    },
    {
        id: 'homework',
        name: '作业&批改',
        icon: 'file-text',
        link: '#',
        badge: null
    },
    {
        id: 'smart-paper',
        name: '智能组卷',
        icon: 'file-plus',
        link: '#',
        badge: null
    },
    {
        id: 'data-analysis',
        name: '数据分析',
        icon: 'bar-chart-2',
        link: '#',
        badge: null
    },
    {
        id: 'student-manage',
        name: '学生管理',
        icon: 'users',
        link: '#',
        badge: null
    },
    {
        id: 'my-resources',
        name: '我的资源',
        icon: 'folder',
        link: '#',
        badge: null
    },
    {
        id: 'academic-affairs',
        name: '教务管理',
        icon: 'settings',
        link: '#',
        badge: null
    }
];

/**
 * 初始化侧边栏菜单
 * @param {string} activeMenuId - 当前激活的菜单项ID
 * @param {string} containerId - 侧边栏容器ID，默认为 'sidebarMenu'
 */
function initSidebarMenu(activeMenuId = '', containerId = 'sidebarMenu') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`侧边栏容器 #${containerId} 不存在`);
        return;
    }

    // 创建侧边栏HTML
    const sidebarHTML = `
        <div class="sidebar-menu">
            <div class="sidebar-menu-list">
                ${SIDEBAR_MENU_CONFIG.map(item => createMenuItem(item, activeMenuId)).join('')}
            </div>
        </div>
    `;

    container.innerHTML = sidebarHTML;

    // 初始化图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 绑定点击事件
    bindMenuEvents(container);

    // 返回侧边栏实例
    return {
        setActive: (menuId) => setActiveMenu(container, menuId),
        getActive: () => getActiveMenu(container)
    };
}

/**
 * 创建菜单项HTML
 * @param {Object} item - 菜单项配置
 * @param {string} activeMenuId - 当前激活的菜单ID
 * @returns {string} 菜单项HTML字符串
 */
function createMenuItem(item, activeMenuId) {
    const isActive = item.id === activeMenuId;
    const activeClass = isActive ? 'active' : '';
    const badge = item.badge ? `<span class="sidebar-menu-item-badge">${item.badge}</span>` : '';

    return `
        <a href="${item.link}" 
           class="sidebar-menu-item ${activeClass}" 
           data-menu-id="${item.id}"
           ${item.link === '#' ? 'onclick="return false;"' : ''}>
            <span class="sidebar-menu-item-icon">
                <i data-lucide="${item.icon}"></i>
            </span>
            <span class="sidebar-menu-item-text">${item.name}</span>
            ${badge}
        </a>
    `;
}

/**
 * 绑定菜单点击事件
 * @param {HTMLElement} container - 侧边栏容器
 */
function bindMenuEvents(container) {
    const menuItems = container.querySelectorAll('.sidebar-menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const link = this.getAttribute('href');
            const menuId = this.getAttribute('data-menu-id');
            
            // 如果是 # 链接，阻止默认跳转，显示提示
            if (link === '#') {
                e.preventDefault();
                showMenuComingSoon(this.querySelector('.sidebar-menu-item-text').textContent);
                return;
            }
            
            // 正常链接，更新激活状态
            setActiveMenu(container, menuId);
        });
    });
}

/**
 * 设置激活的菜单项
 * @param {HTMLElement} container - 侧边栏容器
 * @param {string} menuId - 要激活的菜单ID
 */
function setActiveMenu(container, menuId) {
    const menuItems = container.querySelectorAll('.sidebar-menu-item');
    menuItems.forEach(item => {
        if (item.getAttribute('data-menu-id') === menuId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * 获取当前激活的菜单ID
 * @param {HTMLElement} container - 侧边栏容器
 * @returns {string|null} 激活的菜单ID
 */
function getActiveMenu(container) {
    const activeItem = container.querySelector('.sidebar-menu-item.active');
    return activeItem ? activeItem.getAttribute('data-menu-id') : null;
}

/**
 * 显示功能即将上线提示
 * @param {string} menuName - 菜单名称
 */
function showMenuComingSoon(menuName) {
    // 如果页面有自定义的 showToast 方法，使用它
    if (typeof showToast === 'function') {
        showToast(`${menuName}功能即将上线，敬请期待！`, 'info');
    } else {
        // 否则使用原生alert
        alert(`${menuName}功能即将上线，敬请期待！`);
    }
}

/**
 * 根据当前页面URL自动设置激活菜单
 * @param {string} containerId - 侧边栏容器ID
 */
function autoInitSidebarMenu(containerId = 'sidebarMenu') {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // 根据页面名称确定激活的菜单
    let activeMenuId = '';
    SIDEBAR_MENU_CONFIG.forEach(item => {
        if (item.link === currentPage) {
            activeMenuId = item.id;
        }
    });
    
    return initSidebarMenu(activeMenuId, containerId);
}

// 导出到全局（如果需要）
if (typeof window !== 'undefined') {
    window.initSidebarMenu = initSidebarMenu;
    window.autoInitSidebarMenu = autoInitSidebarMenu;
}

