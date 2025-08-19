document.addEventListener('DOMContentLoaded', () => {

    class App {
        constructor() {
            this.storiesData = [];
            this.api = new Api();
            this.ui = new UI();
            this.storyPlayer = new StoryPlayer(this.ui.getStoryPlayerDOM(), (storyIndex) => this.storiesData[storyIndex]);
        }

        async init() {
            try {
                const rawData = await this.api.fetchPosts();
                this.storiesData = rawData
                    .filter(story => {
                        const storyDate = new Date(story.timestamp);
                        const now = new Date();
                        return story.status === 'published' || (story.status === 'scheduled' && storyDate <= now);
                    })
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                this.ui.renderNewsGrid(this.storiesData);
                this.ui.initializeLazyLoading();
                this.ui.setupEventListeners(
                    (storyIndex) => this.storyPlayer.open(storyIndex)
                );
                
                feather.replace();

            } catch (error) {
                console.error("Falha ao inicializar a aplicação:", error);
                this.ui.displayError("Não foi possível carregar as notícias. Tente novamente mais tarde.");
            }
        }
    }

    class Api {
        async fetchPosts() {
            const response = await fetch('posts.json');
            if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
            return await response.json();
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

        renderNewsGrid(storiesData) {
            if (!this.dom.newsGrid) return;
            this.dom.newsGrid.innerHTML = storiesData.map((story, index) => `
                <div class="news-card relative rounded-xl shadow-lg overflow-hidden cursor-pointer h-[480px] group" data-story-index="${index}" role="button" tabindex="0" aria-label="Abrir story: ${story.cardTitle}">
                    <img data-src="${story.cardImage}" alt="${story.cardTitle}" class="lazy w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-in-out">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div class="absolute bottom-0 left-0 p-5 text-white z-10">
                        <span class="text-white text-xs font-bold px-3 py-1 rounded-full" style="background-color: ${story.categoryColor};">${story.category}</span>
                        <h2 class="text-xl font-bold mt-2 leading-tight text-shadow">${story.cardTitle}</h2>
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
            } else {
                lazyImages.forEach(img => img.src = img.dataset.src);
            }
        }

        setupEventListeners(onCardClick) {
            this.dom.newsGrid?.addEventListener('click', (e) => {
                const card = e.target.closest('.news-card');
                if (card) onCardClick(parseInt(card.dataset.storyIndex));
            });
            this.dom.newsGrid?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const card = e.target.closest('.news-card');
                    if (card) { e.preventDefault(); onCardClick(parseInt(card.dataset.storyIndex)); }
                }
            });
            const toggleMenu = () => {
                const isOpen = this.dom.sideMenu.classList.toggle('open');
                this.dom.menuOverlay.classList.toggle('hidden');
                if (isOpen) this.dom.closeMenuBtn.focus();
                else this.dom.menuBtn.focus();
            };
            this.dom.menuBtn?.addEventListener('click', toggleMenu);
            this.dom.closeMenuBtn?.addEventListener('click', toggleMenu);
            this.dom.menuOverlay?.addEventListener('click', toggleMenu);
        }

        getStoryPlayerDOM() {
            return {
                viewer: document.getElementById('story-viewer'),
                container: document.getElementById('story-container'),
                progressContainer: document.getElementById('story-progress-container'),
                mediaContainer: document.getElementById('story-media-container'),
                title: document.getElementById('story-title-viewer'),
                time: document.getElementById('story-time'),
                closeBtn: document.getElementById('close-story-btn'),
                shareBtn: document.getElementById('share-story-btn'),
                nextArea: document.getElementById('next-story-area'),
                prevArea: document.getElementById('prev-story-area'),
                swipeUp: document.getElementById('full-story-swipe-up'),
                modal: document.getElementById('story-modal'),
                modalOverlay: document.getElementById('story-modal-overlay'),
                closeModalBtn: document.getElementById('close-modal-btn'),
                modalImage: document.getElementById('modal-image'),
                modalTitle: document.getElementById('modal-title'),
                modalText: document.getElementById('modal-text'),
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
            this.dom = dom;
            this.getStoryData = getStoryDataCallback;
            this.state = { currentStoryIndex: 0, currentPageIndex: 0, isPaused: false };
            this.progressTimer = null;
            this.touchStartX = 0;
            this.init();
        }

        init() {
            // Controles básicos
            this.dom.closeBtn?.addEventListener('click', () => this.close());
            this.dom.nextArea?.addEventListener('click', () => this.nextPage());
            this.dom.prevArea?.addEventListener('click', () => this.prevPage());
            this.dom.swipeUp?.addEventListener('click', () => this.openModal());
            this.dom.shareBtn?.addEventListener('click', () => this.shareStory());

            // Pausar/Retomar story
            const pauseStory = () => { this.state.isPaused = true; };
            const resumeStory = () => { this.state.isPaused = false; };
            this.dom.container.addEventListener('mousedown', pauseStory);
            this.dom.container.addEventListener('touchstart', pauseStory, { passive: true });
            this.dom.container.addEventListener('mouseup', resumeStory);
            this.dom.container.addEventListener('touchend', resumeStory);

            // Controles de teclado e gestos
            document.addEventListener('keydown', (e) => {
                if (this.dom.viewer.classList.contains('open')) {
                    if (e.key === 'ArrowRight') this.nextPage();
                    if (e.key === 'ArrowLeft') this.prevPage();
                    if (e.key === 'Escape') this.close();
                }
            });
            this.dom.container.addEventListener('touchstart', (e) => { this.touchStartX = e.touches[0].clientX; }, { passive: true });
            this.dom.container.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].clientX;
                if (this.touchStartX - touchEndX > 50) this.nextPage(); // Swipe left
                if (touchEndX - this.touchStartX > 50) this.prevPage(); // Swipe right
            });

            // Modal
            this.dom.closeModalBtn?.addEventListener('click', () => this.closeModal());
            this.dom.modalOverlay?.addEventListener('click', () => this.closeModal());
        }

        open(storyIndex) {
            this.state.currentStoryIndex = storyIndex;
            this.state.currentPageIndex = 0;
            this.state.isPaused = false;
            this.updatePage(true); // true para indicar que é a primeira página
            this.dom.viewer?.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        close() {
            this.dom.viewer?.classList.remove('open');
            document.body.style.overflow = '';
            this.dom.mediaContainer.innerHTML = '';
            cancelAnimationFrame(this.progressTimer);
        }

        updatePage(isFirstPage = false) {
            const story = this.getStoryData(this.state.currentStoryIndex);
            const page = story?.pages?.[this.state.currentPageIndex];
            if (!page) { this.close(); return; }

            if(isFirstPage) this.buildProgressBars();
            this.updateProgressBars();
            
            this.dom.mediaContainer.innerHTML = '';
            const mediaElement = page.mediaType === 'video' ? document.createElement('video') : document.createElement('img');
            mediaElement.src = page.mediaUrl;
            mediaElement.className = "w-full h-full object-cover";
            if (page.mediaType === 'video') {
                mediaElement.autoplay = true; mediaElement.muted = true; mediaElement.loop = true; mediaElement.playsInline = true;
            }
            this.dom.mediaContainer.appendChild(mediaElement);

            this.dom.title.innerHTML = page.text;
            this.dom.time.textContent = this.formatTimeAgo(story.timestamp);
            this.dom.swipeUp.style.display = page.showLink ? 'block' : 'none';

            this.startProgressBar();
        }

        nextPage() {
            const story = this.getStoryData(this.state.currentStoryIndex);
            if (this.state.currentPageIndex < story.pages.length - 1) {
                this.state.currentPageIndex++;
                this.updatePage();
            } else {
                this.close();
            }
        }

        prevPage() {
            if (this.state.currentPageIndex > 0) {
                this.state.currentPageIndex--;
                this.updatePage();
            }
        }

        buildProgressBars() {
            this.dom.progressContainer.innerHTML = '';
            const story = this.getStoryData(this.state.currentStoryIndex);
            story.pages.forEach(() => {
                const bar = document.createElement('div');
                bar.className = 'progress-bar';
                bar.innerHTML = `<div class="progress-bar-inner"></div>`;
                this.dom.progressContainer.appendChild(bar);
            });
        }

        updateProgressBars() {
            const bars = this.dom.progressContainer.querySelectorAll('.progress-bar-inner');
            bars.forEach((bar, index) => {
                bar.classList.remove('active');
                bar.style.transition = 'none';
                bar.style.transform = 'scaleX(0)';
                if (index < this.state.currentPageIndex) {
                    bar.style.transform = 'scaleX(1)';
                }
            });
        }

        startProgressBar() {
            cancelAnimationFrame(this.progressTimer);
            const DURATION = 5000; // 5 segundos por story
            let startTime = null;
            const bar = this.dom.progressContainer.querySelectorAll('.progress-bar-inner')[this.state.currentPageIndex];
            if (!bar) return;

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                
                if (!this.state.isPaused) {
                    const elapsed = timestamp - startTime;
                    const progress = Math.min(elapsed / DURATION, 1);
                    bar.style.transform = `scaleX(${progress})`;

                    if (progress >= 1) {
                        this.nextPage();
                        return;
                    }
                } else {
                    // Se pausado, reseta o tempo inicial para o timestamp atual menos o tempo já decorrido
                    const currentProgress = parseFloat(bar.style.transform.replace('scaleX(', ''));
                    startTime = timestamp - (currentProgress * DURATION);
                }
                this.progressTimer = requestAnimationFrame(animate);
            };
            this.progressTimer = requestAnimationFrame(animate);
        }
        
        async shareStory() {
            const story = this.getStoryData(this.state.currentStoryIndex);
            const shareData = {
                title: story.cardTitle,
                text: `Confira esta notícia: ${story.cardTitle}`,
                url: window.location.href // Idealmente, seria um link direto para a notícia
            };
            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    // Fallback para desktop
                    navigator.clipboard.writeText(shareData.url);
                    alert('Link da notícia copiado para a área de transferência!');
                }
            } catch (err) {
                console.error("Erro ao compartilhar:", err);
            }
        }

        openModal() { /* ... Lógica do modal ... */ }
        closeModal() { /* ... Lógica do modal ... */ }
        formatTimeAgo(isoString) { /* ... Lógica de formatação de tempo ... */ }
    }

    const app = new App();
    app.init();
});
