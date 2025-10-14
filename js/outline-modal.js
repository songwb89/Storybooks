/**
 * 大纲确认模态窗口组件
 * 可复用的故事大纲编辑和确认界面
 */
class OutlineModal {
    constructor(options = {}) {
        this.options = {
            containerId: 'outlineModal',
            onSave: options.onSave || (() => {}),
            onGenerate: options.onGenerate || (() => {}),
            onClose: options.onClose || (() => {}),
            ...options
        };
        
        this.storyData = null;
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        this.createModal();
        this.bindEvents();
    }
    
    createModal() {
        const modalHTML = `
            <!-- 全屏大纲确认弹窗 -->
            <div id="${this.options.containerId}" class="fixed inset-0 bg-white z-[60] hidden">
                <!-- 顶部操作栏 -->
                <div class="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
                    <button onclick="outlineModal.close()" class="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                        <i data-lucide="x" class="w-5 h-5"></i>
                        <span class="font-medium">取消</span>
                    </button>
                    
                    <h2 class="text-xl font-bold text-gray-800">确认故事大纲</h2>
                    
                    <div class="flex items-center gap-3">
                        <button onclick="outlineModal.saveDraft()" class="flex items-center gap-2 px-5 py-2 border-2 border-primary-500 text-primary-600 bg-white rounded-lg font-medium hover:bg-primary-50 transition-all">
                            <i data-lucide="save" class="w-4 h-4"></i>
                            <span>保存草稿</span>
                        </button>
                        <button onclick="outlineModal.generate()" class="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all">
                            <i data-lucide="wand-2" class="w-4 h-4"></i>
                            <span>生成绘本</span>
                        </button>
                    </div>
                </div>

                <!-- 主内容区 -->
                <div class="flex h-[calc(100vh-73px)] overflow-hidden">
                    <!-- 左侧侧边栏 -->
                    <aside class="w-[350px] bg-white border-r border-gray-200 overflow-y-auto p-5" style="scrollbar-width: thin;">
                        <!-- 标题区 -->
                        <div class="mb-5">
                            <div id="modalStoryTitle" contenteditable="false" 
                                 class="text-2xl font-bold text-gray-800 px-3 py-2 rounded-lg border-2 border-transparent hover:bg-gray-50 hover:border-gray-200 cursor-pointer transition-all outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50 focus:bg-white">
                                故事标题
                            </div>
                        </div>

                        <!-- 核心主题区 -->
                        <div class="mb-5">
                            <div class="flex items-center gap-2 mb-2.5">
                                <i data-lucide="lightbulb" class="w-4 h-4 text-amber-500"></i>
                                <h3 class="text-sm font-semibold text-gray-700">核心主题</h3>
                            </div>
                            <div id="modalThemeContent" contenteditable="false"
                                 class="px-3 py-3 bg-primary-50 border-l-3 border-primary-400 rounded-lg text-sm text-gray-700 leading-relaxed cursor-pointer hover:bg-primary-100 transition-all outline-none focus:ring-2 focus:ring-primary-300 focus:bg-white min-h-[50px]">
                                故事主题
                            </div>
                        </div>

                        <!-- 主要角色区 -->
                        <div class="mb-5">
                            <div class="flex justify-between items-center mb-2.5">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="users" class="w-4 h-4 text-primary-500"></i>
                                    <h3 class="text-sm font-semibold text-gray-700">主要角色</h3>
                                </div>
                                <button onclick="outlineModal.addCharacter()" 
                                        class="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs rounded-lg transition-all hover:-translate-y-0.5 shadow-sm hover:shadow">
                                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                                    <span>添加</span>
                                </button>
                            </div>
                            <div id="modalCharactersList"></div>
                        </div>

                        <!-- 主要场景区 -->
                        <div class="mb-5">
                            <div class="flex justify-between items-center mb-2.5">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="map-pin" class="w-4 h-4 text-emerald-500"></i>
                                    <h3 class="text-sm font-semibold text-gray-700">主要场景</h3>
                                </div>
                                <button onclick="outlineModal.addSetting()" 
                                        class="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs rounded-lg transition-all hover:-translate-y-0.5 shadow-sm hover:shadow">
                                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                                    <span>添加</span>
                                </button>
                            </div>
                            <div id="modalSettingsList"></div>
                        </div>
                    </aside>

                    <!-- 右侧内容区 -->
                    <main class="flex-1 overflow-y-auto px-8 py-6" style="scrollbar-width: thin;">
                <!-- 大纲标题 -->
                <div class="flex items-center justify-center gap-3 mb-6">
                    <i data-lucide="file-text" class="w-6 h-6 text-primary-500"></i>
                    <h2 class="text-2xl font-bold text-gray-800">故事大纲</h2>
                </div>
                        
                        <div id="modalOutlineList" class="max-w-4xl mx-auto"></div>
                    </main>
                </div>
            </div>
        `;
        
        // 如果模态窗口不存在，则创建它
        if (!document.getElementById(this.options.containerId)) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }
    
