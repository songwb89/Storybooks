/**
 * 绘本阅读器公共模块
 * 提供全屏阅读功能，可在多个页面中复用
 */

class StorybookReader {
    constructor() {
        this.currentPage = 1;
        this.isPageTransitioning = false;
        this.currentBookData = null;
        this.isInitialized = false;
        
        // 语音播放相关
        this.isPlaying = false; // 当前是否正在播放
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null; // 当前的语音对象
        this.selectedVoice = null; // 当前选择的音色
        this.availableVoices = []; // 可用的音色列表
        this.voiceConfig = {
            '温柔女声': { lang: 'zh-CN', gender: 'female', name: null },
            '活泼童声': { lang: 'zh-CN', gender: 'female', name: null, pitch: 1.2 },
            '磁性男声': { lang: 'zh-CN', gender: 'male', name: null },
            '慈祥奶奶': { lang: 'zh-CN', gender: 'female', name: null, pitch: 0.9 }
        };
        this.currentVoiceType = this.loadVoicePreference(); // 当前音色类型
        
        // 编辑模式相关
        this.editMode = {
            isActive: false,        // 是否开启编辑模式
            currentEditType: null,  // 'text' | 'image' | null
            hasUnsavedChanges: false, // 是否有未保存更改
            originalText: '',       // 原始文字内容
            originalImage: '',      // 原始图片URL
            newImage: ''           // 新生成的图片URL
        };
        
        // PDF 缓存相关
        this.pdfCache = {
            url: null,              // 缓存的PDF URL
            state: 'none',          // 'none' | 'generating' | 'ready' | 'outdated'
            generatedAt: null       // 生成时间戳
        };
        
        // 初始化语音
        this.initVoices();
    }

    // 初始化阅读器（在页面加载时调用）
    init() {
        if (this.isInitialized) return;
        
        // 创建阅读器HTML结构
        this.createReaderHTML();
        
        // 绑定键盘事件
        this.bindKeyboardEvents();
        
        this.isInitialized = true;
    }

