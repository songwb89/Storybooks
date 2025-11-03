/**
 * 生成绘本进度窗口组件
 * 用于显示绘本生成的实时进度（3个步骤）
 * 可在 index.html 和 my-books.html 中复用
 */
class GenerationProgress {
    constructor() {
        this.currentBookId = null;
        this.currentStep = 0;
        this.isGenerating = false;
        this.onCancelCallback = null;
        
        // 初始化 DOM
        this.init();
    }

    /**
     * 初始化组件 - 创建 HTML 结构并添加到页面
     */
    init() {
        // 如果已存在，先移除
        const existing = document.getElementById('generationProgressModal');
        if (existing) {
            existing.remove();
        }

        // 创建 HTML 结构
        const modalHTML = `
            <div id="generationProgressModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] hidden">
                <div class="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 shadow-2xl">
                    <div class="text-center">
                        <!-- 主标题 -->
                        <h2 class="text-2xl font-bold text-gray-800 text-center mb-8">AI 正在生成您的绘本</h2>

                        <!-- 四阶段状态区 -->
                        <div class="space-y-4 mb-8">
                            <!-- 步骤1 -->
                            <div class="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 transition-all duration-300" id="gp-step1">
                                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <i id="gp-step1-icon" data-lucide="clock" class="w-5 h-5 text-gray-500"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-medium text-gray-700 mb-1">分析故事大纲</div>
                                    <p id="gp-step1-detail" class="text-sm text-gray-500">准备解析故事结构和角色关系...</p>
                                </div>
                                <div class="flex-shrink-0">
                                    <span id="gp-step1-status" class="text-sm font-medium text-gray-500 px-3 py-1 bg-gray-200 rounded-full">等待中</span>
                                </div>
                            </div>

                            <!-- 步骤2 -->
                            <div class="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 transition-all duration-300" id="gp-step2">
                                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <i id="gp-step2-icon" data-lucide="clock" class="w-5 h-5 text-gray-500"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-medium text-gray-700 mb-1">生成故事脚本</div>
                                    <p id="gp-step2-detail" class="text-sm text-gray-500">等待编写详细的故事内容...</p>
                                </div>
                                <div class="flex-shrink-0">
                                    <span id="gp-step2-status" class="text-sm font-medium text-gray-500 px-3 py-1 bg-gray-200 rounded-full">等待中</span>
                                </div>
                            </div>

                            <!-- 步骤4 -->
                            <div class="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 transition-all duration-300" id="gp-step3">
                                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <i id="gp-step3-icon" data-lucide="clock" class="w-5 h-5 text-gray-500"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-medium text-gray-700 mb-1">生成插图</div>
                                    <p id="gp-step3-detail" class="text-sm text-gray-500">等待AI绘制精美插图...</p>
                                </div>
                                <div class="flex-shrink-0">
                                    <span id="gp-step3-status" class="text-sm font-medium text-gray-500 px-3 py-1 bg-gray-200 rounded-full">等待中</span>
                                </div>
                            </div>
                        </div>

                        <!-- 提示信息 -->
                        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                            <div class="flex items-center space-x-2">
                                <span class="text-amber-600">•</span>
                                <span class="text-sm text-amber-700">您可以关闭窗口，生成会在后台继续</span>
                            </div>
                        </div>

                        <!-- 按钮 -->
                        <div class="flex space-x-3">
                            <button id="gp-continue-btn" class="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium">
                                在后台继续
                            </button>
                            <button id="gp-cancel-btn" class="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium">
                                取消生成
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加到 body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        const continueBtn = document.getElementById('gp-continue-btn');
        const cancelBtn = document.getElementById('gp-cancel-btn');

        continueBtn.addEventListener('click', () => this.close());
        cancelBtn.addEventListener('click', () => this.cancel());
    }

    /**
     * 显示进度窗口
     * @param {number} bookId - 绘本 ID
     * @param {number} currentStep - 当前步骤（1-4）
     */
    show(bookId = null, currentStep = 1) {
        this.currentBookId = bookId;
        this.currentStep = currentStep;
        this.isGenerating = true;

        // 显示窗口
        const modal = document.getElementById('generationProgressModal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // 更新进度显示
        this.updateProgressDisplay();
    }

    /**
     * 关闭进度窗口
     */
    close() {
        const modal = document.getElementById('generationProgressModal');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    /**
     * 取消生成
     */
    async cancel() {
        // 使用自定义确认对话框
        const confirmed = await showConfirm('确定要取消生成吗？', '取消确认', '确定');
        
        if (confirmed) {
            this.isGenerating = false;
            this.close();
            
            // 调用取消回调
            if (this.onCancelCallback) {
                this.onCancelCallback(this.currentBookId);
            }

            // 显示提示
            if (window.showToast) {
                window.showToast('已取消生成', 'error');
            }
        }
    }

    /**
     * 设置取消回调函数
     * @param {Function} callback - 取消时的回调函数
     */
    onCancel(callback) {
        this.onCancelCallback = callback;
    }

    /**
     * 更新步骤状态
     * @param {number} stepNumber - 步骤编号（1-4）
     * @param {string} status - 状态：'pending' | 'active' | 'completed'
     * @param {string} customDetail - 自定义详细描述（可选）
     */
    updateStep(stepNumber, status, customDetail = null) {
        const stepElement = document.getElementById(`gp-step${stepNumber}`);
        const iconContainer = stepElement.querySelector('.flex-shrink-0.w-10');
        const iconElement = document.getElementById(`gp-step${stepNumber}-icon`);
        const titleElement = stepElement.querySelector('.font-medium');
        const descElement = document.getElementById(`gp-step${stepNumber}-detail`);
        const statusElement = document.getElementById(`gp-step${stepNumber}-status`);

        // 步骤描述文本
        const stepDescriptions = {
            1: {
                pending: '准备解析故事结构和角色关系...',
                active: '正在深度分析故事结构和角色关系...',
                completed: '已解析故事结构和角色关系'
            },
            2: {
                pending: '等待编写详细的故事内容...',
                active: '正在编写详细的故事内容...',
                completed: '已编写完整的故事脚本'
            },
            3: {
                pending: '等待AI绘制精美插图...',
                active: '正在生成精美插图...',
                completed: '已生成所有插图'
            }
        };

        // 更新容器样式和图标
        if (status === 'pending') {
            stepElement.className = 'flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 transition-all duration-300';
            iconContainer.className = 'flex-shrink-0 w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center';
            iconElement.outerHTML = `<i id="gp-step${stepNumber}-icon" data-lucide="clock" class="w-5 h-5 text-gray-500"></i>`;
            statusElement.textContent = '等待中';
            statusElement.className = 'text-sm font-medium text-gray-500 px-3 py-1 bg-gray-200 rounded-full';
            titleElement.className = 'font-medium text-gray-700 mb-1';
            descElement.className = 'text-sm text-gray-500';
            descElement.textContent = customDetail || stepDescriptions[stepNumber].pending;
        } else if (status === 'active') {
            stepElement.className = 'flex items-center gap-4 p-4 rounded-xl bg-blue-50 border border-blue-300 transition-all duration-300';
            iconContainer.className = 'flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center';
            iconElement.outerHTML = `<i id="gp-step${stepNumber}-icon" data-lucide="loader-2" class="w-5 h-5 text-white animate-spin"></i>`;
            statusElement.textContent = '进行中';
            statusElement.className = 'text-sm font-medium text-blue-600 px-3 py-1 bg-blue-200 rounded-full';
            titleElement.className = 'font-medium text-blue-800 mb-1';
            descElement.className = 'text-sm text-blue-600';
            descElement.textContent = customDetail || stepDescriptions[stepNumber].active;
        } else if (status === 'completed') {
            stepElement.className = 'flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-300 transition-all duration-300';
            iconContainer.className = 'flex-shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center';
            iconElement.outerHTML = `<i id="gp-step${stepNumber}-icon" data-lucide="check-circle" class="w-5 h-5 text-white"></i>`;
            statusElement.textContent = '已完成';
            statusElement.className = 'text-sm font-medium text-green-600 px-3 py-1 bg-green-200 rounded-full';
            titleElement.className = 'font-medium text-green-800 mb-1';
            descElement.className = 'text-sm text-green-600';
            descElement.textContent = customDetail || stepDescriptions[stepNumber].completed;
        }

        // 重新初始化 Lucide 图标
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * 更新整体进度显示
     */
    updateProgressDisplay() {
        // 重置所有步骤为 pending 状态
        for (let i = 1; i <= 3; i++) {
            this.updateStep(i, 'pending');
        }

        // 设置当前步骤为 active
        if (this.currentStep >= 1 && this.currentStep <= 3) {
            this.updateStep(this.currentStep, 'active');
        }

        // 设置已完成的步骤
        for (let i = 1; i < this.currentStep; i++) {
            this.updateStep(i, 'completed');
        }
    }

    /**
     * 设置当前步骤并更新显示
     * @param {number} step - 步骤编号（1-3）
     */
    setCurrentStep(step) {
        this.currentStep = step;
        this.updateProgressDisplay();
    }

    /**
     * 完成某个步骤
     * @param {number} step - 步骤编号（1-3）
     */
    completeStep(step) {
        this.updateStep(step, 'completed');
    }

    /**
     * 完成所有步骤并关闭窗口
     * @param {Function} callback - 完成后的回调函数
     */
    complete(callback) {
        // 标记所有步骤为完成
        for (let i = 1; i <= 3; i++) {
            this.updateStep(i, 'completed');
        }

        this.isGenerating = false;

        // 延迟关闭窗口
        setTimeout(() => {
            this.close();
            if (callback) {
                callback(this.currentBookId);
            }
        }, 2000);
    }

    /**
     * 检查是否正在生成
     * @returns {boolean}
     */
    isInProgress() {
        return this.isGenerating;
    }

    /**
     * 获取当前绘本 ID
     * @returns {number|null}
     */
    getCurrentBookId() {
        return this.currentBookId;
    }

    /**
     * 获取当前步骤
     * @returns {number}
     */
    getCurrentStep() {
        return this.currentStep;
    }
}

// 导出到全局（兼容传统方式）
if (typeof window !== 'undefined') {
    window.GenerationProgress = GenerationProgress;
}

