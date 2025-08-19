document.addEventListener('DOMContentLoaded', () => {
    const postsData = window.commariliaStories || [];
    class App {
        constructor() {
            this.postsData = postsData;
            this.ui = new UI();
            this.storyPlayer = new StoryPlayer(this.ui.getStoryPlayerDOM(), (i) => this.postsData[i]);
        }
        init() {
            this.ui.renderNewsGrid(this.postsData);
            this.ui.initializeLazyLoading();
            this.ui.setupEventListeners((idx) => this.storyPlayer.open(idx));
            if (window.feather) { feather.replace(); }
        }
    }
    class UI {
        constructor() {
            this.dom = {
                newsGrid: document.getElementById('news-grid'),
                menuBtn: document.getElementById('menu-btn'),
                closeMenuBtn: document.getElementById('close-menu-btn'),
                sideMenu: document.getElementById('side-menu'),
                menuOverlay: document.getElementById('menu-overlay'),
            };
        }
        renderNewsGrid(postsData) {
            if (!this.dom.newsGrid) return;
            this.dom.newsGrid.innerHTML = postsData.map((post, index) => `
                <div class="news-card relative rounded-xl shadow-lg overflow-hidden cursor-pointer h-[480px] group" data-story-index="${index}" role="button" tabindex="0" aria-label="Abrir story: ${post.cardtitle}">
                    <img data-src="${post.cardimage}" alt="${post.cardtitle}" class="lazy w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-in-out">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div class="absolute bottom-0 left-0 p-5 text-white z-10">
                        <span class="text-white text-xs font-bold px-3 py-1 rounded-full" style="background-color: ${post.categorycolor};">${post.category}</span>
                        <h2 class="text-xl font-bold mt-2 leading-tight text-shadow">${post.cardtitle}</h2>
                    </div>
                </div>
            `).join('');
        }
        initializeLazyLoading() {
            const lazyImages = document.querySelectorAll('img.lazy');
            if ("IntersectionObserver" in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            img.classList.remove('lazy');
                            observer.unobserve(img);
                        }
                    });
                });
                lazyImages.forEach(img => observer.observe(img));
            } else { lazyImages.forEach(img => img.src = img.dataset.src); }
        }
        setupEventListeners(onCardClick) {
            this.dom.newsGrid?.addEventListener('click', (e) => {
                const card = e.target.closest('.news-card');
                if (card) onCardClick(parseInt(card.dataset.storyIndex));
            });
            const toggleMenu = () => {
                this.dom.sideMenu.classList.toggle('open');
                this.dom.menuOverlay.classList.toggle('hidden');
            };
            this.dom.menuBtn?.addEventListener('click', toggleMenu);
            this.dom.closeMenuBtn?.addEventListener('click', toggleMenu);
            this.dom.menuOverlay?.addEventListener('click', toggleMenu);
        }
        getStoryPlayerDOM() {
            return {
                viewer: document.getElementById('story-viewer'), container: document.getElementById('story-container'),
                progressContainer: document.getElementById('story-progress-container'), mediaContainer: document.getElementById('story-media-container'),
                title: document.getElementById('story-title-viewer'), time: document.getElementById('story-time'),
                closeBtn: document.getElementById('close-story-btn'), shareBtn: document.getElementById('share-story-btn'),
                nextArea: document.getElementById('next-story-area'), prevArea: document.getElementById('prev-story-area'),
                swipeUp: document.getElementById('full-story-swipe-up'), modal: document.getElementById('story-modal'),
                modalOverlay: document.getElementById('story-modal-overlay'), closeModalBtn: document.getElementById('close-modal-btn'),
                modalImage: document.getElementById('modal-image'), modalTitle: document.getElementById('modal-title'), modalText: document.getElementById('modal-text'),
            };
        }
        displayError(message) {
            if (this.dom.newsGrid) {
                this.dom.newsGrid.innerHTML = `<p class="col-span-full text-center text-red-500">${message}</p>`;
            }
        }
    }
    class StoryPlayer {
        constructor(dom, getStoryDataCallback) {
            this.dom = dom; this.getStoryData = getStoryDataCallback;
            this.state = { currentStoryIndex: 0, currentPageIndex: 0, isPaused: false };
            this.progressTimer = null; this.init();
        }
        init() {
            this.dom.closeBtn?.addEventListener('click', () => this.close());
            this.dom.nextArea?.addEventListener('click', () => this.nextPage());
            this.dom.prevArea?.addEventListener('click', () => this.prevPage());
            this.dom.swipeUp?.addEventListener('click', () => this.openModal());
            this.dom.shareBtn?.addEventListener('click', () => this.shareStory());
            const pauseStory = () => { this.state.isPaused = true; };
            const resumeStory = () => { this.state.isPaused = false; };
            this.dom.container.addEventListener('mousedown', pauseStory);
            this.dom.container.addEventListener('touchstart', pauseStory, { passive: true });
            this.dom.container.addEventListener('mouseup', resumeStory);
            this.dom.container.addEventListener('touchend', resumeStory);
            document.addEventListener('keydown', (e) => {
                if (this.dom.viewer.classList.contains('open')) {
                    if (e.key === 'ArrowRight') this.nextPage();
                    if (e.key === 'ArrowLeft') this.prevPage();
                    if (e.key === 'Escape') this.close();
                }
            });
            this.dom.closeModalBtn?.addEventListener('click', () => this.closeModal());
            this.dom.modalOverlay?.addEventListener('click', () => this.closeModal());
        }
        open(storyIndex) {
            this.state.currentStoryIndex = storyIndex; this.state.currentPageIndex = 0; this.state.isPaused = false;
            this.updatePage(true); this.dom.viewer?.classList.add('open'); document.body.style.overflow = 'hidden';
        }
        close() {
            this.dom.viewer?.classList.remove('open'); document.body.style.overflow = '';
            this.dom.mediaContainer.innerHTML = ''; cancelAnimationFrame(this.progressTimer);
        }
        updatePage(isFirstPage = false) {
            const story = this.getStoryData(this.state.currentStoryIndex);
            const page = story?.pages?.[this.state.currentPageIndex];
            if (!page) { this.close(); return; }
            if (isFirstPage) this.buildProgressBars();
            this.updateProgressBars();
            this.dom.mediaContainer.innerHTML = '';
            const mediaElement = page.media_type === 'video' ? document.createElement('video') : document.createElement('img');
            mediaElement.src = page.media_url;
            mediaElement.className = 'w-full h-full object-cover';
            if (page.media_type === 'video') {
                mediaElement.autoplay = true; mediaElement.muted = true; mediaElement.loop = true; mediaElement.playsInline = true;
            }
            this.dom.mediaContainer.appendChild(mediaElement);
            this.dom.title.innerHTML = page.text;
            this.dom.time.textContent = this.formatTimeAgo(story.timestamp);
            this.dom.swipeUp.style.display = page.show_link ? 'block' : 'none';
            this.startProgressBar();
        }
        nextPage() {
            const story = this.getStoryData(this.state.currentStoryIndex);
            if (this.state.currentPageIndex < story.pages.length - 1) {
                this.state.currentPageIndex++; this.updatePage();
            } else { this.close(); }
        }
        prevPage() {
            if (this.state.currentPageIndex > 0) { this.state.currentPageIndex--; this.updatePage(); }
        }
        buildProgressBars() {
            this.dom.progressContainer.innerHTML = '';
            const story = this.getStoryData(this.state.currentStoryIndex);
            story.pages.forEach(() => {
                const bar = document.createElement('div');
                bar.className = 'progress-bar';
                bar.innerHTML = '<div class="progress-bar-inner"></div>';
                this.dom.progressContainer.appendChild(bar);
            });
        }
        updateProgressBars() {
            const bars = this.dom.progressContainer.querySelectorAll('.progress-bar-inner');
            bars.forEach((bar, index) => {
                bar.style.transform = 'scaleX(0)';
                if (index < this.state.currentPageIndex) { bar.style.transform = 'scaleX(1)'; }
            });
        }
        startProgressBar() {
            cancelAnimationFrame(this.progressTimer);
            const DURATION = 5000; let startTime = null;
            const bar = this.dom.progressContainer.querySelectorAll('.progress-bar-inner')[this.state.currentPageIndex];
            if (!bar) return;
            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                if (!this.state.isPaused) {
                    const elapsed = timestamp - startTime;
                    const progress = Math.min(elapsed / DURATION, 1);
                    bar.style.transform = `scaleX(${progress})`;
                    if (progress >= 1) { this.nextPage(); return; }
                } else {
                    const currentProgress = parseFloat(bar.style.transform.replace('scaleX(', ''));
                    startTime = timestamp - (currentProgress * DURATION);
                }
                this.progressTimer = requestAnimationFrame(animate);
            };
            this.progressTimer = requestAnimationFrame(animate);
        }
        async shareStory() {
            const story = this.getStoryData(this.state.currentStoryIndex);
            try {
                await navigator.share({ title: story.cardtitle, text: `Confira: ${story.cardtitle}`, url: window.location.href });
            } catch (err) { console.error('Erro ao compartilhar:', err); }
        }
        openModal() {
            const story = this.getStoryData(this.state.currentStoryIndex);
            if (!story.fullcontent) return;
            this.state.isPaused = true;
            this.dom.modalImage.src = story.fullcontent.image || story.cardimage;
            this.dom.modalTitle.textContent = story.fullcontent.title || story.cardtitle;
            this.dom.modalText.innerHTML = story.fullcontent.body || '';
            this.dom.modal.classList.add('open');
        }
        closeModal() { this.dom.modal.classList.remove('open'); this.state.isPaused = false; }
        formatTimeAgo(isoString) {
            const seconds = Math.floor((new Date() - new Date(isoString)) / 1000);
            let interval = seconds / 31536000; if (interval > 1) return Math.floor(interval) + 'a';
            interval = seconds / 2592000; if (interval > 1) return Math.floor(interval) + 'm';
            interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + 'd';
            interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + 'h';
            interval = seconds / 60; if (interval > 1) return Math.floor(interval) + 'min';
            return 'agora';
        }
    }
    const app = new App();
    app.init();
});
