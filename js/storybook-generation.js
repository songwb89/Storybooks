/**
 * 绘本生成进度组件
 * 全屏弹窗，显示生成进度时间线和页面卡片
 * 风格与 outline-modal 和 storybook-reader 保持一致
 */
class StorybookGeneration {
    constructor() {
        this.currentStep = 0; // 0: 未开始, 1: 分析大纲, 2: 生成脚本, 3: 生成图片, 4: 完成
        this.isGenerating = false;
        this.pages = []; // 页面数据
        this.onCompleteCallback = null;
        this.onCancelCallback = null;
        this.selectedPageIndex = -1;
        
        // 步骤配置
        this.steps = [
            { id: 1, label: '分析大纲', icon: 'file-text' },
            { id: 2, label: '生成脚本', icon: 'pen-tool' },
            { id: 3, label: '生成图片', icon: 'image' },
            { id: 4, label: '完成', icon: 'check' }
        ];
        
        // 提示语配置
        this.hints = {
            1: {
                title: '正在分析故事大纲',
                desc: 'AI正在理解您的故事结构和角色关系...',
                icon: 'sparkles',
                spinning: true
            },
            2: {
                title: '正在生成故事脚本',
                desc: 'AI正在为每一页编写精彩的旁白内容...',
                icon: 'pen-tool',
                spinning: true
            }
        };
        
        // 脚本生成阶段配置
        this.scriptPhases = {
            'character_models': {
                title: '正在生成角色模型',
                desc: 'AI正在构建故事中的角色形象...',
                icon: 'users'
            },
            'scene_models': {
                title: '正在构建场景描述',
                desc: 'AI正在设计故事发生的场景环境...',
                icon: 'map-pin'
            },
            'cover': {
                title: '正在设计封面',
                desc: 'AI正在为您的绘本设计精美封面...',
                icon: 'image'
            },
            'pages': {
                title: '正在编写故事页面',
                desc: 'AI正在生成第 {page} 页的内容...',
                icon: 'file-text'
            }
        };
        
        // 当前脚本生成阶段
        this.scriptProgress = {
            phase: 'default',
            currentPage: 0,
            totalPages: 0
        };
        
        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        // 移除已存在的
        const existing = document.getElementById('sgModal');
        if (existing) existing.remove();
        
        const existingDetail = document.getElementById('sgDetailModal');
        if (existingDetail) existingDetail.remove();
        
        const existingTextEdit = document.getElementById('sgTextEditModal');
        if (existingTextEdit) existingTextEdit.remove();
        
        const existingImageEdit = document.getElementById('sgImageEditModal');
        if (existingImageEdit) existingImageEdit.remove();
        
        const existingPromptEdit = document.getElementById('sgPromptEditModal');
        if (existingPromptEdit) existingPromptEdit.remove();

        // 创建主弹窗
        this.createMainModal();
        // 创建详情弹窗
        this.createDetailModal();
        // 绑定事件
        this.bindEvents();
    }

