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
        this.selectedStyle = 'children_illustration'; // 默认风格
        
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
                    <button onclick="outlineModal.close()" class="cancel-btn flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                        <i data-lucide="x" class="w-5 h-5"></i>
                        <span class="font-medium">取消</span>
                    </button>
                    
                    <h2 class="text-2xl font-bold text-gray-800">确认故事大纲</h2>
                    
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
                        <!-- 故事标题 -->
                        <div class="mb-5">
                            <div class="flex items-center gap-2 mb-2.5">
                                <i data-lucide="file-text" class="w-4 h-4 text-purple-500"></i>
                                <h3 class="text-sm font-semibold text-gray-700">故事标题</h3>
                            </div>
                            <input 
                                type="text" 
                                id="modalStoryTitle" 
                                class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                placeholder="请输入标题..."
                                onchange="outlineModal.updateStoryTitle(this.value)"
                            />
                        </div>

                        <!-- 绘本风格 -->
                        <div class="mb-5">
                            <div class="flex items-center gap-2 mb-2.5">
                                <i data-lucide="palette" class="w-4 h-4 text-pink-500"></i>
                                <h3 class="text-sm font-semibold text-gray-700">绘本风格</h3>
                            </div>
                            <button onclick="outlineModal.openStyleSelector()" 
                                    class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-primary-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all flex items-center justify-between">
                                <span id="selectedStyleText">儿童插画风</span>
                                <i data-lucide="chevron-down" class="w-4 h-4 text-gray-400"></i>
                            </button>
                        </div>

                        <!-- 主要角色区 -->
                        <div class="mb-5">
                            <div class="flex justify-between items-center mb-2.5">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="users" class="w-4 h-4 text-primary-500"></i>
                                    <h3 class="text-sm font-semibold text-gray-700">主要角色</h3>
                                </div>
                                <button onclick="outlineModal.addCharacter()" 
                                        class="add-button-light flex items-center gap-1.5">
                                    <i data-lucide="plus"></i>
                                    <span>添加角色</span>
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
                                        class="add-button-light flex items-center gap-1.5">
                                    <i data-lucide="plus"></i>
                                    <span>添加场景</span>
                                </button>
                            </div>
                            <div id="modalSettingsList"></div>
                        </div>
                    </aside>

                    <!-- 右侧内容区 -->
                    <main class="flex-1 overflow-y-auto px-8 py-6" style="scrollbar-width: thin;">
                        <!-- 故事大纲标题 -->
                        <div class="max-w-4xl mx-auto mb-4">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="book-open" class="w-4 h-4 text-orange-500"></i>
                                    <h2 class="text-sm font-semibold text-gray-700">故事大纲</h2>
                                </div>
                                <div id="outlinePageCount" class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-full">
                                    <span class="text-xs font-medium text-orange-700">共 <span id="pageCountNumber">0</span> 页</span>
                                </div>
                            </div>
                        </div>
                        <div id="modalOutlineList" class="max-w-4xl mx-auto"></div>
                    </main>
                </div>
            </div>

            <!-- 绘本风格选择模态窗口 -->
            <div id="styleSelector" class="fixed inset-0 bg-black bg-opacity-50 z-[70] hidden flex items-center justify-center p-2">
                <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-none overflow-visible">
                    <!-- 标题栏 -->
                    <div class="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-4 text-white">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i data-lucide="palette" class="w-6 h-6"></i>
                                <h2 class="text-xl font-bold">选择绘本风格</h2>
                            </div>
                            <button onclick="outlineModal.closeStyleSelector()" 
                                    class="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all">
                                <i data-lucide="x" class="w-5 h-5"></i>
                            </button>
                        </div>
                        <p class="text-pink-100 text-sm mt-2">选择您喜欢的绘本风格，不同风格会呈现不同的视觉效果</p>
                    </div>
                    
                    <!-- 风格选项网格 -->
                    <div class="p-4">
                        <div class="grid grid-cols-2 gap-4">
                            <!-- 儿童插画风 -->
                            <div onclick="outlineModal.selectStyle('children_illustration', '儿童插画风')" 
                                 class="style-option group cursor-pointer bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-pink-400 hover:shadow-lg transition-all duration-300" 
                                 data-style="children_illustration">
                                <div class="aspect-[3/2] overflow-hidden">
                                    <img src="images/儿童插画风.jpg" alt="儿童插画风" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                                </div>
                                <div class="p-2">
                                    <div class="flex items-center justify-between">
                                        <h3 class="text-base font-bold text-gray-800">儿童插画风</h3>
                                        <div class="style-check hidden w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                                            <i data-lucide="check" class="w-4 h-4 text-white"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 水彩手绘风 -->
                            <div onclick="outlineModal.selectStyle('watercolor', '水彩手绘风')" 
                                 class="style-option group cursor-pointer bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all duration-300" 
                                 data-style="watercolor">
                                <div class="aspect-[3/2] overflow-hidden">
                                    <img src="images/水彩手绘风.jpg" alt="水彩手绘风" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                                </div>
                                <div class="p-2">
                                    <div class="flex items-center justify-between">
                                        <h3 class="text-base font-bold text-gray-800">水彩手绘风</h3>
                                        <div class="style-check hidden w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                            <i data-lucide="check" class="w-4 h-4 text-white"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 日式卡通风 -->
                            <div onclick="outlineModal.selectStyle('japanese_cartoon', '日式卡通风')" 
                                 class="style-option group cursor-pointer bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-purple-400 hover:shadow-lg transition-all duration-300" 
                                 data-style="japanese_cartoon">
                                <div class="aspect-[3/2] overflow-hidden">
                                    <img src="images/日式卡通风.jpg" alt="日式卡通风" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                                </div>
                                <div class="p-2">
                                    <div class="flex items-center justify-between">
                                        <h3 class="text-base font-bold text-gray-800">日式卡通风</h3>
                                        <div class="style-check hidden w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                            <i data-lucide="check" class="w-4 h-4 text-white"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 剪纸艺术风 -->
                            <div onclick="outlineModal.selectStyle('paper_cut', '剪纸艺术风')" 
                                 class="style-option group cursor-pointer bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-orange-400 hover:shadow-lg transition-all duration-300" 
                                 data-style="paper_cut">
                                <div class="aspect-[3/2] overflow-hidden">
                                    <img src="images/剪纸艺术风.jpg" alt="剪纸艺术风" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                                </div>
                                <div class="p-2">
                                    <div class="flex items-center justify-between">
                                        <h3 class="text-base font-bold text-gray-800">剪纸艺术风</h3>
                                        <div class="style-check hidden w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                                            <i data-lucide="check" class="w-4 h-4 text-white"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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
        // 标题编辑功能已移除（现在标题只在顶部显示，不可编辑）
    }
    
    open(storyData, mode = 'create') {
        this.storyData = storyData || this.getDefaultStoryData();
        this.mode = mode; // 保存模式：'create' 新建模式，'edit' 编辑模式
        this.isOpen = true;
        
        const modal = document.getElementById(this.options.containerId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            this.renderContent();
            
            // 根据模式更新左上角按钮文字
            this.updateCancelButtonText();
            
            // 重新创建图标
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
    
    // 根据模式更新左上角按钮文字
    updateCancelButtonText() {
        const cancelButtonSpan = document.querySelector('#outlineModal .cancel-btn span');
        if (cancelButtonSpan) {
            const buttonText = this.mode === 'edit' ? '关闭' : '取消';
            cancelButtonSpan.textContent = buttonText;
        }
    }
    
    async close() {
        // 编辑模式直接关闭，新建模式需要二次确认
        if (this.mode === 'create' && typeof showConfirm === 'function') {
            const confirmed = await showConfirm(
                '确定要取消吗？未保存的修改将会丢失。',
                '取消确认'
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
        this.renderStyle();
        this.renderCharacters();
        this.renderSettings();
        this.renderOutline();
        this.updatePageCount();
    }
    
    renderTitle() {
        const titleElement = document.getElementById('modalStoryTitle');
        
        if (this.storyData.core_elements && titleElement) {
            const title = this.storyData.core_elements.title || '';
            titleElement.value = title;
        }
    }
    
    updateStoryTitle(newTitle) {
        if (!this.storyData.core_elements) return;
        
        this.storyData.core_elements.title = newTitle.trim();
        this.markAsModified();
    }
    
    renderStyle() {
        const selectedStyleText = document.getElementById('selectedStyleText');
        if (!selectedStyleText || !this.storyData.core_elements) return;
        
        // 获取当前风格
        const currentStyle = this.storyData.core_elements.style || 'children_illustration';
        this.selectedStyle = currentStyle;
        
        // 更新显示文本
        const styleTexts = {
            'children_illustration': '儿童插画风',
            'watercolor': '水彩手绘风',
            'japanese_cartoon': '日式卡通风',
            'paper_cut': '剪纸艺术风'
        };
        
        selectedStyleText.textContent = styleTexts[currentStyle] || '儿童插画风';
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
            <div class="group relative bg-white border border-gray-200 rounded-xl p-3 mb-2.5 hover:border-primary-300 hover:shadow-sm transition-all" data-character-index="${index}">
                <button onclick="outlineModal.deleteCharacter(${index})" 
                        class="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
                <div onclick="outlineModal.editCardField(this, 'characters', ${index}, 'name', '请输入角色名')" 
                     class="text-sm font-semibold mb-1.5 px-1.5 py-1 rounded border border-transparent hover:bg-gray-50 cursor-pointer ${char.name ? 'text-gray-800' : 'text-gray-400'}" 
                     data-placeholder="请输入角色名">${char.name || '<span class="placeholder-text">请输入角色名</span>'}</div>
                <div onclick="outlineModal.editCardField(this, 'characters', ${index}, 'description', '请输入角色描述')" 
                     class="character-description text-xs leading-relaxed px-1.5 py-1 rounded border border-transparent hover:bg-gray-50 cursor-pointer min-h-[36px] ${char.description ? 'text-gray-600' : 'text-gray-400'}" 
                     data-placeholder="请输入角色描述">${char.description || '<span class="placeholder-text">请输入角色描述</span>'}</div>
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
            <div class="group relative bg-white border border-gray-200 rounded-xl p-3 mb-2.5 hover:border-emerald-300 hover:shadow-sm transition-all" data-setting-index="${index}">
                <button onclick="outlineModal.deleteSetting(${index})" 
                        class="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
                <div onclick="outlineModal.editCardField(this, 'settings', ${index}, 'name', '请输入场景名')" 
                     class="text-sm font-semibold mb-1.5 px-1.5 py-1 rounded border border-transparent hover:bg-gray-50 cursor-pointer ${setting.name ? 'text-gray-800' : 'text-gray-400'}" 
                     data-placeholder="请输入场景名">${setting.name || '<span class="placeholder-text">请输入场景名</span>'}</div>
                <div onclick="outlineModal.editCardField(this, 'settings', ${index}, 'description', '请输入场景描述')" 
                     class="setting-description text-xs leading-relaxed px-1.5 py-1 rounded border border-transparent hover:bg-gray-50 cursor-pointer min-h-[36px] ${setting.description ? 'text-gray-600' : 'text-gray-400'}" 
                     data-placeholder="请输入场景描述">${setting.description || '<span class="placeholder-text">请输入场景描述</span>'}</div>
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
                    <div class="flex-1">
                        <select onchange="outlineModal.updatePageScene(${index}, this.value)" 
                                class="text-sm font-semibold px-2 py-1 rounded border border-gray-200 hover:border-primary-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 cursor-pointer bg-white outline-none transition-all ${page.scene ? 'text-primary-600' : 'text-gray-400'}">
                            <option value="" disabled ${!page.scene ? 'selected' : ''} hidden>选择场景...</option>
                            ${this.getSettingsOptions(page.scene)}
                        </select>
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
            const pageCount = this.storyData.outline.length;
            const oldPageCount = this.storyData.core_elements.page_count || 0;
            this.storyData.core_elements.page_count = pageCount;
            
            // 更新页数显示
            const pageCountElement = document.getElementById('pageCountNumber');
            if (pageCountElement) {
                const hasChanged = oldPageCount !== pageCount;
                pageCountElement.textContent = pageCount;
                
                // 如果页数发生变化，添加动画效果
                if (hasChanged && oldPageCount > 0) {
                    pageCountElement.classList.remove('page-count-updated');
                    // 强制重排以重新触发动画
                    pageCountElement.offsetHeight;
                    pageCountElement.classList.add('page-count-updated');
                    
                    // 动画结束后移除类
                    setTimeout(() => {
                        pageCountElement.classList.remove('page-count-updated');
                    }, 400);
                }
            }
        }
    }
    
    // 获取场景选项HTML
    getSettingsOptions(selectedScene) {
        if (!this.storyData.core_elements.settings) {
            return '';
        }
        
        return this.storyData.core_elements.settings.map(setting => {
            const isSelected = setting.name === selectedScene ? 'selected' : '';
            return `<option value="${setting.name}" ${isSelected}>${setting.name}</option>`;
        }).join('');
    }
    
    // 更新页面场景
    updatePageScene(index, sceneName) {
        if (this.storyData.outline[index]) {
            this.storyData.outline[index].scene = sceneName;
            // 重新渲染大纲以更新样式
            this.renderOutline();
        }
    }
    
    // 添加角色
    addCharacter() {
        if (!this.storyData.core_elements.characters) {
            this.storyData.core_elements.characters = [];
        }
        
        this.storyData.core_elements.characters.push({
            name: '',
            description: ''
        });
        
        this.renderCharacters();
        
        // 滚动到新添加的角色并高亮
        this.highlightNewCard('character', this.storyData.core_elements.characters.length - 1);
    }
    
    // 删除角色
    deleteCharacter(index) {
        if (this.storyData.core_elements.characters) {
            // 检查是否只剩一个角色
            if (this.storyData.core_elements.characters.length <= 1) {
                if (typeof showToast === 'function') {
                    showToast('至少需要保留一个主要角色！', 'error');
                }
                return;
            }
            
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
            name: '',
            description: ''
        });
        
        this.renderSettings();
        
        // 滚动到新添加的场景并高亮
        this.highlightNewCard('setting', this.storyData.core_elements.settings.length - 1);
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
            // 检查是否只剩一个场景
            if (this.storyData.core_elements.settings.length <= 1) {
                if (typeof showToast === 'function') {
                    showToast('至少需要保留一个主要场景！', 'error');
                }
                return;
            }
            
            // 获取被删除的场景名称
            const deletedSceneName = this.storyData.core_elements.settings[index].name;
            
            // 删除场景
            this.storyData.core_elements.settings.splice(index, 1);
            
            // 清空所有使用该场景的页面的场景关联
            if (this.storyData.outline) {
                this.storyData.outline.forEach(page => {
                    if (page.scene === deletedSceneName) {
                        page.scene = '';
                    }
                });
            }
            
            // 重新渲染场景列表和大纲
            this.renderSettings();
            this.renderOutline();
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
    editCardField(element, type, index, field, placeholder = '') {
        // 如果当前显示的是占位符，清空内容
        const currentValue = element.textContent.trim();
        const hasPlaceholder = element.querySelector('.placeholder-text');
        
        if (hasPlaceholder || currentValue === placeholder) {
            element.textContent = '';
        }
        
        // 移除灰色样式，改为编辑时的黑色样式
        element.classList.remove('text-gray-400', 'text-gray-600');
        if (field === 'name') {
            element.classList.add('text-gray-800');
        } else {
            element.classList.add('text-gray-600');
        }
        
        element.contentEditable = 'true';
        element.focus();
        
        element.addEventListener('blur', () => {
            element.contentEditable = 'false';
            const value = element.textContent.trim();
            
            if (type === 'characters' && this.storyData.core_elements.characters[index]) {
                this.storyData.core_elements.characters[index][field] = value;
                this.renderCharacters();
            } else if (type === 'settings' && this.storyData.core_elements.settings[index]) {
                this.storyData.core_elements.settings[index][field] = value;
                this.renderSettings();
            }
        }, { once: true });
        
        // 按下ESC键取消编辑
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                element.blur();
            }
        };
        element.addEventListener('keydown', handleKeydown, { once: true });
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
    
    // 高亮新添加的卡片并滚动到视野中
    highlightNewCard(type, index) {
        // 使用 requestAnimationFrame 确保 DOM 已经更新
        requestAnimationFrame(() => {
            const selector = type === 'character' 
                ? `[data-character-index="${index}"]` 
                : `[data-setting-index="${index}"]`;
            const card = document.querySelector(selector);
            
            if (card) {
                // 滚动到卡片位置（居中显示）
                card.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // 添加高亮动画
                card.classList.add('highlight-new');
                
                // 2秒后移除高亮
                setTimeout(() => {
                    card.classList.remove('highlight-new');
                }, 2000);
            }
        });
    }
    
    // 打开风格选择器
    openStyleSelector() {
        const styleSelector = document.getElementById('styleSelector');
        if (styleSelector) {
            styleSelector.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // 更新当前选中状态
            this.updateStyleSelection();
            
            // 重新创建图标
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
    
    // 关闭风格选择器
    closeStyleSelector() {
        const styleSelector = document.getElementById('styleSelector');
        if (styleSelector) {
            styleSelector.classList.add('hidden');
            document.body.style.overflow = 'hidden'; // 保持主模态窗口的overflow设置
        }
    }
    
    // 选择风格
    selectStyle(styleValue, styleText) {
        this.selectedStyle = styleValue;
        
        // 更新显示文本
        const selectedStyleText = document.getElementById('selectedStyleText');
        if (selectedStyleText) {
            selectedStyleText.textContent = styleText;
        }
        
        // 更新故事数据
        if (!this.storyData.core_elements) {
            this.storyData.core_elements = {};
        }
        this.storyData.core_elements.style = styleValue;
        
        // 关闭选择器
        this.closeStyleSelector();
        
        // 显示选择成功提示
        if (typeof showToast === 'function') {
            showToast(`已选择 ${styleText}`);
        }
    }
    
    // 更新风格选择状态
    updateStyleSelection() {
        // 清除所有选中状态
        document.querySelectorAll('.style-option').forEach(option => {
            option.classList.remove('border-pink-400', 'border-blue-400', 'border-purple-400', 'border-orange-400');
            option.classList.add('border-gray-200');
            option.querySelector('.style-check').classList.add('hidden');
        });
        
        // 设置当前选中项
        const selectedOption = document.querySelector(`[data-style="${this.selectedStyle}"]`);
        if (selectedOption) {
            selectedOption.classList.remove('border-gray-200');
            const styleCheck = selectedOption.querySelector('.style-check');
            if (styleCheck) {
                styleCheck.classList.remove('hidden');
            }
            
            // 根据不同风格设置不同的边框颜色
            switch(this.selectedStyle) {
                case 'children_illustration':
                    selectedOption.classList.add('border-pink-400');
                    break;
                case 'watercolor':
                    selectedOption.classList.add('border-blue-400');
                    break;
                case 'japanese_cartoon':
                    selectedOption.classList.add('border-purple-400');
                    break;
                case 'paper_cut':
                    selectedOption.classList.add('border-orange-400');
                    break;
            }
        }
    }

    getDefaultStoryData() {
        return {
            "core_elements": {
                "title": "新故事",
                "characters": [],
                "theme": "故事主题",
                "settings": [],
                "page_count": 0,
                "style": "children_illustration"
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
