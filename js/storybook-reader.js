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
                
                <div class="flex items-center gap-2 text-sm text-gray-600">
                    <span id="currentPageNum">1</span>
                    <span>/</span>
                    <span id="totalPageNum">12</span>
                </div>
            </header>

            <!-- 主阅读区 -->
            <main class="h-[calc(100vh-136px)] flex items-center justify-center px-8 py-6">
                <div class="flex gap-8 h-full">
                    <!-- 左侧图片区 - 保持图片原始比例 -->
                    <div id="imageContainer" class="h-full flex items-center justify-center bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <img id="storybookImage" src="" alt="绘本插图" class="h-full w-auto object-contain" style="opacity: 1; transition: opacity 0.4s ease-out, transform 0.4s ease-out;">
                    </div>

                    <!-- 右侧文字区 - 与图片等高 -->
                    <div id="textContainer" class="h-full rounded-2xl shadow-2xl p-12 flex flex-col justify-center relative" style="aspect-ratio: 1 / 1; opacity: 1; transition: opacity 0.4s ease-out, transform 0.4s ease-out; 
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

            <!-- 底部翻页控制 -->
            <footer class="bg-white border-t border-gray-200 px-6 py-4 shadow-sm">
                <div class="max-w-7xl mx-auto flex items-center justify-between">
                    <button id="prevPageBtn" onclick="window.storybookReader.previousPage()" class="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500">
                        <i data-lucide="chevron-left" class="w-5 h-5"></i>
                        <span>上一页</span>
                    </button>

                    <!-- 页码指示器 -->
                    <div class="flex items-center gap-2">
                        <div id="pageIndicators" class="flex gap-2"></div>
                    </div>

                    <button id="nextPageBtn" onclick="window.storybookReader.nextPage()" class="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500">
                        <span>下一页</span>
                        <i data-lucide="chevron-right" class="w-5 h-5"></i>
                    </button>
                </div>
            </footer>
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
        
        const viewer = document.getElementById('storybookViewer');
        viewer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // 设置标题和总页数
        document.getElementById('storybookTitle').textContent = bookData.title;
        document.getElementById('totalPageNum').textContent = bookData.pages.length;
        
        // 渲染页码指示器
        this.renderPageIndicators();
        
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
        const viewer = document.getElementById('storybookViewer');
        viewer.classList.add('hidden');
        document.body.style.overflow = '';
        this.currentBookData = null;
    }

    // 显示指定页(带平滑过渡)
    async showPage(pageNum) {
        if (this.isPageTransitioning || !this.currentBookData) return;
        
        const page = this.currentBookData.pages[pageNum - 1];
        if (!page) return;
        
        this.isPageTransitioning = true;
        
        const imageEl = document.getElementById('storybookImage');
        const textEl = document.getElementById('storybookText');
        const imageContainer = document.getElementById('imageContainer');
        const textContainer = document.getElementById('textContainer');
        
        // 步骤1: 淡出当前内容
        imageEl.style.opacity = '0';
        textContainer.style.opacity = '0';
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 步骤2: 更新内容
        try {
            await this.preloadImage(page.image);
            imageEl.src = page.image;
        } catch (error) {
            console.warn('图片加载失败:', page.image);
            imageEl.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4=';
        }
        
        textEl.innerHTML = page.text;
        
        // 更新页码显示
        this.currentPage = pageNum;
        document.getElementById('currentPageNum').textContent = pageNum;
        document.getElementById('pageNumberDisplay').textContent = pageNum;
        
        // 更新按钮状态
        this.updateNavigationButtons();
        
        // 更新页码指示器
        this.updatePageIndicators();
        
        // 显示/隐藏重新开始按钮
        const restartButton = document.getElementById('restartButton');
        if (pageNum === this.currentBookData.pages.length) {
            restartButton.classList.remove('hidden');
        } else {
            restartButton.classList.add('hidden');
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 步骤3: 淡入新内容
        imageEl.style.opacity = '1';
        textContainer.style.opacity = '1';
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        this.isPageTransitioning = false;
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

    // 渲染页码指示器
    renderPageIndicators() {
        if (!this.currentBookData) return;
        
        const container = document.getElementById('pageIndicators');
        container.innerHTML = '';
        
        for (let i = 1; i <= this.currentBookData.pages.length; i++) {
            const indicator = document.createElement('div');
            indicator.className = `w-3 h-3 rounded-full cursor-pointer transition-all ${
                i === this.currentPage ? 'bg-primary-500' : 'bg-gray-300 hover:bg-gray-400'
            }`;
            indicator.onclick = () => this.showPage(i);
            container.appendChild(indicator);
        }
    }

    // 更新页码指示器
    updatePageIndicators() {
        const indicators = document.querySelectorAll('#pageIndicators > div');
        indicators.forEach((indicator, index) => {
            if (index + 1 === this.currentPage) {
                indicator.className = 'w-3 h-3 rounded-full cursor-pointer transition-all bg-primary-500';
            } else {
                indicator.className = 'w-3 h-3 rounded-full cursor-pointer transition-all bg-gray-300 hover:bg-gray-400';
            }
        });
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
                }
            }
        });
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