    /**
     * 创建主弹窗HTML - 全屏白色背景
     */
    createMainModal() {
        const html = `
            <div id="sgModal" class="sg-modal">
                <!-- 头部 -->
                <div class="sg-header">
                    <div class="sg-header-left">
                        <button class="sg-close-btn" id="sgCloseBtn">
                            <i data-lucide="x" class="w-5 h-5"></i>
                            <span>关闭</span>
                        </button>
                    </div>
                    
                    <h2 class="sg-title">生成绘本</h2>
                    
                    <div class="sg-header-right" id="sgHeaderRight">
                        <!-- 动态按钮 -->
                    </div>
                </div>
                
                <!-- 内容区域（包含进度时间线） -->
                <div class="sg-content" id="sgContent">
                    <!-- 动态内容 -->
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * 创建详情弹窗HTML
     */
    createDetailModal() {
        const html = `
            <div id="sgDetailModal" class="sg-detail-modal">
                <div class="sg-detail-container">
                    <div class="sg-detail-header">
                        <h3 class="sg-detail-title" id="sgDetailTitle">第1页</h3>
                        <button class="sg-detail-close-btn" id="sgDetailCloseBtn">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <div class="sg-detail-content">
                        <div class="sg-detail-image" id="sgDetailImage">
                            <!-- 图片或状态 -->
                        </div>
                        
                        <div class="sg-detail-label">旁白内容</div>
                        <textarea class="sg-detail-textarea" id="sgDetailNarration" rows="3"></textarea>
                        
                        <div class="sg-detail-label">生图提示词</div>
                        <textarea class="sg-detail-textarea" id="sgDetailPrompt" rows="3"></textarea>
                    </div>
                    <div class="sg-detail-footer">
                        <button class="sg-btn sg-btn-secondary" id="sgDetailCancelBtn">关闭</button>
                        <button class="sg-btn sg-btn-primary" id="sgDetailRegenerateBtn">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                            重新生成
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 文字编辑弹窗 -->
            <div id="sgTextEditModal" class="sg-edit-modal">
                <div class="sg-edit-container">
                    <div class="sg-edit-header">
                        <h3 class="sg-edit-title" id="sgTextEditTitle">编辑文字</h3>
                        <button class="sg-edit-close-btn" onclick="window.sgInstance.closeTextEditModal()">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <div class="sg-edit-content">
                        <textarea id="sgTextEditArea" class="sg-edit-textarea" rows="6" placeholder="请输入旁白内容..."></textarea>
                    </div>
                    <div class="sg-edit-footer">
                        <button class="sg-btn sg-btn-secondary" onclick="window.sgInstance.closeTextEditModal()">取消</button>
                        <button class="sg-btn sg-btn-primary" onclick="window.sgInstance.saveTextEdit()">
                            <i data-lucide="check" class="w-4 h-4"></i>
                            保存
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 图片编辑弹窗（微调模式） -->
            <div id="sgImageEditModal" class="sg-image-edit-modal">
                <div id="sgImageEditBackdrop" class="sg-image-edit-backdrop"></div>
                <div class="sg-image-edit-container">
                    <div class="sg-image-edit-header">
                        <h3 class="sg-image-edit-title" id="sgImageEditTitle">微调图片</h3>
                        <button class="sg-image-edit-close-btn" onclick="window.sgInstance.closeImageEditModal()">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <div class="sg-image-edit-content">
                        <!-- 图片对比区 -->
                        <div id="sgImageComparisonSection" class="sg-image-comparison hidden">
                            <div class="sg-image-compare-grid">
                                <div class="sg-image-compare-item">
                                    <div class="sg-image-compare-label">
                                        <span class="sg-label-dot"></span>
                                        原始图片
                                    </div>
                                    <div class="sg-image-compare-preview">
                                        <img id="sgOriginalImagePreview" src="" alt="原始图片">
                                    </div>
                                </div>
                                <div class="sg-image-compare-item">
                                    <div class="sg-image-compare-label new">
                                        <span class="sg-label-dot new"></span>
                                        新生成图片
                                    </div>
                                    <div class="sg-image-compare-preview new">
                                        <img id="sgNewImagePreview" src="" alt="新生成图片">
                                        <div id="sgImageGenerating" class="sg-image-generating hidden">
                                            <div class="sg-generating-spinner"></div>
                                            <span>AI正在生成图片...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 输入区 -->
                        <div id="sgImagePromptSection" class="sg-image-prompt-section">
                            <label class="sg-image-prompt-label">请描述您希望如何修改这张图片</label>
                            <textarea id="sgImagePromptInput" class="sg-image-prompt-textarea" placeholder="例如：让背景更加明亮，角色表情更加开心"></textarea>
                            <div class="sg-image-prompt-tip">
                                <i data-lucide="lightbulb" class="w-4 h-4"></i>
                                <span>提示：描述越详细，生成效果越好</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sg-image-edit-footer">
                        <button id="sgRejectImageBtn" class="sg-btn sg-btn-secondary hidden" onclick="window.sgInstance.rejectNewImage()">
                            重新生成
                        </button>
                        <button id="sgGenerateImageBtn" class="sg-btn sg-btn-gradient" onclick="window.sgInstance.generateNewImage()">
                            <i data-lucide="wand-2" class="w-4 h-4"></i>
                            开始生成
                        </button>
                        <button id="sgAcceptImageBtn" class="sg-btn sg-btn-success hidden" onclick="window.sgInstance.acceptNewImage()">
                            <i data-lucide="check" class="w-4 h-4"></i>
                            采用新图
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 修改提示词弹窗（敏感词失败时使用） -->
            <div id="sgPromptEditModal" class="sg-edit-modal">
                <div class="sg-edit-container sg-prompt-edit-container-large">
                    <div class="sg-edit-header">
                        <h3 class="sg-edit-title" id="sgPromptEditTitle">修改提示词</h3>
                        <button class="sg-edit-close-btn" onclick="window.sgInstance.closePromptEditModal()">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <div class="sg-edit-content sg-prompt-edit-content">
                        <!-- 敏感词警告 -->
                        <div id="sgPromptEditWarning" class="sg-sensitive-warning">
                            <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                            <span>内容包含敏感词，请修改后重新生成</span>
                        </div>
                        
                        <!-- 角色描述 -->
                        <div class="sg-prompt-section">
                            <div class="sg-prompt-section-header">
                                <span class="sg-prompt-section-title">角色描述</span>
                            </div>
                            <textarea id="sgPromptCharacters" class="sg-prompt-section-textarea" rows="4" placeholder="角色描述..."></textarea>
                        </div>
                        
                        <!-- 场景描述 -->
                        <div class="sg-prompt-section">
                            <div class="sg-prompt-section-header">
                                <span class="sg-prompt-section-title">场景描述</span>
                            </div>
                            <textarea id="sgPromptScene" class="sg-prompt-section-textarea" rows="3" placeholder="场景描述..."></textarea>
                        </div>
                        
                        <!-- 画面描述 -->
                        <div class="sg-prompt-section">
                            <div class="sg-prompt-section-header">
                                <span class="sg-prompt-section-title">画面描述</span>
                            </div>
                            <textarea id="sgPromptAction" class="sg-prompt-section-textarea" rows="3" placeholder="画面描述..."></textarea>
                        </div>
                        
                        <!-- 提示信息 -->
                        <div class="sg-prompt-edit-tip">
                            <i data-lucide="info" class="w-4 h-4"></i>
                            <span>角色和场景描述与其他页相同，大幅修改可能导致画面风格不统一</span>
                        </div>
                    </div>
                    <div class="sg-edit-footer">
                        <button class="sg-btn sg-btn-secondary" onclick="window.sgInstance.closePromptEditModal()">取消</button>
                        <button class="sg-btn sg-btn-primary" onclick="window.sgInstance.savePromptAndRegenerate()">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                            重新生成
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
        document.getElementById('sgCloseBtn').addEventListener('click', () => this.close());
        
        // 详情弹窗关闭
        document.getElementById('sgDetailCloseBtn').addEventListener('click', () => this.closeDetail());
        document.getElementById('sgDetailCancelBtn').addEventListener('click', () => this.closeDetail());
        
        // 重新生成
        document.getElementById('sgDetailRegenerateBtn').addEventListener('click', () => this.regenerateCurrentPage());
    }

