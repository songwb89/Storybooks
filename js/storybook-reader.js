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
        <!-- 绘本阅读器全屏弹窗 -->
        <div id="storybookViewer" class="fixed inset-0 bg-black/90 z-[200] hidden">
            <!-- 顶部工具栏 -->
            <header class="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <button onclick="window.storybookReader.close()" class="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                    <i data-lucide="x" class="w-5 h-5"></i>
                    <span class="font-medium">关闭</span>
                </button>
                
                <h2 id="storybookTitle" class="text-xl font-bold text-gray-800">绘本标题</h2>
                
                <div class="flex items-center gap-3">
                    <!-- 播放/暂停按钮 -->
                    <button id="playPauseBtn" onclick="window.storybookReader.togglePlay()" class="flex items-center gap-1.5 px-4 py-1.5 bg-[#c2e7ff] hover:bg-[#a8d8f0] text-[#001d35] rounded-full text-sm font-medium transition-all shadow-sm">
                        <i id="playPauseIcon" data-lucide="play" class="w-4 h-4"></i>
                        <span id="playPauseText">Listen</span>
                    </button>
                    
                    <!-- 音色选择器 -->
                    <div class="relative">
                        <button id="voiceSelectBtn" onclick="window.storybookReader.toggleVoiceMenu()" class="flex items-center gap-1.5 px-4 py-1.5 bg-[#e8eaed] hover:bg-[#dadce0] text-[#3c4043] rounded-full text-sm font-medium transition-all shadow-sm">
                            <i data-lucide="music" class="w-4 h-4"></i>
                            <span id="currentVoiceText">温柔女声</span>
                            <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
                        </button>
                        
                        <!-- 音色下拉菜单 -->
                        <div id="voiceMenu" class="hidden absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px] z-10">
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
                    
                    <!-- 页码 -->
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                        <span id="currentPageNum">1</span>
                        <span>/</span>
                        <span id="totalPageNum">12</span>
                    </div>
                </div>
            </header>

            <!-- 主阅读区 -->
            <main class="h-[calc(100vh-68px)] w-full flex items-center justify-center py-8 relative">
                <!-- 左侧翻页按钮 - 图标尺寸64px×64px -->
                <button id="prevPageBtn" onclick="window.storybookReader.previousPage()" class="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed z-50 group" style="left: calc(60px - 64px - 16px + 10px);">
                    <i data-lucide="chevron-left" class="w-16 h-16 text-gray-600 transition-transform group-hover:scale-125 group-hover:text-gray-800"></i>
                </button>
                
                <!-- 右侧翻页按钮 - 图标尺寸64px×64px -->
                <button id="nextPageBtn" onclick="window.storybookReader.nextPage()" class="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed z-50 group" style="right: calc(60px - 16px - 64px + 10px);">
                    <i data-lucide="chevron-right" class="w-16 h-16 text-gray-600 transition-transform group-hover:scale-125 group-hover:text-gray-800"></i>
                </button>
                
                <div class="flex gap-0 w-[calc(100%-120px)] max-h-full">
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
                        <div id="storybookText" class="text-gray-800 text-2xl leading-relaxed space-y-4">
                            故事内容将在这里显示...
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
            </main>
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
        document.getElementById('totalPageNum').textContent = bookData.pages.length;
        
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
        
        // 步骤1: 淡出当前内容
        imageEl.style.opacity = '0';
        textContainer.style.opacity = '0';
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 步骤2: 立即更新文字内容并显示（不等待图片）
        textEl.innerHTML = page.text;
        
        // 更新页码显示
        this.currentPage = pageNum;
        document.getElementById('currentPageNum').textContent = pageNum;
        document.getElementById('pageNumberDisplay').textContent = pageNum;
        
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
        
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === this.currentBookData.pages.length;
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
                if (e.key === 'ArrowLeft') {
                    this.previousPage();
                } else if (e.key === 'ArrowRight') {
                    this.nextPage();
                } else if (e.key === 'Escape') {
                    this.close();
                } else if (e.key === ' ') {
                    e.preventDefault();
                    this.togglePlay();
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
