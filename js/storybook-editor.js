/**
 * 绘本编辑组件
 * 用于编辑已生成成功的绘本
 * 界面与生成绘本组件的"生成图片"步骤相同，但所有卡片都是已完成状态
 */
class StorybookEditor {
    constructor() {
        this.pages = []; // 页面数据
        this.onSaveCallback = null;
        this.onCloseCallback = null;
        this.selectedPageIndex = -1;
        
        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        // 移除已存在的
        const existing = document.getElementById('seModal');
        if (existing) existing.remove();
        
        const existingTextEdit = document.getElementById('seTextEditModal');
        if (existingTextEdit) existingTextEdit.remove();
        
        const existingImageEdit = document.getElementById('seImageEditModal');
        if (existingImageEdit) existingImageEdit.remove();

        // 创建主弹窗
        this.createMainModal();
        // 绑定事件
        this.bindEvents();
    }

    /**
     * 创建主弹窗HTML - 全屏白色背景
     */
    createMainModal() {
        const html = `
            <div id="seModal" class="se-modal">
                <!-- 头部 -->
                <div class="se-header">
                    <div class="se-header-left">
                        <!-- 左侧留空 -->
                    </div>
                    
                    <h2 class="se-title">编辑绘本</h2>
                    
                    <div class="se-header-right">
                        <button class="se-btn se-btn-secondary" id="seCloseBtn">
                            <i data-lucide="x" class="w-4 h-4"></i>
                            关闭
                        </button>
                    </div>
                </div>
                
                <!-- 内容区域 -->
                <div class="se-content" id="seContent">
                    <!-- 页面卡片网格 -->
                </div>
            </div>
            
            <!-- 文字编辑弹窗 -->
            <div id="seTextEditModal" class="se-edit-modal">
                <div class="se-edit-container">
                    <div class="se-edit-header">
                        <h3 class="se-edit-title" id="seTextEditTitle">修改文字</h3>
                        <button class="se-edit-close-btn" onclick="window.seInstance.closeTextEditModal()">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <div class="se-edit-content">
                        <textarea id="seTextEditArea" class="se-edit-textarea" rows="6" placeholder="请输入旁白内容..."></textarea>
                    </div>
                    <div class="se-edit-footer">
                        <button class="se-btn se-btn-secondary" onclick="window.seInstance.closeTextEditModal()">取消</button>
                        <button class="se-btn se-btn-primary" onclick="window.seInstance.saveTextEdit()">
                            <i data-lucide="check" class="w-4 h-4"></i>
                            保存
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 图片编辑弹窗（微调模式） -->
            <div id="seImageEditModal" class="se-image-edit-modal">
                <div id="seImageEditBackdrop" class="se-image-edit-backdrop"></div>
                <div class="se-image-edit-container">
                    <div class="se-image-edit-header">
                        <h3 class="se-image-edit-title" id="seImageEditTitle">修改图片</h3>
                        <button class="se-image-edit-close-btn" onclick="window.seInstance.closeImageEditModal()">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <div class="se-image-edit-content">
                        <!-- 图片对比区 -->
                        <div id="seImageComparisonSection" class="se-image-comparison hidden">
                            <div class="se-image-compare-grid">
                                <div class="se-image-compare-item">
                                    <div class="se-image-compare-label">
                                        <span class="se-label-dot"></span>
                                        原始图片
                                    </div>
                                    <div class="se-image-compare-preview">
                                        <img id="seOriginalImagePreview" src="" alt="原始图片">
                                    </div>
                                </div>
                                <div class="se-image-compare-item">
                                    <div class="se-image-compare-label new">
                                        <span class="se-label-dot new"></span>
                                        新生成图片
                                    </div>
                                    <div class="se-image-compare-preview new">
                                        <img id="seNewImagePreview" src="" alt="新生成图片">
                                        <div id="seImageGenerating" class="se-image-generating hidden">
                                            <div class="se-generating-spinner"></div>
                                            <span>AI正在生成图片...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 输入区 -->
                        <div id="seImagePromptSection" class="se-image-prompt-section">
                            <label class="se-image-prompt-label">请描述您希望如何修改这张图片</label>
                            <textarea id="seImagePromptInput" class="se-image-prompt-textarea" placeholder="例如：让背景更加明亮，角色表情更加开心"></textarea>
                            <div class="se-image-prompt-tip">
                                <i data-lucide="lightbulb" class="w-4 h-4"></i>
                                <span>提示：描述越详细，生成效果越好</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="se-image-edit-footer">
                        <button id="seRejectImageBtn" class="se-btn se-btn-secondary hidden" onclick="window.seInstance.rejectNewImage()">
                            重新生成
                        </button>
                        <button id="seGenerateImageBtn" class="se-btn se-btn-gradient" onclick="window.seInstance.generateNewImage()">
                            <i data-lucide="wand-2" class="w-4 h-4"></i>
                            开始生成
                        </button>
                        <button id="seAcceptImageBtn" class="se-btn se-btn-success hidden" onclick="window.seInstance.acceptNewImage()">
                            <i data-lucide="check" class="w-4 h-4"></i>
                            采用新图
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 关闭按钮
        document.getElementById('seCloseBtn').addEventListener('click', () => this.close());
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', this.closeAllMenus.bind(this));
    }

    /**
     * 显示弹窗
     */
    show(pages = []) {
        // 保存实例到全局，供菜单调用
        window.seInstance = this;
        
        this.pages = pages;
        
        const modal = document.getElementById('seModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        this.renderContent();
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 关闭弹窗
     */
    close() {
        const modal = document.getElementById('seModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        if (this.onCloseCallback) {
            this.onCloseCallback(this.pages);
        }
    }

    /**
     * 渲染内容区域
     */
    renderContent() {
        const container = document.getElementById('seContent');
        container.innerHTML = this.renderPagesGridHTML();
        this.bindCardEvents(container);
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 渲染页面卡片网格HTML
     */
    renderPagesGridHTML() {
        let html = '<div class="se-pages-wrapper">';
        html += '<div class="se-pages-grid">';
        
        this.pages.forEach((page, index) => {
            html += this.renderPageCard(page, index);
        });
        
        html += '</div></div>';
        return html;
    }

    /**
     * 渲染单个页面卡片
     */
    renderPageCard(page, index) {
        const isCover = index === 0;
        const pageLabel = isCover ? '封面' : `第${index}页`;
        
        return `
            <div class="se-page-card" data-index="${index}">
                <div class="se-card-image">
                    <img src="${page.imageUrl}" alt="${pageLabel}">
                    <div class="se-card-menu">
                        <button class="se-menu-btn" data-index="${index}" onclick="event.stopPropagation(); window.seInstance.toggleCardMenu(${index})">
                            <i data-lucide="more-horizontal" class="w-4 h-4"></i>
                        </button>
                        <div class="se-menu-dropdown hidden" id="seMenu_${index}">
                            <button class="se-menu-item" onclick="event.stopPropagation(); window.seInstance.editText(${index})">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                                修改文字
                            </button>
                            <button class="se-menu-item" onclick="event.stopPropagation(); window.seInstance.editImage(${index})">
                                <i data-lucide="image" class="w-4 h-4"></i>
                                修改图片
                            </button>
                        </div>
                    </div>
                </div>
                <div class="se-card-info">
                    <div class="se-card-page-num">${pageLabel}</div>
                    <div class="se-card-narration">${page.narration || '暂无旁白'}</div>
                </div>
            </div>
        `;
    }

    /**
     * 绑定卡片事件
     */
    bindCardEvents(container) {
        // 事件已通过 onclick 绑定
    }

    /**
     * 切换卡片菜单
     */
    toggleCardMenu(index) {
        const menu = document.getElementById(`seMenu_${index}`);
        if (!menu) return;
        
        const isHidden = menu.classList.contains('hidden');
        
        // 关闭所有菜单
        this.closeAllMenus();
        
        // 切换当前菜单
        if (isHidden) {
            menu.classList.remove('hidden');
        }
    }

    /**
     * 关闭所有菜单
     */
    closeAllMenus() {
        document.querySelectorAll('.se-menu-dropdown').forEach(menu => {
            menu.classList.add('hidden');
        });
    }

    /**
     * 编辑文字
     */
    editText(index) {
        this.selectedPageIndex = index;
        const page = this.pages[index];
        const isCover = index === 0;
        const pageLabel = isCover ? '封面' : `第${index}页`;
        
        document.getElementById('seTextEditTitle').textContent = `修改文字 - ${pageLabel}`;
        document.getElementById('seTextEditArea').value = page.narration || '';
        
        const modal = document.getElementById('seTextEditModal');
        modal.classList.add('active');
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 关闭文字编辑弹窗
     */
    closeTextEditModal() {
        const modal = document.getElementById('seTextEditModal');
        modal.classList.remove('active');
        this.selectedPageIndex = -1;
    }

    /**
     * 保存文字编辑
     */
    saveTextEdit() {
        if (this.selectedPageIndex >= 0) {
            const newText = document.getElementById('seTextEditArea').value.trim();
            
            if (!newText) {
                if (window.showToast) {
                    showToast('旁白内容不能为空', 'error');
                }
                // 抖动动画
                const textarea = document.getElementById('seTextEditArea');
                textarea.classList.add('shake-animation');
                setTimeout(() => textarea.classList.remove('shake-animation'), 500);
                return;
            }
            
            this.pages[this.selectedPageIndex].narration = newText;
            this.renderContent();
            this.closeTextEditModal();
            
            if (window.showToast) {
                showToast('文字已保存', 'success');
            }
        }
    }

    /**
     * 编辑图片
     */
    editImage(index) {
        this.selectedPageIndex = index;
        const page = this.pages[index];
        const isCover = index === 0;
        const pageLabel = isCover ? '封面' : `第${index}页`;
        
        document.getElementById('seImageEditTitle').textContent = `修改图片 - ${pageLabel}`;
        document.getElementById('seOriginalImagePreview').src = page.imageUrl;
        document.getElementById('seImagePromptInput').value = '';
        
        // 重置状态
        document.getElementById('seImageComparisonSection').classList.add('hidden');
        document.getElementById('seImagePromptSection').classList.remove('hidden');
        document.getElementById('seGenerateImageBtn').classList.remove('hidden');
        document.getElementById('seRejectImageBtn').classList.add('hidden');
        document.getElementById('seAcceptImageBtn').classList.add('hidden');
        
        // 设置背景
        const backdrop = document.getElementById('seImageEditBackdrop');
        backdrop.style.backgroundImage = `url(${page.imageUrl})`;
        
        const modal = document.getElementById('seImageEditModal');
        modal.classList.add('active');
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 关闭图片编辑弹窗
     */
    closeImageEditModal() {
        const modal = document.getElementById('seImageEditModal');
        modal.classList.remove('active');
        this.selectedPageIndex = -1;
    }

    /**
     * 生成新图片
     */
    async generateNewImage() {
        const prompt = document.getElementById('seImagePromptInput').value.trim();
        
        if (!prompt) {
            if (window.showToast) {
                showToast('请输入修改描述', 'error');
            }
            // 抖动动画
            const textarea = document.getElementById('seImagePromptInput');
            textarea.classList.add('shake-animation');
            setTimeout(() => textarea.classList.remove('shake-animation'), 500);
            return;
        }
        
        // 显示对比区域
        document.getElementById('seImageComparisonSection').classList.remove('hidden');
        document.getElementById('seImagePromptSection').classList.add('hidden');
        document.getElementById('seGenerateImageBtn').classList.add('hidden');
        
        // 显示生成中状态
        document.getElementById('seImageGenerating').classList.remove('hidden');
        
        // 模拟生成（2秒）
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 生成完成，显示新图片
        const newImageUrl = this.pages[this.selectedPageIndex].imageUrl; // 实际应该是新生成的图片
        document.getElementById('seNewImagePreview').src = newImageUrl;
        document.getElementById('seImageGenerating').classList.add('hidden');
        
        // 显示操作按钮
        document.getElementById('seRejectImageBtn').classList.remove('hidden');
        document.getElementById('seAcceptImageBtn').classList.remove('hidden');
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 拒绝新图片，重新生成
     */
    rejectNewImage() {
        // 隐藏对比区域，显示输入区域
        document.getElementById('seImageComparisonSection').classList.add('hidden');
        document.getElementById('seImagePromptSection').classList.remove('hidden');
        document.getElementById('seGenerateImageBtn').classList.remove('hidden');
        document.getElementById('seRejectImageBtn').classList.add('hidden');
        document.getElementById('seAcceptImageBtn').classList.add('hidden');
    }

    /**
     * 采用新图片
     */
    acceptNewImage() {
        if (this.selectedPageIndex >= 0) {
            const newImageUrl = document.getElementById('seNewImagePreview').src;
            this.pages[this.selectedPageIndex].imageUrl = newImageUrl;
            this.renderContent();
            this.closeImageEditModal();
            
            if (window.showToast) {
                showToast('图片已更新', 'success');
            }
        }
    }

    /**
     * 设置保存回调
     */
    onSave(callback) {
        this.onSaveCallback = callback;
        return this;
    }

    /**
     * 设置关闭回调
     */
    onClose(callback) {
        this.onCloseCallback = callback;
        return this;
    }
}