    /**
     * 显示弹窗
     */
    show(pages = []) {
        // 保存实例到全局，供菜单调用
        window.sgInstance = this;
        
        this.pages = pages;
        this.isGenerating = true;
        this.currentStep = 1;
        
        const modal = document.getElementById('sgModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        this.renderHeaderButtons();
        this.renderContent();
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', this.closeAllMenus.bind(this));
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 关闭弹窗
     */
    close() {
        const modal = document.getElementById('sgModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // 移除事件监听
        document.removeEventListener('click', this.closeAllMenus.bind(this));
    }

    /**
     * 取消生成
     */
    async cancel() {
        const confirmed = await showConfirm('确定要取消生成吗？已生成的内容将会丢失。', '取消确认', '确定取消');
        if (confirmed) {
            this.isGenerating = false;
            this.close();
            if (this.onCancelCallback) {
                this.onCancelCallback();
            }
            if (window.showToast) {
                showToast('已取消生成', 'error');
            }
        }
    }

    /**
     * 渲染顶栏右侧按钮
     */
    renderHeaderButtons() {
        const container = document.getElementById('sgHeaderRight');
        const allCompleted = this.pages.length > 0 && this.pages.every(p => p.imageStatus === 'completed');
        
        if (allCompleted && this.currentStep >= 3) {
            container.innerHTML = `
                <button class="sg-btn sg-btn-primary" id="sgReadBtn">
                    <i data-lucide="book-open" class="w-4 h-4"></i>
                    开始阅读
                </button>
            `;
            document.getElementById('sgReadBtn').addEventListener('click', () => this.startReading());
        } else {
            container.innerHTML = `
                <button class="sg-btn sg-btn-secondary" id="sgBackgroundBtn">
                    <i data-lucide="minimize-2" class="w-4 h-4"></i>
                    后台生成
                </button>
                <button class="sg-btn sg-btn-danger" id="sgCancelBtn">
                    <i data-lucide="x" class="w-4 h-4"></i>
                    取消生成
                </button>
            `;
            document.getElementById('sgBackgroundBtn').addEventListener('click', () => this.close());
            document.getElementById('sgCancelBtn').addEventListener('click', () => this.cancel());
        }
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 渲染时间线HTML
     */
    renderTimelineHTML() {
        let html = '<div class="sg-timeline-inner">';
        
        this.steps.forEach((step, index) => {
            const status = this.getStepStatus(step.id);
            
            html += `
                <div class="sg-step">
                    <div class="sg-step-dot ${status}">
                        ${status === 'completed' ? '<i data-lucide="check" class="w-4 h-4"></i>' : step.id}
                    </div>
                    <span class="sg-step-label ${status}">${step.label}</span>
                </div>
            `;
            
            // 添加连接线（最后一个不加）
            if (index < this.steps.length - 1) {
                const lineStatus = step.id < this.currentStep ? 'completed' : '';
                html += `<div class="sg-step-line ${lineStatus}"></div>`;
            }
        });
        
        html += '</div>';
        return html;
    }

    /**
     * 渲染内容区域（包含时间线）
     */
    renderContent() {
        const container = document.getElementById('sgContent');
        
        // 时间线
        let html = `<div class="sg-timeline">${this.renderTimelineHTML()}</div>`;
        
        if (this.currentStep < 3) {
            // 显示提示语
            html += this.renderHintHTML();
        } else {
            // 显示页面卡片
            html += this.renderPagesGridHTML();
        }
        
        container.innerHTML = html;
        
        // 绑定卡片事件
        if (this.currentStep >= 3) {
            this.bindCardEvents(container);
        }
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 渲染提示语HTML
     */
    renderHintHTML() {
        let hint;
        
        // 如果是步骤2且有具体阶段，使用阶段提示语
        if (this.currentStep === 2 && this.scriptProgress.phase !== 'default') {
            const phaseConfig = this.scriptPhases[this.scriptProgress.phase];
            if (phaseConfig) {
                hint = {
                    title: phaseConfig.title,
                    desc: phaseConfig.desc.replace('{page}', this.scriptProgress.currentPage),
                    icon: phaseConfig.icon,
                    spinning: true
                };
            } else {
                hint = this.hints[this.currentStep];
            }
        } else {
            hint = this.hints[this.currentStep] || this.hints[1];
        }
        
        const spinClass = hint.spinning ? 'spinning' : '';
        
        return `
            <div class="sg-hint-area">
                <div class="sg-hint-icon ${spinClass}">
                    <i data-lucide="${hint.icon}"></i>
                </div>
                <h3 class="sg-hint-title">${hint.title}</h3>
                <p class="sg-hint-desc">${hint.desc}</p>
            </div>
        `;
    }

    /**
     * 渲染页面卡片网格HTML
     */
    renderPagesGridHTML() {
        let html = '<div class="sg-pages-wrapper"><div class="sg-pages-grid">';
        
        this.pages.forEach((page, index) => {
            html += this.renderPageCard(page, index);
        });
        
        html += '</div></div>';
        return html;
    }

    /**
     * 绑定卡片事件
     */
    bindCardEvents(container) {
        // 绑定重试按钮事件（普通失败）
        container.querySelectorAll('.sg-retry-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.regeneratePage(index);
            });
        });
        
        // 绑定修改提示词按钮事件（敏感词失败）
        container.querySelectorAll('.sg-edit-prompt-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.openEditPromptModal(index);
            });
        });
    }

    /**
     * 获取步骤状态
     */
    getStepStatus(stepId) {
        if (stepId < this.currentStep) return 'completed';
        if (stepId === this.currentStep) return 'active';
        return 'pending';
    }

    /**
     * 渲染单个页面卡片
     */
    renderPageCard(page, index) {
        const statusClass = page.imageStatus || 'pending';
        const isCover = index === 0;
        const pageLabel = isCover ? '封面' : `第${index}页`;
        const failedClass = statusClass === 'failed' ? 'failed' : '';
        const completedClass = statusClass === 'completed' ? 'completed' : '';
        const sensitiveClass = (statusClass === 'failed' && page.failReason === 'sensitive') ? 'sensitive' : '';
        
        let imageContent = '';
        if (statusClass === 'completed' && page.imageUrl) {
            imageContent = `
                <img src="${page.imageUrl}" alt="${pageLabel}">
                <div class="sg-card-menu">
                    <button class="sg-menu-btn" data-index="${index}" onclick="event.stopPropagation(); window.sgInstance.toggleCardMenu(${index})">
                        <i data-lucide="more-horizontal" class="w-4 h-4"></i>
                    </button>
                    <div class="sg-menu-dropdown hidden" id="sgMenu_${index}">
                        <button class="sg-menu-item" onclick="event.stopPropagation(); window.sgInstance.editText(${index})">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                            编辑文字
                        </button>
                        <button class="sg-menu-item" onclick="event.stopPropagation(); window.sgInstance.editImage(${index})">
                            <i data-lucide="image" class="w-4 h-4"></i>
                            编辑图片
                        </button>
                    </div>
                </div>
            `;
        } else if (statusClass === 'generating') {
            imageContent = `
                <i data-lucide="loader-2" class="sg-status-icon"></i>
                <span class="sg-status-text">生成中...</span>
            `;
        } else if (statusClass === 'failed') {
            // 根据失败原因显示不同内容
            if (page.failReason === 'sensitive') {
                imageContent = `
                    <i data-lucide="alert-triangle" class="sg-status-icon sensitive"></i>
                    <span class="sg-status-text sensitive">内容包含敏感词</span>
                    <button class="sg-edit-prompt-btn" data-index="${index}">修改提示词</button>
                `;
            } else {
                imageContent = `
                    <i data-lucide="alert-circle" class="sg-status-icon"></i>
                    <span class="sg-status-text">生成失败</span>
                    <button class="sg-retry-btn" data-index="${index}">重新生成</button>
                `;
            }
        } else {
            imageContent = `
                <i data-lucide="loader-2" class="sg-status-icon"></i>
                <span class="sg-status-text">生成中...</span>
            `;
        }
        
        return `
            <div class="sg-page-card ${failedClass} ${completedClass} ${sensitiveClass}" data-index="${index}">
                <div class="sg-card-image ${statusClass}">
                    ${imageContent}
                </div>
                <div class="sg-card-info">
                    <div class="sg-card-page-num">${pageLabel}</div>
                    <div class="sg-card-narration">${page.narration || '暂无旁白'}</div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染底部按钮
     */
    renderFooter() {
        const footer = document.getElementById('sgFooter');
        const allCompleted = this.pages.length > 0 && this.pages.every(p => p.imageStatus === 'completed');
        
        if (allCompleted && this.currentStep >= 3) {
            footer.innerHTML = `
                <button class="sg-btn sg-btn-primary" id="sgPreviewBtn">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                    去预览
                </button>
            `;
            document.getElementById('sgPreviewBtn').addEventListener('click', () => this.goToPreview());
        } else {
            footer.innerHTML = `
                <button class="sg-btn sg-btn-secondary" id="sgBackgroundBtn">
                    <i data-lucide="minimize-2" class="w-4 h-4"></i>
                    后台生成
                </button>
                <button class="sg-btn sg-btn-danger" id="sgCancelBtn">
                    <i data-lucide="x" class="w-4 h-4"></i>
                    取消生成
                </button>
            `;
            document.getElementById('sgBackgroundBtn').addEventListener('click', () => this.close());
            document.getElementById('sgCancelBtn').addEventListener('click', () => this.cancel());
        }
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 打开详情弹窗
     */
    openDetail(index) {
        this.selectedPageIndex = index;
        const page = this.pages[index];
        const isCover = index === 0;
        
        document.getElementById('sgDetailTitle').textContent = isCover ? '封面' : `第${index}页`;
        document.getElementById('sgDetailNarration').value = page.narration || '';
        document.getElementById('sgDetailPrompt').value = page.prompt || '';
        
        // 渲染图片区域
        const imageContainer = document.getElementById('sgDetailImage');
        const status = page.imageStatus || 'pending';
        
        if (status === 'completed' && page.imageUrl) {
            imageContainer.innerHTML = `<img src="${page.imageUrl}" alt="页面图片">`;
        } else if (status === 'generating') {
            imageContainer.innerHTML = `
                <i data-lucide="loader-2" class="sg-status-icon" style="animation: sg-spin 1.5s linear infinite; color: #6366f1;"></i>
                <span class="sg-status-text">生成中...</span>
            `;
        } else if (status === 'failed') {
            imageContainer.innerHTML = `
                <i data-lucide="alert-circle" class="sg-status-icon" style="color: #ef4444;"></i>
                <span class="sg-status-text" style="color: #ef4444;">生成失败</span>
            `;
        } else {
            imageContainer.innerHTML = `
                <i data-lucide="clock" class="sg-status-icon" style="color: #9ca3af;"></i>
                <span class="sg-status-text">等待中</span>
            `;
        }
        
        const modal = document.getElementById('sgDetailModal');
        modal.classList.add('active');
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 关闭详情弹窗
     */
    closeDetail() {
        // 保存修改
        if (this.selectedPageIndex >= 0) {
            const page = this.pages[this.selectedPageIndex];
            page.narration = document.getElementById('sgDetailNarration').value;
            page.prompt = document.getElementById('sgDetailPrompt').value;
            
            // 更新卡片显示
            this.renderContent();
        }
        
        const modal = document.getElementById('sgDetailModal');
        modal.classList.remove('active');
        this.selectedPageIndex = -1;
    }

    /**
     * 重新生成当前页
     */
    regenerateCurrentPage() {
        if (this.selectedPageIndex >= 0) {
            this.regeneratePage(this.selectedPageIndex);
            this.closeDetail();
        }
    }

    /**
     * 重新生成指定页
     */
    regeneratePage(index) {
        const page = this.pages[index];
        page.imageStatus = 'generating';
        page.imageUrl = null;
        
        this.renderContent();
        this.renderHeaderButtons();
        
        // 模拟重新生成（重试一定成功）
        setTimeout(() => {
            page.imageStatus = 'completed';
            page.imageUrl = page.finalImageUrl;
            this.renderContent();
            this.renderHeaderButtons();
            this.checkAllCompleted();
        }, 2000);
    }

    /**
     * 设置当前步骤
     */
    setStep(step) {
        this.currentStep = step;
        // 重置脚本进度
        if (step !== 2) {
            this.scriptProgress = { phase: 'default', currentPage: 0, totalPages: 0 };
        }
        this.renderHeaderButtons();
        this.renderContent();
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 更新脚本生成阶段
     */
    updateScriptPhase(phase, currentPage = 0, totalPages = 0) {
        this.scriptProgress.phase = phase;
        this.scriptProgress.currentPage = currentPage;
        this.scriptProgress.totalPages = totalPages;
        
        if (this.currentStep === 2) {
            this.renderContent();
        }
    }

    /**
     * 更新页面状态
     */
    updatePageStatus(index, status, imageUrl = null) {
        if (this.pages[index]) {
            this.pages[index].imageStatus = status;
            if (imageUrl) {
                this.pages[index].imageUrl = imageUrl;
            }
            
            if (this.currentStep >= 3) {
                this.renderContent();
                this.renderHeaderButtons();
                
                // 检查是否全部完成，自动切换到完成状态
                this.checkAllCompleted();
            }
        }
    }

    /**
     * 检查是否全部完成
     */
    checkAllCompleted() {
        const allCompleted = this.pages.length > 0 && this.pages.every(p => p.imageStatus === 'completed');
        if (allCompleted && this.currentStep === 3) {
            this.setStep(4);
        }
    }

    /**
     * 开始阅读
     */
    startReading() {
        this.close();
        
        // 构建阅读器需要的数据格式
        const readerData = {
            title: "丑小鸭的春天",
            pages: this.pages.slice(1).map((page, index) => ({
                pageNumber: index + 1,
                image: page.imageUrl,
                text: page.narration
            }))
        };
        
        // 打开阅读器
        if (window.storybookReader) {
            window.storybookReader.init();
            window.storybookReader.open(readerData);
        }
        
        if (this.onCompleteCallback) {
            this.onCompleteCallback(this.pages);
        }
    }

    /**
     * 设置完成回调
     */
    onComplete(callback) {
        this.onCompleteCallback = callback;
    }

    /**
     * 设置取消回调
     */
    onCancel(callback) {
        this.onCancelCallback = callback;
    }

    /**
     * 模拟生成流程（演示用）
     */
    async simulateGeneration() {
        // 初始化页面数据（封面 + 12页，与预览数据一致）
        this.pages = [
            // 封面
            {
                narration: '丑小鸭的春天',
                prompt: '丑小鸭的春天绘本封面，温馨的春天场景，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/丑小鸭的春天.png'
            },
            // 第1页
            {
                narration: '春天来了，在温暖的芦苇丛里，鸭妈妈正在孵蛋。窝里的小家伙们都出来了，只有那颗最大、最特别的蛋还静悄悄的。',
                prompt: '鸭妈妈在芦苇丛中孵蛋，温暖的春天，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/1.png'
            },
            // 第2页
            {
                narration: '终于，那颗大蛋裂开了！出来的小鸭子和其他兄弟姐妹长得很不一样——他又大又灰，看起来很丑陋。',
                prompt: '灰色的小鸭子从蛋壳中出来，其他小鸭子围观，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/2.png'
            },
            // 第3页
            {
                narration: '"你真丑！"其他小鸭子们嘲笑着说。丑小鸭伤心极了，他觉得自己不属于这里。',
                prompt: '丑小鸭被其他小鸭子嘲笑，伤心的表情，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/3.png'
            },
            // 第4页
            {
                narration: '丑小鸭决定离开家，去寻找属于自己的地方。他走过田野，越过小溪，一路上遇到了很多动物。',
                prompt: '丑小鸭独自走在田野上，背景是小溪和远方，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/4.png'
            },
            // 第5页
            {
                narration: '"你是什么动物？"农场里的鸡鸭们问道。"我也不知道..."丑小鸭低着头回答。大家都觉得他很奇怪。',
                prompt: '丑小鸭（幼年）：一只灰褐色羽毛的小水禽，体型明显大于同窝雏鸭，喙宽而略钝，眼睛圆大呈深棕色，腿脚粗壮，走路时身体微微摇晃。羽毛蓬松无光泽，翅膀短小，整体轮廓笨拙。\n农场动物们：一群家禽和家畜组成的群体：包括红冠白羽的母鸡、黄褐色虎斑家猫、棕白相间的短毛家犬。它们站立或蹲坐在农场地面，面部朝向画面中心，表情带有轻蔑或好奇。\n场景：一个农家院落旁的浅水池塘，水面平静泛绿，岸边堆着金黄色干稻草，围有木质篱笆。背景可见低矮农舍屋顶和几棵果树。地面为压实的泥土，散落谷粒。\n画面：丑小鸭（幼年）在浅水中奋力划动双蹼，水花四溅打湿羽毛，身体歪斜几乎要摔倒。岸边，农场动物们——母鸡拍翅大笑、家猫捂嘴偷笑、家犬仰头狂吠——全都面向水面，表情夸张。\n日式卡通风：具有日本漫画或动画的特点，线条流畅，色彩清新。',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/5.png'
            },
            // 第6页
            {
                narration: '寒冷的冬天来了，丑小鸭在雪地里艰难地寻找食物。他又冷又饿，但依然没有放弃寻找自己真正的家。',
                prompt: '丑小鸭在雪地中艰难前行，冬天的场景，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/6.png'
            },
            // 第7页
            {
                narration: '一天，丑小鸭看到一群美丽的白天鹅在湖面上优雅地游着。"他们真美啊！"他羡慕地想。',
                prompt: '丑小鸭远远望着湖面上的白天鹅群，羡慕的眼神，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/7.png'
            },
            // 第8页
            {
                narration: '"我多么希望能和他们一样美丽..."丑小鸭望着自己在水中的倒影，依然觉得自己很丑陋。',
                prompt: '丑小鸭望着水中自己的倒影，忧伤的表情，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/8.png'
            },
            // 第9页
            {
                narration: '春天又来了！丑小鸭长大了很多。当他再次来到湖边时，惊讶地发现水中的倒影变了——',
                prompt: '春天的湖边，丑小鸭惊讶地看着水中的倒影，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/9.png'
            },
            // 第10页
            {
                narration: '"天哪！我变成了一只美丽的白天鹅！"丑小鸭简直不敢相信自己的眼睛。原来他从来就不是丑小鸭，而是一只天鹅宝宝！',
                prompt: '美丽的白天鹅看着水中自己的倒影，惊喜的表情，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/10.png'
            },
            // 第11页
            {
                narration: '其他天鹅们热情地欢迎他："欢迎回家，美丽的天鹅！"丑小鸭终于找到了属于自己的家庭。',
                prompt: '白天鹅群欢迎新成员，温馨的场景，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/11.png'
            },
            // 第12页
            {
                narration: '从此以后，这只曾经的"丑小鸭"和天鹅伙伴们快乐地生活在一起。他明白了：每个人都有自己独特的美丽，只要耐心等待，春天总会到来。',
                prompt: '白天鹅们在湖面上快乐地游泳，阳光明媚，儿童绘本风格',
                imageStatus: 'pending',
                imageUrl: null,
                finalImageUrl: 'images/12.png'
            }
        ];
        
        const totalPages = this.pages.length - 1; // 不含封面
        
        this.show(this.pages);
        
        // 步骤1：分析大纲
        this.setStep(1);
        await this.sleep(2000);
        
        // 步骤2：生成脚本（分阶段显示）
        this.setStep(2);
        
        // 阶段1：生成角色模型
        this.updateScriptPhase('character_models');
        await this.sleep(800);
        
        // 阶段2：构建场景描述
        this.updateScriptPhase('scene_models');
        await this.sleep(800);
        
        // 阶段3：设计封面
        this.updateScriptPhase('cover');
        await this.sleep(600);
        
        // 阶段4：逐页生成
        for (let i = 1; i <= totalPages; i++) {
            this.updateScriptPhase('pages', i, totalPages);
            await this.sleep(300);
        }
        
        // 步骤3：生成图片
        this.setStep(3);
        
        // 所有图片先设为生成中
        for (let i = 0; i < this.pages.length; i++) {
            this.pages[i].imageStatus = 'generating';
        }
        this.renderContent();
        
        // 逐个完成图片生成
        for (let i = 0; i < this.pages.length; i++) {
            await this.sleep(1000);
            
            // 第5张图片：敏感词导致失败
            if (i === 5) {
                this.pages[i].failReason = 'sensitive';
                this.pages[i].failMessage = '内容包含敏感词，请修改提示词后重试';
                this.updatePageStatus(i, 'failed');
            }
            // 第8张图片：其他原因导致失败
            else if (i === 8) {
                this.pages[i].failReason = 'error';
                this.pages[i].failMessage = '生成失败，请重试';
                this.updatePageStatus(i, 'failed');
            }
            else {
                this.updatePageStatus(i, 'completed', this.pages[i].finalImageUrl);
            }
        }
        
        // 检查是否全部完成
        const allCompleted = this.pages.every(p => p.imageStatus === 'completed');
        if (allCompleted) {
            this.setStep(4);
        }
    }

    /**
     * 切换卡片菜单显示
     */
    toggleCardMenu(index) {
        const menu = document.getElementById(`sgMenu_${index}`);
        if (!menu) return;
        
        // 先关闭所有其他菜单
        this.closeAllMenus(index);
        
        // 切换当前菜单
        menu.classList.toggle('hidden');
    }

    /**
     * 关闭所有菜单
     */
    closeAllMenus(exceptIndex = -1) {
        this.pages.forEach((_, i) => {
            if (i !== exceptIndex) {
                const menu = document.getElementById(`sgMenu_${i}`);
                if (menu) menu.classList.add('hidden');
            }
        });
    }

    /**
     * 编辑文字
     */
    editText(index) {
        this.closeAllMenus();
        this.selectedPageIndex = index;
        const page = this.pages[index];
        const isCover = index === 0;
        
        // 显示文字编辑弹窗
        const modal = document.getElementById('sgTextEditModal');
        const titleEl = document.getElementById('sgTextEditTitle');
        const textArea = document.getElementById('sgTextEditArea');
        
        titleEl.textContent = isCover ? '编辑封面文字' : `编辑第${index}页文字`;
        textArea.value = page.narration || '';
        
        modal.classList.add('active');
        textArea.focus();
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 保存文字编辑
     */
    saveTextEdit() {
        if (this.selectedPageIndex >= 0) {
            const textArea = document.getElementById('sgTextEditArea');
            this.pages[this.selectedPageIndex].narration = textArea.value;
            this.renderContent();
            
            if (window.showToast) {
                showToast('文字已保存', 'success');
            }
        }
        this.closeTextEditModal();
    }

    /**
     * 关闭文字编辑弹窗
     */
    closeTextEditModal() {
        const modal = document.getElementById('sgTextEditModal');
        modal.classList.remove('active');
        this.selectedPageIndex = -1;
    }

    /**
     * 编辑图片（微调模式）
     */
    editImage(index) {
        this.closeAllMenus();
        this.selectedPageIndex = index;
        const page = this.pages[index];
        const isCover = index === 0;
        
        // 显示图片编辑弹窗
        const modal = document.getElementById('sgImageEditModal');
        const titleEl = document.getElementById('sgImageEditTitle');
        const originalPreview = document.getElementById('sgOriginalImagePreview');
        const promptInput = document.getElementById('sgImagePromptInput');
        const comparisonSection = document.getElementById('sgImageComparisonSection');
        const promptSection = document.getElementById('sgImagePromptSection');
        const generateBtn = document.getElementById('sgGenerateImageBtn');
        const acceptBtn = document.getElementById('sgAcceptImageBtn');
        const rejectBtn = document.getElementById('sgRejectImageBtn');
        const modalBackdrop = document.getElementById('sgImageEditBackdrop');
        
        titleEl.textContent = isCover ? '微调封面图片' : `微调第${index}页图片`;
        originalPreview.src = page.imageUrl || '';
        promptInput.value = '';
        
        // 重置状态
        comparisonSection.classList.add('hidden');
        promptSection.classList.remove('hidden');
        generateBtn.classList.remove('hidden');
        acceptBtn.classList.add('hidden');
        rejectBtn.classList.add('hidden');
        
        // 设置模糊背景
        if (modalBackdrop) {
            modalBackdrop.style.backgroundImage = `url('${page.imageUrl || ''}')`;
        }
        
        modal.classList.add('active');
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 生成新图片
     */
    async generateNewImage() {
        const promptInput = document.getElementById('sgImagePromptInput');
        const prompt = promptInput.value.trim();
        
        if (!prompt) {
            promptInput.focus();
            promptInput.classList.add('shake-animation');
            setTimeout(() => promptInput.classList.remove('shake-animation'), 500);
            return;
        }
        
        const comparisonSection = document.getElementById('sgImageComparisonSection');
        const promptSection = document.getElementById('sgImagePromptSection');
        const generatingOverlay = document.getElementById('sgImageGenerating');
        const generateBtn = document.getElementById('sgGenerateImageBtn');
        const acceptBtn = document.getElementById('sgAcceptImageBtn');
        const rejectBtn = document.getElementById('sgRejectImageBtn');
        const newImagePreview = document.getElementById('sgNewImagePreview');
        
        // 显示对比区域和加载状态
        comparisonSection.classList.remove('hidden');
        promptSection.classList.add('hidden');
        generatingOverlay.classList.remove('hidden');
        generateBtn.classList.add('hidden');
        
        // 模拟图片生成（3秒）
        await this.sleep(3000);
        
        // 模拟生成结果（使用原图作为演示）
        const page = this.pages[this.selectedPageIndex];
        newImagePreview.src = page.imageUrl;
        
        // 隐藏加载状态，显示操作按钮
        generatingOverlay.classList.add('hidden');
        acceptBtn.classList.remove('hidden');
        rejectBtn.classList.remove('hidden');
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 采用新图片
     */
    acceptNewImage() {
        this.closeImageEditModal();
        
        if (window.showToast) {
            showToast('图片已更新（原型模式）', 'success');
        }
    }

    /**
     * 重新生成（放弃当前结果）
     */
    rejectNewImage() {
        const comparisonSection = document.getElementById('sgImageComparisonSection');
        const promptSection = document.getElementById('sgImagePromptSection');
        const generateBtn = document.getElementById('sgGenerateImageBtn');
        const acceptBtn = document.getElementById('sgAcceptImageBtn');
        const rejectBtn = document.getElementById('sgRejectImageBtn');
        
        comparisonSection.classList.add('hidden');
        promptSection.classList.remove('hidden');
        generateBtn.classList.remove('hidden');
        acceptBtn.classList.add('hidden');
        rejectBtn.classList.add('hidden');
    }

    /**
     * 关闭图片编辑弹窗
     */
    closeImageEditModal() {
        const modal = document.getElementById('sgImageEditModal');
        modal.classList.remove('active');
        this.selectedPageIndex = -1;
    }

    /**
     * 打开修改提示词弹窗（敏感词失败时使用）
     */
    openEditPromptModal(index) {
        this.closeAllMenus();
        this.selectedPageIndex = index;
        const page = this.pages[index];
        const isCover = index === 0;
        
        const modal = document.getElementById('sgPromptEditModal');
        const titleEl = document.getElementById('sgPromptEditTitle');
        const warningEl = document.getElementById('sgPromptEditWarning');
        const charactersArea = document.getElementById('sgPromptCharacters');
        const sceneArea = document.getElementById('sgPromptScene');
        const actionArea = document.getElementById('sgPromptAction');
        
        titleEl.textContent = isCover ? '修改封面提示词' : `修改第${index}页提示词`;
        
        // 解析提示词内容，分段填充
        const parsed = this.parsePrompt(page.prompt || '');
        charactersArea.value = parsed.characters;
        sceneArea.value = parsed.scene;
        actionArea.value = parsed.action;
        
        // 显示敏感词警告
        if (page.failReason === 'sensitive') {
            warningEl.classList.remove('hidden');
        } else {
            warningEl.classList.add('hidden');
        }
        
        modal.classList.add('active');
        actionArea.focus(); // 默认聚焦到画面描述，因为这是最可能需要修改的
        
        if (window.lucide) lucide.createIcons();
    }

    /**
     * 解析提示词，拆分为角色、场景、画面三部分
     * 格式：角色描述。场景：xxx。画面：xxx。风格：xxx
     */
    parsePrompt(prompt) {
        const result = {
            characters: '',
            scene: '',
            action: ''
        };
        
        if (!prompt) return result;
        
        // 尝试按关键词分割
        // 查找"场景："或"场景："的位置
        const sceneMatch = prompt.match(/场景[：:]/);
        const actionMatch = prompt.match(/画面[：:]/);
        const styleMatch = prompt.match(/[。\n]?[\u4e00-\u9fa5]*风[：:]/);
        
        if (sceneMatch && actionMatch) {
            const sceneIndex = prompt.indexOf(sceneMatch[0]);
            const actionIndex = prompt.indexOf(actionMatch[0]);
            
            // 角色描述：从开头到"场景："之前
            result.characters = prompt.substring(0, sceneIndex).trim();
            
            // 场景描述：从"场景："到"画面："之前
            result.scene = prompt.substring(sceneIndex + sceneMatch[0].length, actionIndex).trim();
            
            // 画面描述：从"画面："到风格之前（如果有）或结尾
            if (styleMatch) {
                const styleIndex = prompt.indexOf(styleMatch[0]);
                result.action = prompt.substring(actionIndex + actionMatch[0].length, styleIndex).trim();
            } else {
                result.action = prompt.substring(actionIndex + actionMatch[0].length).trim();
            }
        } else {
            // 无法解析，全部放到画面描述
            result.action = prompt;
        }
        
        return result;
    }

    /**
     * 组合提示词
     */
    combinePrompt(characters, scene, action) {
        let parts = [];
        if (characters.trim()) parts.push(characters.trim());
        if (scene.trim()) parts.push('场景：' + scene.trim());
        if (action.trim()) parts.push('画面：' + action.trim());
        return parts.join('\n');
    }

    /**
     * 关闭修改提示词弹窗
     */
    closePromptEditModal() {
        const modal = document.getElementById('sgPromptEditModal');
        modal.classList.remove('active');
        this.selectedPageIndex = -1;
    }

    /**
     * 保存提示词并重新生成
     */
    savePromptAndRegenerate() {
        if (this.selectedPageIndex >= 0) {
            const charactersArea = document.getElementById('sgPromptCharacters');
            const sceneArea = document.getElementById('sgPromptScene');
            const actionArea = document.getElementById('sgPromptAction');
            
            // 非空校验
            const characters = charactersArea.value.trim();
            const scene = sceneArea.value.trim();
            const action = actionArea.value.trim();
            
            let hasError = false;
            
            if (!characters) {
                charactersArea.classList.add('shake-animation');
                setTimeout(() => charactersArea.classList.remove('shake-animation'), 500);
                hasError = true;
            }
            if (!scene) {
                sceneArea.classList.add('shake-animation');
                setTimeout(() => sceneArea.classList.remove('shake-animation'), 500);
                hasError = true;
            }
            if (!action) {
                actionArea.classList.add('shake-animation');
                setTimeout(() => actionArea.classList.remove('shake-animation'), 500);
                hasError = true;
            }
            
            if (hasError) {
                if (window.showToast) {
                    showToast('请填写完整的提示词内容', 'error');
                }
                return;
            }
            
            const pageIndex = this.selectedPageIndex; // 先保存索引
            const page = this.pages[pageIndex];
            
            // 组合提示词（保留原有的风格描述）
            const originalPrompt = page.prompt || '';
            const styleMatch = originalPrompt.match(/[。\n]?([\u4e00-\u9fa5]*风[：:].*)$/);
            const styleText = styleMatch ? styleMatch[1] : '';
            
            let newPrompt = this.combinePrompt(characters, scene, action);
            
            // 追加风格描述
            if (styleText) {
                newPrompt += '\n' + styleText;
            }
            
            page.prompt = newPrompt;
            
            // 清除失败状态
            page.failReason = null;
            page.failMessage = null;
            
            this.closePromptEditModal();
            this.regeneratePage(pageIndex); // 使用保存的索引
        }
    }

    /**
     * 辅助函数：延迟
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.StorybookGeneration = StorybookGeneration;
}