    // 创建阅读器的HTML结构
    createReaderHTML() {
        const readerHTML = `
        <style>
            /* 输入框抖动动画 */
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-8px); }
                75% { transform: translateX(8px); }
            }

            .shake-animation {
                animation: shake 0.3s ease-in-out;
                border-color: #f59e0b !important; /* 琥珀色 */
                box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1) !important;
            }
        </style>
        <!-- 绘本阅读器全屏弹窗 -->
        <div id="storybookViewer" class="fixed inset-0 bg-black/90 z-[200] hidden">
            <!-- 顶部工具栏 -->
            <header class="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm relative">
                <div>
                    <!-- 左侧留空 -->
                </div>
                
                <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
                    <h2 id="storybookTitle" class="text-xl font-bold text-gray-800 whitespace-nowrap">绘本标题</h2>
                </div>
                
                <div class="flex items-center gap-3">
                    <!-- 播放/暂停按钮 -->
                    <button id="playPauseBtn" onclick="window.storybookReader.togglePlay()" class="flex items-center gap-1.5 px-4 py-2 bg-[#c2e7ff] hover:bg-[#a8d8f0] text-[#001d35] rounded-full text-sm font-medium transition-all shadow-sm">
                        <i id="playPauseIcon" data-lucide="play" class="w-4 h-4"></i>
                        <span id="playPauseText">Listen</span>
                    </button>
                    
                    <!-- 音色选择器 -->
                    <div class="relative">
                        <button id="voiceSelectBtn" onclick="window.storybookReader.toggleVoiceMenu()" class="flex items-center gap-1.5 px-4 py-2 bg-[#c2e7ff] hover:bg-[#a8d8f0] text-[#001d35] rounded-full text-sm font-medium transition-all shadow-sm">
                            <i data-lucide="music" class="w-4 h-4"></i>
                            <span id="currentVoiceText">温柔女声</span>
                            <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
                        </button>
                        
                        <!-- 音色下拉菜单 -->
                        <div id="voiceMenu" class="hidden absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px] z-50">
                            <button onclick="window.storybookReader.selectVoice('温柔女声')" class="voice-option w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm">
                                <span class="text-lg">👧</span>
                                <span>温柔女声</span>
                            </button>
                            <button onclick="window.storybookReader.selectVoice('活泼童声')" class="voice-option w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm">
                                <span class="text-lg">👦</span>
                                <span>活泼童声</span>
                            </button>
                            <button onclick="window.storybookReader.selectVoice('磁性男声')" class="voice-option w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm">
                                <span class="text-lg">👨</span>
                                <span>磁性男声</span>
                            </button>
                            <button onclick="window.storybookReader.selectVoice('慈祥奶奶')" class="voice-option w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm">
                                <span class="text-lg">👵</span>
                                <span>慈祥奶奶</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- 下载PDF按钮 -->
                    <button id="downloadPDFBtn" onclick="window.storybookReader.downloadPDF()" class="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <i id="downloadPDFIcon" data-lucide="download" class="w-4 h-4"></i>
                        <span id="downloadPDFText">下载PDF</span>
                    </button>
                    
                    <!-- 编辑按钮 -->
                    <button id="enterEditModeBtn" onclick="window.storybookReader.openEditor()" class="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-all shadow-sm">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                        <span>编辑</span>
                    </button>
                    
                    <!-- 分隔线 -->
                    <div class="w-px h-6 bg-gray-300"></div>
                    
                    <!-- 关闭按钮 -->
                    <button id="closeReaderBtn" onclick="window.storybookReader.close()" class="p-2.5 bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-lg transition-all border border-gray-300">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
            </header>

            <!-- 主阅读区 -->
            <main class="h-[calc(100vh-68px)] w-full flex items-center justify-center py-8 pb-20 relative overflow-hidden">
                <!-- 动态模糊背景层 -->
                <div id="blurredBackground" class="absolute inset-0 w-full h-full" style="
                    background-image: url('');
                    background-size: cover;
                    background-position: center;
                    filter: blur(50px) brightness(0.75);
                    transform: scale(1.1);
                    z-index: 0;
                    opacity: 1;
                    transition: opacity 0.5s ease-in-out;
                    will-change: background-image;
                "></div>
                
                <div class="flex gap-0 w-[calc(100%-120px)] max-h-full relative z-10">
                    <!-- 左侧图片区 - 保持图片原始比例 1472:1136 = 1.296:1 -->
                    <div id="imageContainer" class="flex-[1.296] max-h-full flex items-center justify-center bg-white rounded-l-2xl shadow-2xl overflow-hidden relative" style="aspect-ratio: 1472 / 1136; box-shadow: 
                        /* 原有外部阴影 */
                        0 25px 50px -12px rgba(0, 0, 0, 0.25),
                        /* 右侧内部阴影 - 模拟页面弯曲 */
                        inset -12px 0 15px -8px rgba(0, 0, 0, 0.25);">
                        <!-- 加载动画 -->
                        <div id="imageLoader" class="absolute inset-0 flex items-center justify-center bg-gray-50">
                            <div class="flex flex-col items-center gap-3">
                                <div class="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
                                <span class="text-sm text-gray-500">加载中...</span>
                            </div>
                        </div>
                        <img id="storybookImage" src="" alt="绘本插图" class="h-full w-full object-cover relative z-10" style="opacity: 0; transition: opacity 0.4s ease-out, transform 0.4s ease-out;">
                    </div>

                    <!-- 右侧文字区 - 与图片等高 -->
                    <div id="textContainer" class="flex-1 max-h-full rounded-r-2xl p-12 flex flex-col justify-center relative" style="aspect-ratio: 1 / 1; opacity: 1; transition: opacity 0.4s ease-out, transform 0.4s ease-out;
                    box-shadow: 
                        /* 原有外部阴影 */
                        0 25px 50px -12px rgba(0, 0, 0, 0.25),
                        /* 左侧内部阴影 - 模拟页面弯曲 */
                        inset 12px 0 15px -8px rgba(0, 0, 0, 0.25); 
                    background: 
                      /* 主背景色 */
                      linear-gradient(135deg, #faf9f7 0%, #f0ede8 100%),
                      /* 纸张纹理 - 细密的点状纹理 */
                      radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0),
                      /* 交叉织纹 */
                      repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px),
                      repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px),
                      /* 大范围的色彩变化 */
                      radial-gradient(circle at 20% 20%, rgba(255,248,220,0.4) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(245,245,220,0.3) 0%, transparent 50%);
                    background-size: 
                      100% 100%,
                      20px 20px,
                      2px 2px,
                      2px 2px,
                      200px 200px,
                      300px 300px;">
                        
                        <div id="storybookText" class="text-gray-800 text-4xl leading-relaxed space-y-4" style="font-family: 'KaiTi', 'STKaiti', '楷体', 'Kaiti SC', serif;">
                            故事内容将在这里显示...
                        </div>
                        
                        <!-- 文字编辑状态 -->
                        <div id="textEditMode" class="hidden absolute inset-0 bg-white z-30 flex flex-col">
                            <!-- 顶部工具栏 -->
                            <div class="flex items-center justify-between px-8 py-4 border-b border-gray-100">
                                <div class="flex items-center gap-2 text-gray-400">
                                    <i data-lucide="type" class="w-5 h-5"></i>
                                    <span class="text-sm font-medium">编辑文本</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button onclick="window.storybookReader.cancelTextEdit()" class="px-5 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                                        取消
                                    </button>
                                    <button onclick="window.storybookReader.saveTextEdit()" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow">
                                        保存
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 编辑区域 -->
                            <div class="flex-1 overflow-hidden p-8">
                                <textarea id="textEditArea" class="w-full h-full p-6 border border-gray-200 rounded-xl text-gray-800 text-xl leading-relaxed resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="请输入文本内容..."></textarea>
                            </div>
                        </div>
                        <!-- 重新开始按钮 - 只在最后一页显示 -->
                        <div id="restartButton" class="mt-8 text-center hidden">
                            <button onclick="window.storybookReader.restart()" class="px-4 py-2 border border-gray-300 rounded-full text-gray-500 hover:text-primary-600 hover:border-primary-600 transition-colors duration-200 flex items-center gap-2 mx-auto">
                                <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                                <span>重新开始</span>
                            </button>
                        </div>
                        <!-- 页码 - 右下角 -->
                        <div class="absolute bottom-8 right-8 text-2xl font-medium text-gray-400">
                            <span id="pageNumberDisplay">1</span>
                        </div>
                    </div>
                </div>
                
                <!-- 底部悬浮翻页控制条 -->
                <div id="pageControlBar" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
                    <div class="flex items-center gap-4 px-6 py-2 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-200/50">
                        <!-- 上一页按钮 -->
                        <button id="floatingPrevBtn" onclick="window.storybookReader.previousPage()" class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-100 group">
                            <i data-lucide="chevron-left" class="w-5 h-5 transition-transform group-hover:scale-110"></i>
                        </button>
                        
                        <!-- 页码显示 -->
                        <div class="flex items-center gap-1.5 px-4 select-none">
                            <span class="text-sm font-medium text-gray-700">
                                <span id="floatingCurrentPage">1</span>
                                <span class="text-gray-400 mx-1">/</span>
                                <span id="floatingTotalPages" class="text-gray-500">12</span>
                            </span>
                        </div>
                        
                        <!-- 下一页按钮 -->
                        <button id="floatingNextBtn" onclick="window.storybookReader.nextPage()" class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-100 group">
                            <i data-lucide="chevron-right" class="w-5 h-5 transition-transform group-hover:scale-110"></i>
                        </button>
                    </div>
                </div>
            </main>
            
            <!-- 图片编辑对话框 -->
            <div id="imageEditModal" class="hidden fixed inset-0 z-[250] flex items-center justify-center" style="background-color: rgba(0, 0, 0, 0.4);">
                <!-- 模糊背景层 -->
                <div id="imageEditModalBackdrop" class="absolute inset-0 bg-cover bg-center" style="background-image: url(''); filter: blur(40px); opacity: 0.7;"></div>
                <div class="bg-white rounded-3xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col relative z-10">
                    <!-- 标题栏 -->
                    <div class="px-8 py-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex items-center justify-between">
                        <h3 class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">重新生成图片</h3>
                        <button onclick="window.storybookReader.closeImageEditModal()" class="w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-sm hover:shadow flex items-center justify-center transition-all hover:scale-105">
                            <i data-lucide="x" class="w-5 h-5 text-gray-600"></i>
                        </button>
                    </div>
                    
                    <!-- 内容区 -->
                    <div class="flex-1 overflow-y-auto p-8">
                        <!-- 图片对比区 -->
                        <div id="imageComparisonSection" class="hidden mb-8">
                            <div class="grid grid-cols-2 gap-8">
                                <div>
                                    <div class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <div class="w-2 h-2 rounded-full bg-gray-400"></div>
                                        原始图片
                                    </div>
                                    <div class="aspect-[1472/1136] bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl overflow-hidden shadow-md border border-gray-200">
                                        <img id="originalImagePreview" src="" alt="原始图片" class="w-full h-full object-cover">
                                    </div>
                                </div>
                                <div>
                                    <div class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <div class="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                                        新生成图片
                                    </div>
                                    <div class="aspect-[1472/1136] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl overflow-hidden relative shadow-md border border-indigo-200">
                                        <img id="newImagePreview" src="" alt="新生成图片" class="w-full h-full object-cover">
                                        <!-- 生成中遮罩 -->
                                        <div id="imageGenerating" class="hidden absolute inset-0 bg-white/95 flex items-center justify-center backdrop-blur-sm">
                                            <div class="flex flex-col items-center gap-4">
                                                <div class="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                                                <span class="text-base font-medium text-gray-700">AI正在生成图片...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 输入区 -->
                        <div id="imagePromptSection">
                            <label class="block text-base font-semibold text-gray-800 mb-3">
                                请描述您希望如何修改这张图片
                            </label>
                            <textarea id="imagePromptInput" class="w-full h-36 px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none resize-none text-gray-800 text-base transition-all" placeholder="例如：让背景更加明亮，角色表情更加开心"></textarea>
                            <div class="mt-3 text-sm text-gray-500 flex items-center gap-2">
                                <i data-lucide="lightbulb" class="w-4 h-4 text-yellow-500"></i>
                                <span>提示：描述越详细，生成效果越好</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 底部按钮 -->
                    <div class="px-8 py-5 bg-gray-50 border-t border-gray-200 flex justify-end items-center">
                        <div class="flex gap-3">
                            <button id="rejectNewImageBtn" onclick="window.storybookReader.rejectNewImage()" class="hidden px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all shadow-sm hover:shadow border border-gray-300">
                                重新生成
                            </button>
                            <button id="generateImageBtn" onclick="window.storybookReader.generateNewImage()" class="px-8 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2">
                                <i data-lucide="wand-2" class="w-4 h-4"></i>
                                <span>开始生成</span>
                            </button>
                            <button id="acceptNewImageBtn" onclick="window.storybookReader.acceptNewImage()" class="hidden px-8 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2">
                                <i data-lucide="check" class="w-4 h-4"></i>
                                <span>采用新图</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        // 将HTML插入到body中
        document.body.insertAdjacentHTML('beforeend', readerHTML);
    }

    // 打开阅读器
    open(bookData, startPage = 1) {
        if (!this.isInitialized) {
            this.init();
        }

        this.currentBookData = bookData;
        this.currentPage = startPage;
        
        // 重置播放状态（默认暂停）
        this.isPlaying = false;
        this.stopSpeech();
        
        const viewer = document.getElementById('storybookViewer');
        viewer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // 设置标题和总页数
        document.getElementById('storybookTitle').textContent = bookData.title;
        document.getElementById('floatingTotalPages').textContent = bookData.pages.length;
        
        // 更新音色显示（从localStorage加载）
        const currentVoiceText = document.getElementById('currentVoiceText');
        if (currentVoiceText) {
            currentVoiceText.textContent = this.currentVoiceType;
        }
        
        // 更新播放按钮状态
        this.updatePlayPauseButton();
        
        // 显示当前页
        this.showPage(this.currentPage);
        
        // 预加载所有图片(优化用户体验)
        bookData.pages.forEach(page => {
            this.preloadImage(page.image).catch(() => {});
        });
        
        // 重新创建图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 关闭阅读器
    close() {
        // 停止播放
        this.pause();
        
        const viewer = document.getElementById('storybookViewer');
        viewer.classList.add('hidden');
        document.body.style.overflow = '';
        this.currentBookData = null;
    }

    // 打开编辑器
    openEditor() {
        if (!this.currentBookData) return;
        
        // 准备页面数据
        const pages = this.currentBookData.pages.map(page => ({
            imageUrl: page.image,
            narration: page.text
        }));
        
        // 创建编辑器实例
        const editor = new StorybookEditor();
        editor.onClose((updatedPages) => {
            console.log('编辑完成，更新后的页面数据：', updatedPages);
            // 更新当前绘本数据
            updatedPages.forEach((updatedPage, index) => {
                if (this.currentBookData.pages[index]) {
                    this.currentBookData.pages[index].image = updatedPage.imageUrl;
                    this.currentBookData.pages[index].text = updatedPage.narration;
                }
            });
            // 刷新当前页面显示
            this.showPage(this.currentPage, false);
        });
        
        // 显示编辑器（阅读器不关闭）
        editor.show(pages);
    }

    // 显示指定页(带平滑过渡)
    // autoPlay: 是否在翻页后自动播放（用于区分自动翻页和手动翻页）
    async showPage(pageNum, autoPlay = null) {
        if (this.isPageTransitioning || !this.currentBookData) return;
        
        const page = this.currentBookData.pages[pageNum - 1];
        if (!page) return;
        
        this.isPageTransitioning = true;
        
        // 保存播放状态（如果没有明确指定autoPlay，则使用当前播放状态）
        const shouldAutoPlay = autoPlay !== null ? autoPlay : this.isPlaying;
        
        // 停止当前语音
        this.stopSpeech();
        
        const imageEl = document.getElementById('storybookImage');
        const textEl = document.getElementById('storybookText');
        const imageContainer = document.getElementById('imageContainer');
        const textContainer = document.getElementById('textContainer');
        const imageLoader = document.getElementById('imageLoader');
        const blurredBg = document.getElementById('blurredBackground');
        
        // 步骤1: 淡出当前内容
        imageEl.style.opacity = '0';
        textContainer.style.opacity = '0';
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 步骤2: 立即更新文字内容并显示（不等待图片）
        textEl.innerHTML = page.text;
        
        // 更新页码显示
        this.currentPage = pageNum;
        document.getElementById('pageNumberDisplay').textContent = pageNum;
        document.getElementById('floatingCurrentPage').textContent = pageNum;
        
        // 更新按钮状态
        this.updateNavigationButtons();
        
        // 显示/隐藏重新开始按钮
        const restartButton = document.getElementById('restartButton');
        if (pageNum === this.currentBookData.pages.length) {
            restartButton.classList.remove('hidden');
        } else {
            restartButton.classList.add('hidden');
        }
        
        // 立即显示文字区域
        await new Promise(resolve => setTimeout(resolve, 50));
        textContainer.style.opacity = '1';
        
        // 步骤3: 异步加载图片（与文字显示并行）
        // 显示加载动画
        if (imageLoader) {
            imageLoader.style.display = 'flex';
        }
        
        try {
            await this.preloadImage(page.image);
            imageEl.src = page.image;
            
            // 更新模糊背景 - 使用淡入淡出效果
            if (blurredBg) {
                // 淡出旧背景
                blurredBg.style.opacity = '0';
                await new Promise(resolve => setTimeout(resolve, 250));
                
                // 更换背景图片
                blurredBg.style.backgroundImage = `url('${page.image}')`;
                
                // 淡入新背景
                await new Promise(resolve => setTimeout(resolve, 50));
                blurredBg.style.opacity = '1';
            }
        } catch (error) {
            console.warn('图片加载失败:', page.image);
            imageEl.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4=';
        }
        
        // 隐藏加载动画
        if (imageLoader) {
            imageLoader.style.display = 'none';
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 步骤4: 淡入图片
        imageEl.style.opacity = '1';
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        this.isPageTransitioning = false;
        
        // 如果需要自动播放，继续播放新页面
        if (shouldAutoPlay) {
            this.play();
        }
    }

    // 上一页
    previousPage() {
        if (this.currentPage > 1) {
            this.showPage(this.currentPage - 1);
        }
    }

    // 下一页
    nextPage() {
        if (this.currentBookData && this.currentPage < this.currentBookData.pages.length) {
            this.showPage(this.currentPage + 1);
        }
    }

    // 重新开始
    restart() {
        this.showPage(1);
    }

    // 更新导航按钮状态
    updateNavigationButtons() {
        if (!this.currentBookData) return;
        
        const floatingPrevBtn = document.getElementById('floatingPrevBtn');
        const floatingNextBtn = document.getElementById('floatingNextBtn');
        
        floatingPrevBtn.disabled = this.currentPage === 1;
        floatingNextBtn.disabled = this.currentPage === this.currentBookData.pages.length;
    }

    // 预加载图片
    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = src;
        });
    }

    // 绑定键盘事件
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            const viewer = document.getElementById('storybookViewer');
            if (viewer && !viewer.classList.contains('hidden')) {
                // 如果在文字编辑状态，只处理ESC键
                if (this.editMode.currentEditType === 'text') {
                    if (e.key === 'Escape') {
                        this.cancelTextEdit();
                    }
                    return;
                }

                // 如果在图片编辑对话框，只处理ESC键
                const imageModal = document.getElementById('imageEditModal');
                if (imageModal && !imageModal.classList.contains('hidden')) {
                    if (e.key === 'Escape') {
                        this.closeImageEditModal();
                    }
                    return;
                }

                // 正常阅读模式的快捷键
                if (e.key === 'ArrowLeft' && !this.editMode.isActive) {
                    this.previousPage();
                } else if (e.key === 'ArrowRight' && !this.editMode.isActive) {
                    this.nextPage();
                } else if (e.key === 'Escape') {
                    if (this.editMode.isActive) {
                        this.toggleEditMode();
                    } else {
                        this.close();
                    }
                } else if (e.key === ' ' && !this.editMode.isActive) {
                    e.preventDefault();
                    this.togglePlay();
                } else if (e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                    this.toggleEditMode();
                }
            }
        });
        
        // 点击音色菜单外部时关闭菜单
        document.addEventListener('click', (e) => {
            const voiceMenu = document.getElementById('voiceMenu');
            const voiceSelectBtn = document.getElementById('voiceSelectBtn');
            if (voiceMenu && !voiceMenu.contains(e.target) && !voiceSelectBtn.contains(e.target)) {
                voiceMenu.classList.add('hidden');
            }
        });
        
        // 绑定点击区域翻页事件
        this.bindClickPageEvents();
    }
    
    // 绑定点击区域翻页
    bindClickPageEvents() {
        const imageContainer = document.getElementById('imageContainer');
        const textContainer = document.getElementById('textContainer');
        
        // 左侧图片区域点击 → 上一页
        if (imageContainer) {
            imageContainer.addEventListener('click', (e) => {
                // 编辑模式下不翻页
                if (this.editMode.isActive) return;
                
                // 如果点击的是按钮或其子元素，不翻页
                const isButton = e.target.closest('button');
                if (isButton) return;
                
                // 如果点击的是加载动画区域，不翻页
                if (e.target.closest('#imageLoader')) return;
                
                // 翻到上一页
                this.previousPage();
            });
            
            // 添加视觉提示：鼠标悬停时显示指针
            imageContainer.style.cursor = 'pointer';
        }
        
        // 右侧文字区域点击 → 下一页
        if (textContainer) {
            textContainer.addEventListener('click', (e) => {
                // 编辑模式下不翻页
                if (this.editMode.isActive) return;
                
                // 如果点击的是按钮或其子元素，不翻页
                const isButton = e.target.closest('button');
                if (isButton) return;
                
                // 如果点击的是页码显示，不翻页
                if (e.target.closest('#pageNumberDisplay')) return;
                
                // 如果点击的是文字编辑区域，不翻页
                if (e.target.closest('#textEditMode')) return;
                
                // 翻到下一页
                this.nextPage();
            });
            
            // 添加视觉提示：鼠标悬停时显示指针
            textContainer.style.cursor = 'pointer';
        }
    }

    // ========== 语音播放相关方法 ==========

    // 初始化语音
    initVoices() {
        // 加载可用的语音
        const loadVoices = () => {
            this.availableVoices = this.speechSynthesis.getVoices();
            console.log('可用语音数量:', this.availableVoices.length);
        };

        loadVoices();
        
        // 某些浏览器需要在 voiceschanged 事件后才能获取语音列表
        if (this.speechSynthesis.onvoiceschanged !== undefined) {
            this.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }

    // 加载用户音色偏好
    loadVoicePreference() {
        const saved = localStorage.getItem('storybook_voice_preference');
        return saved || '温柔女声';
    }

    // 保存用户音色偏好
    saveVoicePreference(voiceType) {
        localStorage.setItem('storybook_voice_preference', voiceType);
    }

    // 获取最佳匹配的语音
    getBestVoice(voiceType) {
        const config = this.voiceConfig[voiceType];
        if (!config) return null;

        // 优先查找中文语音
        let voices = this.availableVoices.filter(voice => voice.lang.includes('zh'));
        
        // 如果没有中文语音，使用所有可用语音
        if (voices.length === 0) {
            voices = this.availableVoices;
        }

        // 根据性别筛选
        if (config.gender) {
            const genderVoices = voices.filter(voice => {
                const name = voice.name.toLowerCase();
                if (config.gender === 'female') {
                    return name.includes('female') || name.includes('woman') || name.includes('huihui') || name.includes('yaoyao');
                } else {
                    return name.includes('male') || name.includes('man') || name.includes('kangkang') || name.includes('云扬');
                }
            });
            if (genderVoices.length > 0) {
                voices = genderVoices;
            }
        }

        // 返回第一个匹配的语音
        return voices[0] || this.availableVoices[0];
    }

    // 播放/暂停切换
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    // 播放当前页
    play() {
        if (!this.currentBookData) return;

        this.isPlaying = true;
        this.updatePlayPauseButton();

        // 停止当前正在播放的语音
        this.stopSpeech();

        // 获取当前页文字
        const page = this.currentBookData.pages[this.currentPage - 1];
        if (!page) return;

        // 提取纯文本（去除HTML标签）
        const textEl = document.createElement('div');
        textEl.innerHTML = page.text;
        const text = textEl.textContent || textEl.innerText;

        // 创建语音对象
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        
        // 设置语音
        const voice = this.getBestVoice(this.currentVoiceType);
        if (voice) {
            this.currentUtterance.voice = voice;
        }
        this.currentUtterance.lang = 'zh-CN';

        // 应用音色配置
        const config = this.voiceConfig[this.currentVoiceType];
        if (config.rate) {
            this.currentUtterance.rate = config.rate;
        } else {
            this.currentUtterance.rate = 0.9; // 默认语速稍慢一点，更适合阅读
        }
        
        if (config.pitch) {
            this.currentUtterance.pitch = config.pitch;
        }

        // 播放结束后的处理
        this.currentUtterance.onend = () => {
            if (this.isPlaying) {
                // 自动翻到下一页
                if (this.currentPage < this.currentBookData.pages.length) {
                    // showPage 会自动根据当前的 isPlaying 状态继续播放
                    this.showPage(this.currentPage + 1);
                } else {
                    // 已经是最后一页，停止播放
                    this.pause();
                }
            }
        };

        // 播放出错时的处理
        this.currentUtterance.onerror = (event) => {
            console.error('语音播放错误:', event);
            this.pause();
        };

        // 开始播放
        this.speechSynthesis.speak(this.currentUtterance);
    }

    // 暂停播放
    pause() {
        this.isPlaying = false;
        this.stopSpeech();
        this.updatePlayPauseButton();
    }

    // 停止当前语音
    stopSpeech() {
        if (this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }
        this.currentUtterance = null;
    }

    // 更新播放/暂停按钮状态
    updatePlayPauseButton() {
        const icon = document.getElementById('playPauseIcon');
        const text = document.getElementById('playPauseText');
        
        if (!icon || !text) return;

        if (this.isPlaying) {
            icon.setAttribute('data-lucide', 'pause');
            text.textContent = '暂停';
        } else {
            icon.setAttribute('data-lucide', 'play');
            text.textContent = '播放';
        }

        // 重新创建图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 切换音色菜单
    toggleVoiceMenu() {
        const menu = document.getElementById('voiceMenu');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    }

    // 选择音色
    selectVoice(voiceType) {
        this.currentVoiceType = voiceType;
        this.saveVoicePreference(voiceType);
        
        // 更新显示
        const currentVoiceText = document.getElementById('currentVoiceText');
        if (currentVoiceText) {
            currentVoiceText.textContent = voiceType;
        }

        // 关闭菜单
        const menu = document.getElementById('voiceMenu');
        if (menu) {
            menu.classList.add('hidden');
        }

        // 如果正在播放，重新开始播放（应用新音色）
        if (this.isPlaying) {
            this.play();
        }
    }

    // ========== 编辑模式相关方法 ==========

    // 切换编辑模式
    toggleEditMode() {
        this.editMode.isActive = !this.editMode.isActive;
        this.updateEditModeUI();
    }

    // 更新编辑模式UI
    updateEditModeUI() {
        const closeReaderBtn = document.getElementById('closeReaderBtn');
        const enterEditModeBtn = document.getElementById('enterEditModeBtn');
        const finishEditBtn = document.getElementById('finishEditBtn');
        const editTextBtn = document.getElementById('editTextBtn');
        const editImageBtn = document.getElementById('editImageBtn');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const voiceSelectBtn = document.getElementById('voiceSelectBtn');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const floatingPrevBtn = document.getElementById('floatingPrevBtn');
        const floatingNextBtn = document.getElementById('floatingNextBtn');

        if (this.editMode.isActive) {
            // 进入编辑模式
            // 显示完成按钮和页面上的编辑按钮
            finishEditBtn.classList.remove('hidden');
            enterEditModeBtn.classList.add('hidden');
            editTextBtn.classList.remove('hidden');
            editImageBtn.classList.remove('hidden');
            
            // 禁用关闭按钮、播放和翻页
            closeReaderBtn.disabled = true;
            closeReaderBtn.classList.add('opacity-50', 'cursor-not-allowed');
            
            if (this.isPlaying) {
                this.pause();
            }
            playPauseBtn.disabled = true;
            playPauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
            voiceSelectBtn.disabled = true;
            voiceSelectBtn.classList.add('opacity-50', 'cursor-not-allowed');
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            
            // 禁用浮动翻页按钮
            if (floatingPrevBtn) {
                floatingPrevBtn.disabled = true;
            }
            if (floatingNextBtn) {
                floatingNextBtn.disabled = true;
            }
        } else {
            // 退出编辑模式
            // 隐藏完成按钮和页面上的编辑按钮
            finishEditBtn.classList.add('hidden');
            enterEditModeBtn.classList.remove('hidden');
            editTextBtn.classList.add('hidden');
            editImageBtn.classList.add('hidden');
            
            // 恢复关闭按钮、播放和翻页
            closeReaderBtn.disabled = false;
            closeReaderBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            
            playPauseBtn.disabled = false;
            playPauseBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            voiceSelectBtn.disabled = false;
            voiceSelectBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            this.updateNavigationButtons();
        }

        // 重新创建图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // ========== 文字编辑相关方法 ==========

    // 开始文字编辑
    startTextEdit() {
        if (!this.editMode.isActive) return;

        const page = this.currentBookData.pages[this.currentPage - 1];
        if (!page) return;

        this.editMode.currentEditType = 'text';
        
        // 保存原始文字
        const textEl = document.createElement('div');
        textEl.innerHTML = page.text;
        this.editMode.originalText = textEl.textContent || textEl.innerText;

        // 显示编辑界面
        const textEditMode = document.getElementById('textEditMode');
        const textEditArea = document.getElementById('textEditArea');

        textEditMode.classList.remove('hidden');
        textEditArea.value = this.editMode.originalText;
        textEditArea.focus();

        // 禁用浮动翻页按钮
        const floatingPrevBtn = document.getElementById('floatingPrevBtn');
        const floatingNextBtn = document.getElementById('floatingNextBtn');
        if (floatingPrevBtn) floatingPrevBtn.disabled = true;
        if (floatingNextBtn) floatingNextBtn.disabled = true;

        // 重新创建图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 取消文字编辑
    cancelTextEdit() {
        const textEditMode = document.getElementById('textEditMode');
        textEditMode.classList.add('hidden');
        this.editMode.currentEditType = null;

        // 激活浮动翻页按钮（用户已完成当前编辑操作）
        this.updateNavigationButtons();
    }

    // 保存文字编辑
    saveTextEdit() {
        const textEditArea = document.getElementById('textEditArea');
        const newText = textEditArea.value.trim();

        if (!newText) {
            // 聚焦到输入框并轻微抖动
            textEditArea.focus();
            textEditArea.classList.add('shake-animation');
            setTimeout(() => textEditArea.classList.remove('shake-animation'), 500);
            return;
        }

        // 更新页面数据
        const page = this.currentBookData.pages[this.currentPage - 1];
        if (page) {
            page.text = newText;
            
            // 更新显示
            const storybookText = document.getElementById('storybookText');
            storybookText.textContent = newText;

            // 标记有未保存的更改
            this.editMode.hasUnsavedChanges = true;
            
            // PDF缓存失效（因为内容已修改）
            this.clearPDFCache();

            // 关闭编辑界面
            this.cancelTextEdit();

            // 显示成功提示
            this.showToast('文字已保存', 'success');

            // TODO: 这里应该调用API保存到后端
            console.log('保存文字到后端:', {
                pageNumber: this.currentPage,
                text: newText
            });
        }
    }

    // ========== 图片编辑相关方法 ==========

    // 开始图片编辑
    startImageEdit() {
        if (!this.editMode.isActive) return;

        const page = this.currentBookData.pages[this.currentPage - 1];
        if (!page) return;

        this.editMode.currentEditType = 'image';
        this.editMode.originalImage = page.image;

        // 显示图片编辑对话框
        const modal = document.getElementById('imageEditModal');
        const modalBackdrop = document.getElementById('imageEditModalBackdrop');
        const originalPreview = document.getElementById('originalImagePreview');
        const imagePromptInput = document.getElementById('imagePromptInput');
        const imageComparisonSection = document.getElementById('imageComparisonSection');
        const imagePromptSection = document.getElementById('imagePromptSection');
        const generateBtn = document.getElementById('generateImageBtn');
        const acceptBtn = document.getElementById('acceptNewImageBtn');
        const rejectBtn = document.getElementById('rejectNewImageBtn');

        // 重置状态
        originalPreview.src = page.image;
        imagePromptInput.value = '';
        imageComparisonSection.classList.add('hidden');
        imagePromptSection.classList.remove('hidden');
        generateBtn.classList.remove('hidden');
        acceptBtn.classList.add('hidden');
        rejectBtn.classList.add('hidden');

        // 设置模糊背景为当前图片
        if (modalBackdrop) {
            modalBackdrop.style.backgroundImage = `url('${page.image}')`;
        }

        modal.classList.remove('hidden');

        // 禁用浮动翻页按钮
        const floatingPrevBtn = document.getElementById('floatingPrevBtn');
        const floatingNextBtn = document.getElementById('floatingNextBtn');
        if (floatingPrevBtn) floatingPrevBtn.disabled = true;
        if (floatingNextBtn) floatingNextBtn.disabled = true;

        // 重新创建图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 关闭图片编辑对话框
    closeImageEditModal() {
        const modal = document.getElementById('imageEditModal');
        modal.classList.add('hidden');
        this.editMode.currentEditType = null;
        this.editMode.newImage = '';

        // 激活浮动翻页按钮（用户已完成当前编辑操作）
        this.updateNavigationButtons();
    }

    // 生成新图片
    async generateNewImage() {
        const promptInput = document.getElementById('imagePromptInput');
        const prompt = promptInput.value.trim();

        if (!prompt) {
            // 聚焦到输入框并轻微抖动
            promptInput.focus();
            promptInput.classList.add('shake-animation');
            setTimeout(() => promptInput.classList.remove('shake-animation'), 500);
            return;
        }

        // 显示对比区域和加载状态
        const imageComparisonSection = document.getElementById('imageComparisonSection');
        const imagePromptSection = document.getElementById('imagePromptSection');
        const imageGenerating = document.getElementById('imageGenerating');
        const generateBtn = document.getElementById('generateImageBtn');
        const acceptBtn = document.getElementById('acceptNewImageBtn');
        const rejectBtn = document.getElementById('rejectNewImageBtn');

        imageComparisonSection.classList.remove('hidden');
        imagePromptSection.classList.add('hidden');
        imageGenerating.classList.remove('hidden');
        generateBtn.classList.add('hidden');

        // 模拟图片生成（实际应该调用后端API）
        console.log('调用图生图API:', {
            originalImage: this.editMode.originalImage,
            prompt: prompt,
            pageNumber: this.currentPage
        });

        // 模拟3秒生成时间
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 模拟生成结果（使用原图作为演示）
        // 实际应该使用API返回的新图片URL
        const newImagePreview = document.getElementById('newImagePreview');
        this.editMode.newImage = this.editMode.originalImage; // 演示用，实际应该是新生成的图片
        newImagePreview.src = this.editMode.newImage;

        // 隐藏加载状态，显示操作按钮
        imageGenerating.classList.add('hidden');
        acceptBtn.classList.remove('hidden');
        rejectBtn.classList.remove('hidden');

        // 重新创建图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 采用新图片
    acceptNewImage() {
        // 原型模式：只关闭对话框，不实际替换图片
        this.closeImageEditModal();
        
        // PDF缓存失效（因为内容已修改）
        this.clearPDFCache();
        
        // 显示成功提示
        this.showToast('图片已采用（原型模式）', 'success');
        
        // TODO: 实际项目中，这里应该：
        // 1. 更新页面数据
        // 2. 更新显示的图片
        // 3. 调用API保存到后端
        console.log('原型模式：采用新图片', {
            pageNumber: this.currentPage,
            originalImage: this.editMode.originalImage,
            newImage: this.editMode.newImage
        });
    }

    // 放弃新图片
    rejectNewImage() {
        // 重置到输入状态
        const imageComparisonSection = document.getElementById('imageComparisonSection');
        const imagePromptSection = document.getElementById('imagePromptSection');
        const generateBtn = document.getElementById('generateImageBtn');
        const acceptBtn = document.getElementById('acceptNewImageBtn');
        const rejectBtn = document.getElementById('rejectNewImageBtn');

        imageComparisonSection.classList.add('hidden');
        imagePromptSection.classList.remove('hidden');
        generateBtn.classList.remove('hidden');
        acceptBtn.classList.add('hidden');
        rejectBtn.classList.add('hidden');

        this.editMode.newImage = '';
    }

    // ==================== PDF 下载相关 ====================
    
    /**
     * 下载PDF（原型模式）
     * 首次点击：模拟生成过程（3秒）+ 自动触发下载
     * 再次点击：直接触发下载（0.3秒）
     */
    async downloadPDF() {
        // 检查缓存
        if (this.pdfCache.url && this.pdfCache.state === 'ready') {
            // ===== 场景2：有缓存，直接下载 =====
            console.log('📥 【原型模式】直接下载缓存的PDF');
            console.log('实际项目中会执行:', {
                操作: '触发浏览器下载',
                URL: this.pdfCache.url,
                文件名: `${this.currentBookData.title}.pdf`,
                代码示例: 'window.location.href = pdfUrl'
            });
            
            // 按钮短暂闪现"下载中..."
            this.updateDownloadButton('下载中...', false, 'download');
            await this.sleep(300);
            
            // Toast 提示
            this.showToast('✅ 开始下载（原型演示）', 'success');
            
            // 恢复按钮
            this.updateDownloadButton('下载PDF', false, 'download');
            return;
        }
        
        // ===== 场景1：无缓存，需要生成 =====
        console.log('🔄 【原型模式】首次下载，需要生成PDF');
        console.log('实际项目中会调用:', {
            API: 'POST /api/books/generate-pdf',
            参数: {
                bookId: this.currentBookData?.id || 'demo-book-001',
                title: this.currentBookData?.title || '绘本标题',
                pages: this.currentBookData?.pages || []
            }
        });
        
        // 显示生成中状态
        this.updateDownloadButton('生成中...', true, 'loader-2');
        
        // 模拟生成过程（3秒）
        await this.sleep(3000);
        
        // 模拟生成完成，缓存URL
        const mockPdfUrl = `https://cdn.example.com/storybooks/${this.currentBookData?.title || 'demo'}.pdf`;
        this.pdfCache = {
            url: mockPdfUrl,
            state: 'ready',
            generatedAt: Date.now()
        };
        
        console.log('✅ 【原型模式】PDF生成完成');
        console.log('实际项目中会执行:', {
            操作: '触发浏览器下载',
            URL: mockPdfUrl,
            代码示例: `
                const link = document.createElement('a');
                link.href = '${mockPdfUrl}';
                link.download = '${this.currentBookData?.title || '绘本'}.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            `
        });
        
        // Toast 提示
        this.showToast('📄 PDF已生成并开始下载（原型演示）', 'success');
        
        // 恢复按钮
        this.updateDownloadButton('下载PDF', false, 'download');
    }
    
