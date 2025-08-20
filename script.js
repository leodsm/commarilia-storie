document.addEventListener('DOMContentLoaded', () => {
    // Configuração do Day.js para o português do Brasil
    dayjs.extend(dayjs_plugin_relativeTime);
    dayjs.locale('pt-br');

    class App {
        constructor() {
            this.storiesData = [];
            this.api = new Api();
            this.ui = new UI();
            this.storyPlayer = new StoryPlayer(
                this.ui.getStoryPlayerDOM(),
                () => this.storiesData
            );
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
                
                // Renderiza a estrutura inicial do Swiper
                this.storyPlayer.buildMainSwiper();

                feather.replace();

            } catch (error) {
                console.error("Falha ao inicializar a aplicação:", error);
                this.ui.displayError("Não foi possível carregar as notícias. Tente novamente mais tarde.");
            }
        }
    }

    class Api {
        constructor() {
            const SUPABASE_URL = 'https://apdaldrcyugyjiwpodel.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZGFsZHJjeXVneWppd3BvZGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NDc0NDAsImV4cCI6MjA3MTIyMzQ0MH0.UX0uAej52mEC3vsk-GSRHB7jNYm0N7MEN5-rBk-6e7A';
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        async fetchPosts() {
            const { data, error } = await this.supabase
                .from('stories')
                .select(`*, story_pages ( * )`)
                .order('timestamp', { ascending: false });

            if (error) {
                throw new Error(`Erro ao buscar dados do Supabase: ${error.message}`);
            }
            
            data.forEach(story => {
                if (story.story_pages) {
                    story.story_pages.sort((a, b) => a.order_index - b.order_index);
                }
            });
            return data;
        }
    }

    class UI {
        // ... (A classe UI permanece praticamente a mesma, apenas o getStoryPlayerDOM é atualizado)
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
                <div class="news-card relative rounded-xl shadow-lg overflow-hidden cursor-pointer h-[480px] group" data-story-index="${index}" role="button" tabindex="0" aria-label="Abrir story: ${story.card_title}">
                    <img data-src="${story.card_image}" alt="${story.card_title}" class="lazy w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-in-out">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div class="absolute bottom-0 left-0 p-5 text-white z-10">
                        <span class="text-white text-xs font-bold px-3 py-1 rounded-full" style="background-color: ${story.category_color};">${story.category}</span>
                        <h2 class="text-xl font-bold mt-2 leading-tight text-shadow">${story.card_title}</h2>
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
                mainSwiperWrapper: document.getElementById('story-swiper-wrapper'),
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
        constructor(dom, getStoriesCallback) {
            this.dom = dom;
            this.getStories = getStoriesCallback;
            this.mainSwiper = null;
            this.activeNestedSwiper = null;
            this.progressTimeline = null;
            this.isMuted = true;
        }

        buildMainSwiper() {
            const stories = this.getStories();
            this.dom.mainSwiperWrapper.innerHTML = stories.map((story, index) => `
                <div class="swiper-slide" data-story-index="${index}">
                    <div class="story-slide-content">
                        <!-- Conteúdo do Story (cabeçalho, etc.) -->
                        <header class="absolute top-8 left-0 right-0 w-full px-4 flex justify-between items-center z-20">
                            <div class="flex items-center gap-3">
                                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZHRoPSI0MCIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiByeD0iNTAiIGZpbGw9IiNGRkZGRkYiLz48dGV4dCB4PSI1MCIgeT0iNjgiIGZvbnQtZmFtaWx5PSJQb3BwaW5zLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQwIiBmb250LXdlaWdodD0iOTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj48dHNwYW4gZmlsbD0iI0Y0QTkyMSI+QzwvdHNwYW4+PHRzcGFuIGZpbGw9IiMxRDM1NTciPk08L3RzcGFuPjwvdGV4dD48L3N2Zz4=" class="w-10 h-10 rounded-full border-2 border-white/50">
                                <div>
                                    <div class="font-bold text-white text-sm">ComMarília</div>
                                    <div class="story-time text-white/80 text-xs">${this.formatTimeAgo(story.timestamp)}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button class="mute-story-btn text-white bg-black/30 rounded-full p-2 hidden"><i data-feather="volume-2" class="w-6 h-6"></i></button>
                                <button class="share-story-btn text-white bg-black/30 rounded-full p-2"><i data-feather="share-2" class="w-6 h-6"></i></button>
                                <button class="close-story-btn text-white bg-black/30 rounded-full p-2"><i data-feather="x" class="w-6 h-6"></i></button>
                            </div>
                        </header>
                        <div class="story-progress-container absolute top-2 left-0 w-full flex gap-1 px-2 z-20">
                            ${story.story_pages.map(() => `<div class="progress-bar"><div class="progress-bar-inner"></div></div>`).join('')}
                        </div>
                        
                        <!-- Swiper Aninhado (Horizontal - para páginas do story) -->
                        <div class="swiper-container-horizontal w-full h-full">
                            <div class="swiper-wrapper">
                                ${story.story_pages.map(page => `
                                    <div class="swiper-slide">
                                        ${page.media_type === 'video'
                                            ? `<video src="${page.media_url}" class="w-full h-full object-cover" playsinline loop></video>`
                                            : `<img src="${page.media_url}" class="w-full h-full object-cover" />`
                                        }
                                        <div class="absolute bottom-24 left-0 p-6 text-white z-10 w-full">
                                            <div class="text-2xl font-bold leading-tight text-shadow">${page.title}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                         <div class="full-story-swipe-up absolute bottom-10 left-0 w-full z-30 p-6 text-center cursor-pointer ${story.story_pages.some(p => p.show_full_link) ? '' : 'hidden'}">
                            <div class="inline-flex flex-col items-center gap-1 text-white animate-bounce"><i data-feather="chevron-up" class="w-6 h-6"></i><span class="font-semibold text-sm">Matéria Completa</span></div>
                        </div>
                    </div>
                </div>
            `).join('');
            feather.replace();
            this.setupGlobalEventListeners();
        }

        setupGlobalEventListeners() {
            document.querySelectorAll('.close-story-btn').forEach(btn => btn.addEventListener('click', () => this.close()));
            document.querySelectorAll('.share-story-btn').forEach(btn => btn.addEventListener('click', (e) => this.shareStory(e)));
            document.querySelectorAll('.mute-story-btn').forEach(btn => btn.addEventListener('click', (e) => this.toggleMute(e)));
            document.querySelectorAll('.full-story-swipe-up').forEach(btn => btn.addEventListener('click', (e) => this.openModal(e)));
        }

        open(storyIndex) {
            this.dom.viewer.classList.add('open');
            document.body.style.overflow = 'hidden';

            if (!this.mainSwiper) {
                this.mainSwiper = new Swiper('.swiper-container-vertical', {
                    direction: 'vertical',
                    initialSlide: storyIndex,
                    on: {
                        init: (swiper) => this.handleStoryChange(swiper),
                        slideChange: (swiper) => this.handleStoryChange(swiper),
                    },
                });
            } else {
                this.mainSwiper.slideTo(storyIndex, 0);
            }
        }

        close() {
            this.dom.viewer.classList.remove('open');
            document.body.style.overflow = '';
            if (this.progressTimeline) this.progressTimeline.kill();
            if (this.activeNestedSwiper) {
                 const video = this.activeNestedSwiper.slides[this.activeNestedSwiper.activeIndex]?.querySelector('video');
                 if(video) video.pause();
            }
            this.mainSwiper.destroy(true, true);
            this.mainSwiper = null;
        }

        handleStoryChange(swiper) {
            if (this.progressTimeline) this.progressTimeline.kill();
            
            const activeStorySlide = swiper.slides[swiper.activeIndex];
            const nestedSwiperContainer = activeStorySlide.querySelector('.swiper-container-horizontal');
            
            this.activeNestedSwiper = new Swiper(nestedSwiperContainer, {
                // Bloqueia o swipe horizontal para usar as áreas de clique
                allowTouchMove: false, 
                on: {
                    init: (swiper) => this.startProgress(swiper),
                    slideChange: (swiper) => this.startProgress(swiper),
                }
            });

            // Adiciona listeners para as áreas de clique (tap)
            const storyContent = activeStorySlide.querySelector('.story-slide-content');
            storyContent.addEventListener('pointerdown', (e) => {
                this.progressTimeline.pause();
                const video = this.activeNestedSwiper.slides[this.activeNestedSwiper.activeIndex]?.querySelector('video');
                if(video) video.pause();
            });
            storyContent.addEventListener('pointerup', (e) => {
                this.progressTimeline.resume();
                const video = this.activeNestedSwiper.slides[this.activeNestedSwiper.activeIndex]?.querySelector('video');
                if(video) video.play();
            });
            storyContent.addEventListener('click', (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                if (clickX < rect.width / 3) {
                    this.activeNestedSwiper.slidePrev();
                } else {
                    this.activeNestedSwiper.slideNext();
                }
            });
        }

        startProgress(swiper) {
            if (this.progressTimeline) this.progressTimeline.kill();

            const DURATION = 5; // 5 segundos por página
            const progressBars = swiper.el.closest('.story-slide-content').querySelectorAll('.progress-bar-inner');
            
            this.progressTimeline = gsap.timeline({
                onComplete: () => this.mainSwiper.slideNext()
            });

            progressBars.forEach((bar, index) => {
                gsap.set(bar, { scaleX: 0 });
                if (index < swiper.activeIndex) {
                    gsap.set(bar, { scaleX: 1 });
                }
            });

            const currentBar = progressBars[swiper.activeIndex];
            this.progressTimeline.to(currentBar, { 
                scaleX: 1, 
                duration: DURATION, 
                ease: 'none',
                onComplete: () => swiper.slideNext()
            });

            // Lógica de vídeo
            const allVideos = swiper.el.querySelectorAll('video');
            allVideos.forEach(v => { v.pause(); v.currentTime = 0; });
            
            const activeSlide = swiper.slides[swiper.activeIndex];
            const video = activeSlide.querySelector('video');
            const muteBtn = swiper.el.closest('.story-slide-content').querySelector('.mute-story-btn');
            
            muteBtn.classList.toggle('hidden', !video);
            if (video) {
                video.muted = this.isMuted;
                video.play().catch(e => console.error("Video play failed:", e));
                this.updateMuteButton(muteBtn);
            }
        }
        
        toggleMute(e) {
            this.isMuted = !this.isMuted;
            const video = this.activeNestedSwiper.slides[this.activeNestedSwiper.activeIndex]?.querySelector('video');
            if (video) video.muted = this.isMuted;
            this.updateMuteButton(e.currentTarget);
        }

        updateMuteButton(button) {
            const icon = this.isMuted ? 'volume-x' : 'volume-2';
            button.innerHTML = `<i data-feather="${icon}" class="w-6 h-6"></i>`;
            feather.replace();
        }

        shareStory(e) {
            const storyIndex = e.currentTarget.closest('.swiper-slide').dataset.storyIndex;
            const story = this.getStories()[storyIndex];
            // ... (lógica de compartilhamento)
        }

        openModal(e) {
            const storyIndex = e.currentTarget.closest('.swiper-slide').dataset.storyIndex;
            const story = this.getStories()[storyIndex];
            if (!story) return;
            this.dom.modalImage.src = story.full_content_image || '';
            this.dom.modalTitle.textContent = story.full_content_title || '';
            this.dom.modalText.innerHTML = story.full_content_body || '';
            this.dom.modal.classList.add('open');
            if(this.progressTimeline) this.progressTimeline.pause();
        }

        closeModal() {
            this.dom.modal.classList.remove('open');
            if(this.progressTimeline) this.progressTimeline.resume();
        }
        
        // Função atualizada com Day.js
        formatTimeAgo(isoString) {
            return dayjs(isoString).fromNow();
        }
    }

    const app = new App();
    app.init();
});
