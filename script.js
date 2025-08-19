document.addEventListener('DOMContentLoaded', () => {
    
    // Função para formatar o tempo decorrido desde a postagem
    function formatTimeAgo(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        const now = new Date();
        const seconds = Math.round((now - date) / 1000);
        const minutes = Math.round(seconds / 60);
        const hours = Math.round(minutes / 60);
        const days = Math.round(hours / 24);

        if (seconds < 60) return `agora mesmo`;
        if (minutes < 60) return `${minutes} min atrás`;
        if (hours < 24) return `${hours}h atrás`;
        return `${days}d atrás`;
    }

    // Função para converter URL do YouTube para URL de embed
    function getYoutubeEmbedUrl(url) {
        if (!url) return null;
        let videoId = null;
        const shortsRegex = /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/;
        const watchRegex = /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/;
        
        let match = url.match(shortsRegex);
        if (match) {
            videoId = match[1];
        } else {
            match = url.match(watchRegex);
            if (match) {
                videoId = match[1];
            }
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&playsinline=1&showinfo=0&modestbranding=1`;
        }
        return null;
    }

    // Função principal que inicializa a aplicação após carregar os dados
    async function initializeApp() {
        try {
            const response = await fetch('posts.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const storiesData = await response.json();
            
            // Inicializa os componentes da UI com os dados carregados
            setupUI(storiesData);

        } catch (error) {
            console.error("Não foi possível carregar os dados das notícias:", error);
            const newsGrid = document.getElementById('news-grid');
            if(newsGrid) {
                newsGrid.innerHTML = `<p class="col-span-full text-center text-red-500">Erro ao carregar notícias. Tente novamente mais tarde.</p>`;
            }
        }
    }

    // Função para configurar a interface do usuário
    function setupUI(storiesData) {
        feather.replace();

        // --- Renderização dos Cards de Notícias ---
        const newsGrid = document.getElementById('news-grid');
        if (!newsGrid) return;
        
        newsGrid.innerHTML = storiesData.map((story, index) => `
            <div class="news-card relative rounded-xl shadow-lg overflow-hidden cursor-pointer h-[480px] group" data-story-index="${index}">
                <img src="${story.cardImage}" alt="${story.cardTitle}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-in-out">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div class="absolute bottom-0 left-0 p-5 text-white z-10">
                    <span class="text-white text-xs font-bold px-3 py-1 rounded-full" style="background-color: ${story.categoryColor};">${story.category}</span>
                    <h2 class="text-xl font-bold mt-2 leading-tight text-shadow">${story.cardTitle}</h2>
                </div>
            </div>
        `).join('');

        // --- Instanciação do Player de Story ---
        const player = new StoryPlayer(storiesData, {
            viewerId: 'story-viewer',
            containerId: 'story-container',
            mediaContainerId: 'story-media-container',
            titleId: 'story-title',
            timeId: 'story-time',
            indicatorsContainerId: 'story-indicators-container',
            closeBtnId: 'close-story-btn',
            nextAreaId: 'next-story-area',
            prevAreaId: 'prev-story-area',
            swipeUpId: 'full-story-swipe-up',
            modalId: 'story-modal',
            modalOverlayId: 'story-modal-overlay',
            closeModalBtnId: 'close-modal-btn',
            modalImageId: 'modal-image',
            modalTitleId: 'modal-title',
            modalTextId: 'modal-text',
        });

        // --- Event Listeners ---
        newsGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.news-card');
            if (card) {
                player.open(parseInt(card.dataset.storyIndex));
            }
        });

        const menuBtn = document.getElementById('menu-btn');
        const closeMenuBtn = document.getElementById('close-menu-btn');
        const sideMenu = document.getElementById('side-menu');
        const menuOverlay = document.getElementById('menu-overlay');
        
        const toggleMenu = () => {
            sideMenu.classList.toggle('open');
            menuOverlay.classList.toggle('hidden');
        };

        if(menuBtn) menuBtn.addEventListener('click', toggleMenu);
        if(closeMenuBtn) closeMenuBtn.addEventListener('click', toggleMenu);
        if(menuOverlay) menuOverlay.addEventListener('click', toggleMenu);
    }

    // Classe do Player de Story
    class StoryPlayer {
        constructor(storiesData, config) {
            this.storiesData = storiesData;
            this.config = config;
            
            this.dom = {
                viewer: document.getElementById(config.viewerId),
                container: document.getElementById(config.containerId),
                mediaContainer: document.getElementById(config.mediaContainerId),
                title: document.getElementById(config.titleId),
                time: document.getElementById(config.timeId),
                indicatorsContainer: document.getElementById(config.indicatorsContainerId),
                modal: document.getElementById(config.modalId),
                modalOverlay: document.getElementById(config.modalOverlayId),
                modalImage: document.getElementById(config.modalImageId),
                modalTitle: document.getElementById(config.modalTitleId),
                modalText: document.getElementById(config.modalTextId),
            };

            this.state = {
                currentStoryIndex: 0,
                currentPageIndex: 0,
            };
            
            this.init();
        }

        init() {
            document.getElementById(this.config.closeBtnId)?.addEventListener('click', () => this.close());
            document.getElementById(this.config.nextAreaId)?.addEventListener('click', () => this.nextPage());
            document.getElementById(this.config.prevAreaId)?.addEventListener('click', () => this.prevPage());
            
            document.getElementById(this.config.swipeUpId)?.addEventListener('click', () => this.openModal());
            document.getElementById(this.config.closeModalBtnId)?.addEventListener('click', () => this.closeModal());
            this.dom.modalOverlay?.addEventListener('click', () => this.closeModal());
        }

        open(storyIndex) {
            this.state.currentStoryIndex = storyIndex;
            this.state.currentPageIndex = 0;
            this.buildPageIndicators();
            this.updatePage();
            this.dom.viewer?.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        close() {
            this.dom.viewer?.classList.remove('open');
            document.body.style.overflow = '';
            this.dom.container?.classList.remove('show-cues');
            this.dom.mediaContainer.innerHTML = ''; // Limpa a mídia para parar vídeos
        }

        updatePage() {
            const story = this.storiesData[this.state.currentStoryIndex];
            if (!story || !story.pages) return;
            const page = story.pages[this.state.currentPageIndex];
            if (!page) return;
            
            // --- Lógica de Mídia (Imagem ou Vídeo) ---
            this.dom.mediaContainer.innerHTML = ''; // Limpa a mídia anterior
            const embedUrl = getYoutubeEmbedUrl(page.mediaUrl);
            if (embedUrl) {
                const iframe = document.createElement('iframe');
                iframe.src = embedUrl;
                iframe.className = "w-full h-full";
                iframe.setAttribute('frameborder', '0');
                iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                iframe.setAttribute('allowfullscreen', '');
                this.dom.mediaContainer.appendChild(iframe);
            } else { // Padrão para imagem
                const img = document.createElement('img');
                img.src = page.mediaUrl;
                img.className = "w-full h-full object-cover";
                img.alt = "Imagem do story";
                this.dom.mediaContainer.appendChild(img);
            }

            this.dom.title.innerHTML = page.title;
            this.dom.time.textContent = formatTimeAgo(story.timestamp);

            this.updatePageIndicators();

            this.dom.container?.classList.remove('show-cues');
            void this.dom.container?.offsetWidth;  
            this.dom.container?.classList.add('show-cues');
        }

        nextPage() {
            const story = this.storiesData[this.state.currentStoryIndex];
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

        buildPageIndicators() {
            if (!this.dom.indicatorsContainer) return;
            this.dom.indicatorsContainer.innerHTML = '';
            this.storiesData[this.state.currentStoryIndex].pages.forEach(() => {
                const indicator = document.createElement('div');
                indicator.className = 'story-indicator';
                this.dom.indicatorsContainer.appendChild(indicator);
            });
        }

        updatePageIndicators() {
            const indicators = this.dom.indicatorsContainer?.querySelectorAll('.story-indicator');
            indicators?.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === this.state.currentPageIndex);
            });
        }

        openModal() {
            const content = this.storiesData[this.state.currentStoryIndex].fullContent;
            if (!content) return;
            this.dom.modalImage.src = content.image;
            this.dom.modalTitle.textContent = content.title;
            this.dom.modalText.innerHTML = content.body; 
            this.dom.modal?.classList.add('open');
        }

        closeModal() {
            this.dom.modal?.classList.remove('open');
        }
    }

    // Inicia a aplicação
    initializeApp();
});