    /**
     * 更新下载按钮状态
     * @param {string} text - 按钮文字
     * @param {boolean} disabled - 是否禁用
     * @param {string} iconName - lucide图标名称
     */
    updateDownloadButton(text, disabled, iconName) {
        const btn = document.getElementById('downloadPDFBtn');
        const textEl = document.getElementById('downloadPDFText');
        const iconEl = document.getElementById('downloadPDFIcon');
        
        if (!btn || !textEl || !iconEl) return;
        
        // 更新文字
        textEl.textContent = text;
        
        // 更新禁用状态
        btn.disabled = disabled;
        
        // 更新图标
        iconEl.setAttribute('data-lucide', iconName);
        
        // 添加/移除动画类
        if (iconName === 'loader-2') {
            iconEl.classList.add('animate-spin');
        } else {
            iconEl.classList.remove('animate-spin');
        }
        
        // 重新渲染图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    /**
     * 清除PDF缓存（用于测试或内容编辑后）
     */
    clearPDFCache() {
        this.pdfCache = {
            url: null,
            state: 'none',
            generatedAt: null
        };
        console.log('🗑️ PDF缓存已清除');
    }
    
    /**
     * 辅助方法：延迟执行
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 显示提示消息
    showToast(message, type = 'success') {
        // 如果页面有全局 showToast 函数，使用全局的
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        // 否则创建临时提示元素
        const toast = document.createElement('div');
        
        // 根据类型设置图标和背景色
        let bgColor = 'bg-green-500'; // 默认成功是绿色
        let iconName = 'check-circle';
        
        if (type === 'error') {
            bgColor = 'bg-amber-500';
            iconName = 'alert-circle';
        } else if (type === 'info') {
            bgColor = 'bg-blue-500';
            iconName = 'info';
        } else if (type === 'warning') {
            bgColor = 'bg-amber-500';
            iconName = 'alert-triangle';
        }
        
        toast.className = `fixed top-20 left-1/2 -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-xl shadow-2xl z-[300] transition-all duration-300 opacity-100 flex items-center gap-3`;
        toast.innerHTML = `
            <i data-lucide="${iconName}" class="w-5 h-5"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        
        // 初始化图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 3秒后移除
        setTimeout(() => {
            toast.classList.add('opacity-0', '-translate-y-2');
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// 创建全局实例
window.storybookReader = new StorybookReader();

// 默认的绘本数据（丑小鸭的春天）
window.defaultStorybookData = {
    title: "丑小鸭的春天",
    pages: [
        {
            pageNumber: 1,
            image: "images/1.png",
            text: "春天来了，在温暖的芦苇丛里，鸭妈妈正在孵蛋。窝里的小家伙们都出来了，只有那颗最大、最特别的蛋还静悄悄的。"
        },
        {
            pageNumber: 2,
            image: "images/2.png",
            text: "终于，那颗大蛋裂开了！出来的小鸭子和其他兄弟姐妹长得很不一样——他又大又灰，看起来很丑陋。"
        },
        {
            pageNumber: 3,
            image: "images/3.png",
            text: "\"你真丑！\"其他小鸭子们嘲笑着说。丑小鸭伤心极了，他觉得自己不属于这里。"
        },
        {
            pageNumber: 4,
            image: "images/4.png",
            text: "丑小鸭决定离开家，去寻找属于自己的地方。他走过田野，越过小溪，一路上遇到了很多动物。"
        },
        {
            pageNumber: 5,
            image: "images/5.png",
            text: "\"你是什么动物？\"农场里的鸡鸭们问道。\"我也不知道...\"丑小鸭低着头回答。大家都觉得他很奇怪。"
        },
        {
            pageNumber: 6,
            image: "images/6.png",
            text: "寒冷的冬天来了，丑小鸭在雪地里艰难地寻找食物。他又冷又饿，但依然没有放弃寻找自己真正的家。"
        },
        {
            pageNumber: 7,
            image: "images/7.png",
            text: "一天，丑小鸭看到一群美丽的白天鹅在湖面上优雅地游着。\"他们真美啊！\"他羡慕地想。"
        },
        {
            pageNumber: 8,
            image: "images/8.png",
            text: "\"我多么希望能和他们一样美丽...\"丑小鸭望着自己在水中的倒影，依然觉得自己很丑陋。"
        },
        {
            pageNumber: 9,
            image: "images/9.png",
            text: "春天又来了！丑小鸭长大了很多。当他再次来到湖边时，惊讶地发现水中的倒影变了——"
        },
        {
            pageNumber: 10,
            image: "images/10.png",
            text: "\"天哪！我变成了一只美丽的白天鹅！\"丑小鸭简直不敢相信自己的眼睛。原来他从来就不是丑小鸭，而是一只天鹅宝宝！"
        },
        {
            pageNumber: 11,
            image: "images/11.png",
            text: "其他天鹅们热情地欢迎他：\"欢迎回家，美丽的天鹅！\"丑小鸭终于找到了属于自己的家庭。"
        },
        {
            pageNumber: 12,
            image: "images/12.png",
            text: "从此以后，这只曾经的\"丑小鸭\"和天鹅伙伴们快乐地生活在一起。他明白了：每个人都有自己独特的美丽，只要耐心等待，春天总会到来。"
        }
    ]
};