    bindEvents() {
        // 设置可编辑元素的事件监听
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEditableElements();
        });
    }
    
    setupEditableElements() {
        const title = document.getElementById('modalStoryTitle');
        const theme = document.getElementById('modalThemeContent');

        if (title) {
            title.addEventListener('click', function() {
                this.contentEditable = 'true';
                this.focus();
            });

            title.addEventListener('blur', () => {
                title.contentEditable = 'false';
                if (this.storyData && this.storyData.core_elements) {
                    this.storyData.core_elements.title = title.textContent.trim();
                }
            });
        }

        if (theme) {
            theme.addEventListener('click', function() {
                this.contentEditable = 'true';
                this.focus();
            });

            theme.addEventListener('blur', () => {
                theme.contentEditable = 'false';
                if (this.storyData && this.storyData.core_elements) {
                    this.storyData.core_elements.theme = theme.textContent.trim();
                }
            });
        }
    }
    
    open(storyData) {
        this.storyData = storyData || this.getDefaultStoryData();
        this.isOpen = true;
        
        const modal = document.getElementById(this.options.containerId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            this.renderContent();
            
            // 重新创建图标
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
    
    async close() {
        if (typeof showConfirm === 'function') {
            const confirmed = await showConfirm(
                '确定要关闭吗？未保存的修改将会丢失。',
                '关闭确认'
            );
            if (!confirmed) return;
        }
        
        this.isOpen = false;
        const modal = document.getElementById(this.options.containerId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
        
        this.options.onClose(this.storyData);
    }
    
    saveDraft() {
        this.options.onSave(this.storyData);
        
        // 显示保存成功提示
        if (typeof showToast === 'function') {
            showToast('草稿已保存');
        }
        
        // 保存后直接关闭窗口，不弹出确认对话框
        this.closeDirectly();
    }
    
    generate() {
        this.options.onGenerate(this.storyData);
    }
    
    // 直接关闭窗口，不弹出确认对话框
    closeDirectly() {
        this.isOpen = false;
        const modal = document.getElementById(this.options.containerId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
        
        this.options.onClose(this.storyData);
    }
    
    renderContent() {
        if (!this.storyData) return;
        
        this.renderTitle();
        this.renderTheme();
        this.renderCharacters();
        this.renderSettings();
        this.renderOutline();
        this.updatePageCount();
    }
    
    renderTitle() {
        const titleElement = document.getElementById('modalStoryTitle');
        if (titleElement && this.storyData.core_elements) {
            titleElement.textContent = this.storyData.core_elements.title || '故事标题';
        }
    }
    
    renderTheme() {
        const themeElement = document.getElementById('modalThemeContent');
        if (themeElement && this.storyData.core_elements) {
            themeElement.textContent = this.storyData.core_elements.theme || '故事主题';
        }
    }
    
    renderCharacters() {
        const container = document.getElementById('modalCharactersList');
        if (!container || !this.storyData.core_elements) return;
        
        const characters = this.storyData.core_elements.characters || [];
        
        if (characters.length === 0) {
            container.innerHTML = '<div class="text-center py-6 text-sm text-gray-400">暂无角色</div>';
            return;
        }

        container.innerHTML = characters.map((char, index) => `
            <div class="group relative bg-white border border-gray-200 rounded-xl p-3 mb-2.5 hover:border-primary-300 hover:shadow-sm transition-all">
                <button onclick="outlineModal.deleteCharacter(${index})" 
                        class="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
                <div onclick="outlineModal.editCardField(this, 'characters', ${index}, 'name')" 
                     class="text-sm font-semibold text-gray-800 mb-1.5 px-1.5 py-1 rounded border border-transparent hover:bg-gray-50 cursor-pointer">${char.name || ''}</div>
                <div onclick="outlineModal.editCardField(this, 'characters', ${index}, 'description')" 
                     class="text-xs text-gray-600 leading-relaxed px-1.5 py-1 rounded border border-transparent hover:bg-gray-50 cursor-pointer min-h-[36px]">${char.description || ''}</div>
            </div>
        `).join('');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    renderSettings() {
        const container = document.getElementById('modalSettingsList');
        if (!container || !this.storyData.core_elements) return;
        
        const settings = this.storyData.core_elements.settings || [];
        
        if (settings.length === 0) {
            container.innerHTML = '<div class="text-center py-6 text-sm text-gray-400">暂无场景</div>';
            return;
        }

        container.innerHTML = settings.map((setting, index) => `
            <div class="group relative bg-white border border-gray-200 rounded-xl p-3 mb-2.5 hover:border-emerald-300 hover:shadow-sm transition-all">
                <button onclick="outlineModal.deleteSetting(${index})" 
                        class="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
                <div onclick="outlineModal.editCardField(this, 'settings', ${index}, 'name')" 
                     class="text-sm font-semibold text-gray-800 mb-1.5 px-1.5 py-1 rounded border border-transparent hover:bg-gray-50 cursor-pointer">${setting.name || ''}</div>
                <div onclick="outlineModal.editCardField(this, 'settings', ${index}, 'description')" 
                     class="text-xs text-gray-600 leading-relaxed px-1.5 py-1 rounded border border-transparent hover:bg-gray-50 cursor-pointer min-h-[36px]">${setting.description || ''}</div>
            </div>
        `).join('');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    renderOutline(highlightIndex = -1) {
        const container = document.getElementById('modalOutlineList');
        if (!container || !this.storyData.outline) return;
        
        const outline = this.storyData.outline || [];
        
        if (outline.length === 0) {
            container.innerHTML = '<div class="text-center py-12 text-gray-400">暂无故事大纲</div>';
            return;
        }

        const pageCount = outline.length;
        const canAdd = pageCount < 20;
        const canDelete = pageCount > 6;

        let html = '';
        
        outline.forEach((page, index) => {
            // 在每页之前添加插入区域
            const isFirst = index === 0;
            const insertText = isFirst ? '在开头插入新页' : '在此处插入新页';
            const isDisabled = !canAdd;
            
            html += `
            <div class="group/insert relative h-6 flex items-center justify-center ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} my-3" 
                 onclick="${isDisabled ? 'outlineModal.handleInsertDisabled()' : `outlineModal.insertPageBefore(${index})`}">
                <!-- 细线 -->
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-dashed ${isDisabled ? 'border-gray-200' : 'border-gray-200 group-hover/insert:border-primary-300'} transition-colors"></div>
                </div>
                <!-- 中心圆点和文字 -->
                <div class="relative bg-white px-3 flex items-center gap-2 ${isDisabled ? '' : 'group-hover/insert:bg-primary-50'} rounded-full transition-all">
                    <div class="w-1.5 h-1.5 rounded-full ${isDisabled ? 'bg-gray-300' : 'bg-gray-300 group-hover/insert:hidden'}"></div>
                    <div class="hidden ${isDisabled ? 'group-hover/insert:flex' : 'group-hover/insert:flex'} items-center gap-1.5 ${isDisabled ? 'text-gray-400' : 'text-primary-600'} text-xs font-medium">
                        <i data-lucide="${isDisabled ? 'alert-circle' : 'plus-circle'}" class="w-4 h-4"></i>
                        <span>${isDisabled ? '已达最大页数(20页)' : insertText}</span>
                    </div>
                </div>
            </div>`;
            
            // 页面卡片
            const isHighlight = index === highlightIndex;
            html += `
            <div id="page-${index}" class="group relative bg-white border border-gray-200 rounded-2xl p-6 mb-4 hover:border-primary-300 hover:shadow-md transition-all ${isHighlight ? 'page-highlight' : ''}">
                ${canDelete ? `
                <button onclick="outlineModal.deletePage(${index})" 
                        class="absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
                ` : ''}
                
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 bg-gradient-to-r from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        ${page.page_number || index + 1}
                    </div>
                    <div>
                        <div onclick="outlineModal.editPageField(this, ${index}, 'scene')" 
                             class="text-sm font-semibold text-primary-600 px-2 py-1 rounded border border-transparent hover:bg-primary-50 cursor-pointer">${page.scene || '场景'}</div>
                    </div>
                </div>
                
                <div onclick="outlineModal.editPageField(this, ${index}, 'plot_summary')" 
                     class="text-gray-700 leading-relaxed px-2 py-2 rounded border border-transparent hover:bg-gray-50 cursor-pointer min-h-[60px]">${page.plot_summary || '情节描述'}</div>
            </div>`;
        });
        
        // 在最后一页之后添加插入区域
        const endBtnDisabled = !canAdd;
        html += `
        <div class="group/insert relative h-6 flex items-center justify-center ${endBtnDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} my-3" 
             onclick="${endBtnDisabled ? 'outlineModal.handleInsertDisabled()' : `outlineModal.insertPageAfter(${pageCount - 1})`}">
            <!-- 细线 -->
            <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-dashed ${endBtnDisabled ? 'border-gray-200' : 'border-gray-200 group-hover/insert:border-primary-300'} transition-colors"></div>
            </div>
            <!-- 中心圆点和文字 -->
            <div class="relative bg-white px-3 flex items-center gap-2 ${endBtnDisabled ? '' : 'group-hover/insert:bg-primary-50'} rounded-full transition-all">
                <div class="w-1.5 h-1.5 rounded-full ${endBtnDisabled ? 'bg-gray-300' : 'bg-gray-300 group-hover/insert:hidden'}"></div>
                <div class="hidden ${endBtnDisabled ? 'group-hover/insert:flex' : 'group-hover/insert:flex'} items-center gap-1.5 ${endBtnDisabled ? 'text-gray-400' : 'text-primary-600'} text-xs font-medium">
                    <i data-lucide="${endBtnDisabled ? 'alert-circle' : 'plus-circle'}" class="w-4 h-4"></i>
                    <span>${endBtnDisabled ? '已达最大页数(20页)' : '在末尾添加新页'}</span>
                </div>
            </div>
        </div>`;
        
        container.innerHTML = html;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // 如果有高亮页面，滚动到该位置并设置3秒后移除高亮
        if (highlightIndex >= 0) {
            setTimeout(() => {
                const highlightElement = document.getElementById(`page-${highlightIndex}`);
                if (highlightElement) {
                    highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // 3秒后移除高亮
                    setTimeout(() => {
                        highlightElement.classList.remove('page-highlight');
                        highlightElement.classList.add('page-highlight-remove');
                        
                        // 再过0.5秒移除过渡类
                        setTimeout(() => {
                            highlightElement.classList.remove('page-highlight-remove');
                        }, 500);
                    }, 3000);
                }
            }, 100);
        }
    }
    
    updatePageCount() {
        if (this.storyData && this.storyData.outline && this.storyData.core_elements) {
            this.storyData.core_elements.page_count = this.storyData.outline.length;
        }
    }
    
    // 添加角色
    addCharacter() {
        if (!this.storyData.core_elements.characters) {
            this.storyData.core_elements.characters = [];
        }
        
        this.storyData.core_elements.characters.push({
            name: '新角色',
            description: '角色描述'
        });
        
        this.renderCharacters();
    }
    
    // 删除角色
    deleteCharacter(index) {
        if (this.storyData.core_elements.characters) {
            this.storyData.core_elements.characters.splice(index, 1);
            this.renderCharacters();
        }
    }
    
    // 添加场景
    addSetting() {
        if (!this.storyData.core_elements.settings) {
            this.storyData.core_elements.settings = [];
        }
        
        this.storyData.core_elements.settings.push({
            name: '新场景',
            description: '场景描述'
        });
        
        this.renderSettings();
    }
    
    // 处理插入禁用状态
    handleInsertDisabled() {
        if (typeof showToast === 'function') {
            showToast('最多只能添加20页！', 'error');
        }
    }
    
    // 在指定位置之前插入新页
    insertPageBefore(index) {
        const pageCount = this.storyData.outline.length;
        
        if (pageCount >= 20) {
            this.handleInsertDisabled();
            return;
        }
        
        const newPage = {
            page_number: index + 1,
            scene: '',
            plot_summary: '请输入情节内容...',
            characters: [],
            key_elements: []
        };
        
        this.storyData.outline.splice(index, 0, newPage);
        
        // 重新编号
        this.storyData.outline.forEach((page, idx) => {
            page.page_number = idx + 1;
        });
        
        // 渲染并高亮新插入的页面
        this.renderOutline(index);
        this.updatePageCount();
        
        if (typeof showToast === 'function') {
            showToast('已插入新页');
        }
    }
    
    // 在指定位置之后插入新页（末尾添加）
    insertPageAfter(index) {
        const pageCount = this.storyData.outline.length;
        
        if (pageCount >= 20) {
            this.handleInsertDisabled();
            return;
        }
        
        const newPage = {
            page_number: index + 2,
            scene: '',
            plot_summary: '请输入情节内容...',
            characters: [],
            key_elements: []
        };
        
        this.storyData.outline.splice(index + 1, 0, newPage);
        
        // 重新编号
        this.storyData.outline.forEach((page, idx) => {
            page.page_number = idx + 1;
        });
        
        // 渲染并高亮新插入的页面
        this.renderOutline(index + 1);
        this.updatePageCount();
        
        if (typeof showToast === 'function') {
            showToast('已添加新页');
        }
    }
    
    // 删除场景
    deleteSetting(index) {
        if (this.storyData.core_elements.settings) {
            this.storyData.core_elements.settings.splice(index, 1);
            this.renderSettings();
        }
    }
    
    // 删除页面
    deletePage(index) {
        if (this.storyData.outline) {
            this.storyData.outline.splice(index, 1);
            this.renderOutline();
            this.updatePageCount();
        }
    }
    
    // 编辑卡片字段
    editCardField(element, type, index, field) {
        element.contentEditable = 'true';
        element.focus();
        
        element.addEventListener('blur', () => {
            element.contentEditable = 'false';
            const value = element.textContent.trim();
            
            if (type === 'characters' && this.storyData.core_elements.characters[index]) {
                this.storyData.core_elements.characters[index][field] = value;
            } else if (type === 'settings' && this.storyData.core_elements.settings[index]) {
                this.storyData.core_elements.settings[index][field] = value;
            }
        }, { once: true });
    }
    
    // 编辑页面字段
    editPageField(element, index, field) {
        element.contentEditable = 'true';
        element.focus();
        
        element.addEventListener('blur', () => {
            element.contentEditable = 'false';
            const value = element.textContent.trim();
            
            if (this.storyData.outline[index]) {
                this.storyData.outline[index][field] = value;
            }
        }, { once: true });
    }
    
    getDefaultStoryData() {
        return {
            "core_elements": {
                "title": "新故事",
                "characters": [],
                "theme": "故事主题",
                "settings": [],
                "page_count": 0
            },
            "outline": []
        };
    }
}

// 全局实例
let outlineModal = null;

// 初始化函数
function initOutlineModal(options = {}) {
    outlineModal = new OutlineModal(options);
    return outlineModal;
}
