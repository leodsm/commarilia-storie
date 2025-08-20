document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO GLOBAL ---
    const SUPABASE_URL = 'https://apdaldrcyugyjiwpodel.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZGFsZHJjeXVneWppd3BvZGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NDc0NDAsImV4cCI6MjA3MTIyMzQ0MH0.UX0uAej52mEC3vsk-GSRHB7jNYm0N7MEN5-rBk-6e7A';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- ROTEADOR SIMPLES BASEADO EM HASH ---
    function router() {
        const viewerSection = document.getElementById('viewer-section');
        const editorSection = document.getElementById('editor-section');

        if (window.location.hash === '#editor') {
            viewerSection.classList.add('hidden');
            editorSection.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
            initEditorApp(); 
        } else {
            editorSection.classList.add('hidden');
            viewerSection.classList.remove('hidden');
            document.body.classList.remove('overflow-hidden');
            initViewerApp();
        }
    }

    // --- INICIALIZAÇÃO DO VISUALIZADOR DE STORIES (PÚBLICO) ---
    function initViewerApp() {
        if (document.body.classList.contains('viewer-initialized')) return;
        document.body.classList.add('viewer-initialized');
        document.body.classList.remove('editor-initialized');

        dayjs.extend(dayjs_plugin_relativeTime);
        dayjs.locale('pt-br');

        class ViewerApp {
            constructor() {
                this.storiesData = [];
                this.ui = new UI();
                this.storyPlayer = new StoryPlayer(
                    this.ui.getStoryPlayerDOM(),
                    () => this.storiesData
                );
            }

            async init() {
                try {
                    const { data: rawData, error } = await supabaseClient
                        .from('stories')
                        .select(`*, story_pages ( * )`)
                        .order('timestamp', { ascending: false });

                    if (error) throw error;
                    
                    this.storiesData = rawData
                        .filter(story => {
                            const storyDate = new Date(story.timestamp);
                            const now = new Date();
                            return story.status === 'published' || (story.status === 'scheduled' && storyDate <= now);
                        })
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    this.storiesData.forEach(story => {
                        if (story.story_pages) {
                            story.story_pages.sort((a, b) => a.order_index - b.order_index);
                        }
                    });

                    this.ui.renderNewsGrid(this.storiesData);
                    this.ui.initializeLazyLoading();
                    this.ui.setupEventListeners(
                        (storyIndex) => this.storyPlayer.open(storyIndex),
                        () => this.storyPlayer.closeModal()
                    );
                    
                    this.storyPlayer.buildMainSwiper();
                    feather.replace();

                } catch (error) {
                    console.error("Falha ao inicializar o visualizador:", error);
                    this.ui.displayError("Não foi possível carregar as notícias.");
                }
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
                    closeModalBtn: document.getElementById('close-modal-btn'),
                    modalOverlay: document.getElementById('story-modal-overlay'),
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

            setupEventListeners(onCardClick, onCloseModal) {
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
                
                this.dom.closeModalBtn?.addEventListener('click', onCloseModal);
                this.dom.modalOverlay?.addEventListener('click', onCloseModal);
            }
            
            getStoryPlayerDOM() {
                return {
                    viewer: document.getElementById('story-viewer'),
                    mainSwiperWrapper: document.getElementById('story-swiper-wrapper'),
                    modal: document.getElementById('story-modal'),
                    modalImage: document.getElementById('modal-image'),
                    modalTitle: document.getElementById('modal-title'),
                    modalText: document.getElementById('modal-text'),
                };
            }

            displayError(message) {
                if (this.dom.newsGrid) this.dom.newsGrid.innerHTML = `<p class="col-span-full text-center text-red-500">${message}</p>`;
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

                if (!this.mainSwiper || this.mainSwiper.destroyed) {
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
                if (this.mainSwiper && !this.mainSwiper.destroyed) {
                    this.mainSwiper.destroy(true, true);
                    this.mainSwiper = null;
                }
            }

            handleStoryChange(swiper) {
                if (this.progressTimeline) this.progressTimeline.kill();
                if (this.activeNestedSwiper && !this.activeNestedSwiper.destroyed) {
                    this.activeNestedSwiper.destroy(true, true);
                }
                
                const activeStorySlide = swiper.slides[swiper.activeIndex];
                const nestedSwiperContainer = activeStorySlide.querySelector('.swiper-container-horizontal');
                
                this.activeNestedSwiper = new Swiper(nestedSwiperContainer, {
                    allowTouchMove: false, 
                    on: {
                        init: (swiper) => this.startProgress(swiper),
                        slideChange: (swiper) => this.startProgress(swiper),
                    }
                });

                const storyContent = activeStorySlide.querySelector('.story-slide-content');
                
                let pressTimer;
                storyContent.onpointerdown = () => {
                    this.progressTimeline.pause();
                    const video = this.activeNestedSwiper.slides[this.activeNestedSwiper.activeIndex]?.querySelector('video');
                    if(video) video.pause();
                    pressTimer = setTimeout(() => {}, 200);
                };

                storyContent.onpointerup = (e) => {
                    clearTimeout(pressTimer);
                    this.progressTimeline.resume();
                    const video = this.activeNestedSwiper.slides[this.activeNestedSwiper.activeIndex]?.querySelector('video');
                    if(video) video.play();
                    
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    if (clickX < rect.width / 3) {
                        this.activeNestedSwiper.slidePrev();
                    } else {
                        this.activeNestedSwiper.slideNext();
                    }
                };
            }

            startProgress(swiper) {
                if (this.progressTimeline) this.progressTimeline.kill();

                const DURATION = 5;
                const progressBars = swiper.el.closest('.story-slide-content').querySelectorAll('.progress-bar-inner');
                
                this.progressTimeline = gsap.timeline({
                    onComplete: () => this.mainSwiper.slideNext()
                });

                progressBars.forEach((bar, index) => {
                    gsap.set(bar, { scaleX: 0 });
                    if (index < swiper.activeIndex) gsap.set(bar, { scaleX: 1 });
                });

                const currentBar = progressBars[swiper.activeIndex];
                this.progressTimeline.to(currentBar, { 
                    scaleX: 1, 
                    duration: DURATION, 
                    ease: 'none',
                    onComplete: () => {
                        if (swiper.isEnd) this.mainSwiper.slideNext();
                        else swiper.slideNext();
                    }
                });

                const allVideos = swiper.el.querySelectorAll('video');
                allVideos.forEach(v => { v.pause(); v.currentTime = 0; });
                
                const video = swiper.slides[swiper.activeIndex].querySelector('video');
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

            async shareStory(e) {
                const storyIndex = e.currentTarget.closest('.swiper-slide').dataset.storyIndex;
                const story = this.getStories()[storyIndex];
                const shareData = {
                    title: story.card_title,
                    text: `Confira: ${story.card_title}`,
                    url: window.location.href,
                };
                try {
                    if (navigator.share) await navigator.share(shareData);
                    else alert('Função de compartilhar não suportada.');
                } catch (err) {
                    console.error('Erro ao compartilhar:', err);
                }
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
            
            formatTimeAgo(isoString) {
                return dayjs(isoString).fromNow();
            }
        }
        
        const app = new ViewerApp();
        app.init();
    }

    // --- INICIALIZAÇÃO DO EDITOR DE CONTEÚDO (PAINEL) ---
    function initEditorApp() {
        if (document.body.classList.contains('editor-initialized')) return;
        document.body.classList.add('editor-initialized');
        document.body.classList.remove('viewer-initialized');

        class UppySupabase {
            constructor(uppy, options) { this.uppy = uppy; this.opts = options; this.id = 'UppySupabase'; this.type = 'uploader'; }
            install() { this.uppy.addUploader(this.upload.bind(this)); }
            uninstall() { this.uppy.removeUploader(this.upload.bind(this)); }
            async upload(fileIDs) {
                const { supabase, folder } = this.opts;
                for (const fileID of fileIDs) {
                    const file = this.uppy.getFile(fileID);
                    const fileName = `${folder}/${Date.now()}-${file.name}`;
                    this.uppy.setFileState(fileID, { progress: { uploadStarted: Date.now() } });
                    try {
                        const { error } = await supabase.storage.from('story-media').upload(fileName, file.data, { contentType: file.type, upsert: true });
                        if (error) throw error;
                        const { data: { publicUrl } } = supabase.storage.from('story-media').getPublicUrl(fileName);
                        this.uppy.setFileState(fileID, { progress: { uploadComplete: true, bytesUploaded: file.size } });
                        this.uppy.emit('upload-success', file, { uploadURL: publicUrl });
                    } catch (error) {
                        this.uppy.emit('upload-error', file, error);
                    }
                }
            }
        }
        
        const dom = {
            form: document.getElementById('post-form'),
            postId: document.getElementById('post-id'),
            saveBtn: document.getElementById('save-btn'),
            deleteBtn: document.getElementById('delete-btn'),
            addPostBtn: document.getElementById('add-post-btn'),
            storiesList: document.getElementById('stories-list'),
            pagesContainer: document.getElementById('pages-container'),
            addPageBtn: document.getElementById('add-page-btn'),
            status: document.getElementById('status'),
            scheduleContainer: document.getElementById('schedule-container'),
            previewSwiperWrapper: document.getElementById('preview-swiper-wrapper'),
        };

        let mainEditor = null;
        let pageEditors = new Map();
        let uppyInstances = new Map();
        let sortable = null;
        let swiperInstance = null;
        let currentStoryId = null;

        const initializeQuill = (containerId, placeholder, content = '') => {
            const quill = new Quill(`#${containerId}`, {
                theme: 'snow',
                placeholder: placeholder,
                modules: { toolbar: [['bold', 'italic', 'link', 'blockquote']] }
            });
            if (content) quill.root.innerHTML = content;
            return quill;
        };

        function createUppyInstance(targetId, hiddenInputId) {
            if (uppyInstances.has(targetId)) uppyInstances.get(targetId).close({ reason: 'unmount' });
            
            const uppy = new Uppy.Uppy({
                debug: false, autoProceed: true,
                restrictions: { maxNumberOfFiles: 1, allowedFileTypes: ['image/*', 'video/*'] },
            });
            uppy.use(Uppy.Dashboard, {
                inline: true, target: `#${targetId}`, proudlyDisplayPoweredByUppy: false,
                height: 150, note: 'Imagens ou vídeos (MP4)',
            });
            uppy.use(UppySupabase, { supabase: supabaseClient, folder: 'public' });

            uppy.on('upload-success', (file, response) => {
                document.getElementById(hiddenInputId).value = response.uploadURL;
                updatePreview();
            });
            
            uppyInstances.set(targetId, uppy);
        }

        async function loadStoriesList() {
            const { data, error } = await supabaseClient.from('stories').select('id, card_title, status').order('timestamp', { ascending: false });
            if (error) return dom.storiesList.innerHTML = `<p class="text-red-500 p-4">Erro ao carregar.</p>`;
            
            dom.storiesList.innerHTML = data.map(story => `
                <div class="p-3 rounded-lg hover:bg-slate-200 cursor-pointer story-item ${story.id == currentStoryId ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}" data-story-id="${story.id}">
                    <h3 class="font-semibold">${story.card_title || 'Story sem título'}</h3>
                    <p class="text-xs capitalize">${story.status}</p>
                </div>
            `).join('');
        }
        
        async function loadStoryForEdit(storyId) {
            clearEditor(false);
            currentStoryId = storyId;
            
            const { data: post, error } = await supabaseClient
                .from('stories').select(`*, story_pages ( * )`).eq('id', storyId).single();

            if (error || !post) {
                alert('Post não encontrado.');
                clearEditor();
                return;
            }

            dom.postId.value = post.id;
            document.getElementById('category').value = post.category || '';
            document.getElementById('categoryColor').value = post.category_color || '#F4A261';
            document.getElementById('cardTitle').value = post.card_title || '';
            document.getElementById('cardImage').value = post.card_image || '';
            document.getElementById('fullContentImage').value = post.full_content_image || '';
            document.getElementById('fullContentTitle').value = post.full_content_title || '';
            if (mainEditor) mainEditor.root.innerHTML = post.full_content_body || '';
            dom.status.value = post.status || 'draft';
            if (post.status === 'scheduled') {
                dom.scheduleContainer.classList.remove('hidden');
                document.getElementById('timestamp').value = post.timestamp ? post.timestamp.slice(0, 16) : '';
            } else {
                dom.scheduleContainer.classList.add('hidden');
            }

            if (post.story_pages) {
                post.story_pages.sort((a, b) => a.order_index - b.order_index).forEach(page => addPageField(page));
            }
            
            dom.deleteBtn.classList.remove('hidden');
            updatePreview();
            loadStoriesList();
        }

        function clearEditor(reloadList = true) {
            dom.form.reset();
            dom.postId.value = '';
            if (reloadList) currentStoryId = null;
            
            dom.pagesContainer.innerHTML = '';
            pageEditors.clear();
            uppyInstances.forEach(uppy => uppy.close({ reason: 'unmount' }));
            uppyInstances.clear();
            
            if (mainEditor) mainEditor.root.innerHTML = '';
            
            createUppyInstance('uppy-card-image', 'cardImage');
            createUppyInstance('uppy-full-content-image', 'fullContentImage');
            
            if (sortable) sortable.destroy();
            sortable = new Sortable(dom.pagesContainer, { animation: 150, ghostClass: 'sortable-ghost', onEnd: updatePreview });
            
            dom.deleteBtn.classList.add('hidden');
            dom.scheduleContainer.classList.add('hidden');
            updatePreview();
            if (reloadList) loadStoriesList();
        }

        function addPageField(pageData = {}) {
            const pageId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const editorId = `editor-${pageId}`;
            const uppyId = `uppy-${pageId}`;
            const hiddenInputId = `media-url-${pageId}`;

            const pageDiv = document.createElement('div');
            pageDiv.className = 'p-4 bg-slate-50 rounded-lg border space-y-4 page-item';
            pageDiv.dataset.pageId = pageId;
            pageDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-bold text-gray-500">Página</span>
                    <button type="button" class="remove-page-btn text-red-500 hover:text-red-700 font-bold">Remover</button>
                </div>
                <div>
                    <label class="font-semibold text-sm text-gray-700 block mb-1">Mídia da Página</label>
                    <div id="${uppyId}"></div>
                    <input type="hidden" class="page-media-url" id="${hiddenInputId}" value="${pageData.media_url || ''}">
                </div>
                <div>
                    <label class="font-semibold text-sm text-gray-700 block mb-1">Texto da Página</label>
                    <div id="${editorId}" class="page-editor-container"></div>
                </div>
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="link-${pageId}" class="page-show-link h-4 w-4 rounded" ${pageData.show_full_link !== false ? 'checked' : ''}>
                    <label for="link-${pageId}" class="text-sm">Mostrar link para Matéria</label>
                </div>`;
            dom.pagesContainer.appendChild(pageDiv);
            
            const newEditor = initializeQuill(editorId, 'Texto da página...', pageData.title || '');
            newEditor.on('text-change', updatePreview);
            pageEditors.set(editorId, newEditor);

            createUppyInstance(uppyId, hiddenInputId);
            updatePreview();
        }

        function updatePreview() {
            const pages = Array.from(dom.pagesContainer.querySelectorAll('.page-item')).map(el => {
                const pageId = el.dataset.pageId;
                const mediaUrl = el.querySelector(`#media-url-${pageId}`).value;
                const editor = pageEditors.get(`editor-${pageId}`);
                const title = editor ? editor.root.innerHTML : '';
                return { media_url: mediaUrl, title: title, media_type: mediaUrl.includes('.mp4') ? 'video' : 'image' };
            });

            if (pages.length === 0 || pages.every(p => !p.media_url)) {
                dom.previewSwiperWrapper.innerHTML = `<div class="swiper-slide flex items-center justify-center text-white p-4 text-center"><p>Adicione páginas e mídias.</p></div>`;
                if (swiperInstance) swiperInstance.destroy(true, true);
                swiperInstance = new Swiper('.story-preview-container .swiper-container', { navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' } });
                return;
            }

            dom.previewSwiperWrapper.innerHTML = pages.map(page => `
                <div class="swiper-slide">
                    ${page.media_url ? (page.media_type === 'video'
                        ? `<video src="${page.media_url}" class="absolute inset-0 w-full h-full object-cover" muted loop autoplay playsinline></video>`
                        : `<img src="${page.media_url}" class="absolute inset-0 w-full h-full object-cover" />`
                    ) : '<div class="w-full h-full bg-black"></div>'}
                    <div class="absolute bottom-24 left-0 p-6 text-white z-10 w-full">
                        <div class="text-2xl font-bold leading-tight text-shadow">${page.title}</div>
                    </div>
                </div>
            `).join('');

            if (swiperInstance) swiperInstance.destroy(true, true);
            swiperInstance = new Swiper('.story-preview-container .swiper-container', {
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            });
        }
        
        async function savePost() {
            const id = dom.postId.value;
            const statusValue = dom.status.value;
            let timestampValue = new Date().toISOString();
            if (statusValue === 'scheduled') {
                const localDate = document.getElementById('timestamp').value;
                if (!localDate) return alert('Por favor, defina uma data para agendamento.');
                timestampValue = new Date(localDate).toISOString();
            }

            const pagesData = Array.from(dom.pagesContainer.querySelectorAll('.page-item')).map((el, index) => {
                const pageId = el.dataset.pageId;
                const mediaUrl = el.querySelector('.page-media-url').value;
                const editor = pageEditors.get(`editor-${pageId}`);
                const title = editor ? editor.root.innerHTML : '';
                const showLink = el.querySelector('.page-show-link').checked;
                return { media_url: mediaUrl, title, show_full_link: showLink, media_type: mediaUrl.includes('.mp4') ? 'video' : 'image', order_index: index };
            }).filter(p => p.media_url || p.title.trim() !== '<p><br></p>');

            const storyData = {
                card_title: document.getElementById('cardTitle').value,
                card_image: document.getElementById('cardImage').value,
                category: document.getElementById('category').value,
                category_color: document.getElementById('categoryColor').value,
                full_content_title: document.getElementById('fullContentTitle').value,
                full_content_image: document.getElementById('fullContentImage').value,
                full_content_body: mainEditor.root.innerHTML,
                status: statusValue,
                timestamp: timestampValue,
            };
            
            if (id) storyData.id = id;

            dom.saveBtn.textContent = 'Salvando...';
            dom.saveBtn.disabled = true;

            const { data: storyResult, error: storyError } = await supabaseClient.from('stories').upsert(storyData).select().single();
            
            dom.saveBtn.textContent = 'Salvar';
            dom.saveBtn.disabled = false;

            if (storyError) { alert(storyError.message); return; }

            await supabaseClient.from('story_pages').delete().match({ story_id: storyResult.id });

            if (pagesData.length > 0) {
                const pagesToInsert = pagesData.map(p => ({ ...p, story_id: storyResult.id }));
                const { error: pagesError } = await supabaseClient.from('story_pages').insert(pagesToInsert);
                if (pagesError) { alert(pagesError.message); return; }
            }

            alert('Post salvo com sucesso!');
            loadStoryForEdit(storyResult.id);
        }

        async function deletePost() {
            const id = dom.postId.value;
            if (!id || !confirm('Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.')) return;
            
            await supabaseClient.from('story_pages').delete().match({ story_id: id });
            const { error } = await supabaseClient.from('stories').delete().match({ id });
            
            if (error) { alert(error.message); return; }
            
            alert('Post excluído com sucesso.');
            clearEditor();
        }

        // --- EVENT LISTENERS ---
        dom.addPostBtn.addEventListener('click', () => clearEditor(true));
        dom.saveBtn.addEventListener('click', savePost);
        dom.deleteBtn.addEventListener('click', deletePost);
        dom.addPageBtn.addEventListener('click', () => addPageField());
        dom.status.addEventListener('change', () => {
            dom.scheduleContainer.classList.toggle('hidden', dom.status.value !== 'scheduled');
        });
        dom.storiesList.addEventListener('click', (e) => {
            const storyItem = e.target.closest('.story-item');
            if (storyItem) loadStoryForEdit(storyItem.dataset.storyId);
        });
        
        dom.pagesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-page-btn')) {
                const pageItem = e.target.closest('.page-item');
                if (pageItem) {
                    const pageId = pageItem.dataset.pageId;
                    const editorId = `editor-${pageId}`;
                    const uppyId = `uppy-${pageId}`;
                    
                    pageItem.remove();
                    pageEditors.delete(editorId);
                    const uppyInstance = uppyInstances.get(uppyId);
                    if (uppyInstance) uppyInstance.close({ reason: 'unmount' });
                    uppyInstances.delete(uppyId);
                    updatePreview();
                }
            }
        });

        dom.form.addEventListener('input', updatePreview);
        
        if (!mainEditor) {
            mainEditor = initializeQuill('editor-container', 'Corpo da matéria...');
            mainEditor.on('text-change', updatePreview);
        }
        
        clearEditor(true);
        feather.replace();
    }

    // --- PONTO DE ENTRADA DA APLICAÇÃO ---
    router();
    window.addEventListener('hashchange', router);
});
