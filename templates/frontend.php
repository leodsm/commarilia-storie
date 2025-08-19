<?php
// Template for front-end rendering of ComMarília Stories
?>

<aside id="side-menu" class="fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-[70]">
    <div class="p-6 flex justify-between items-center border-b">
        <div class="text-xl font-black">
            <span class="logo-text-com">Com</span><span class="logo-text-marilia">Marília.</span>
        </div>
        <button id="close-menu-btn" class="text-gray-500 hover:text-gray-800" aria-label="Fechar menu">
            <i data-feather="x" class="w-6 h-6"></i>
        </button>
    </div>
    <nav class="p-6">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Categorias</h2>
        <a href="#" class="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><i data-feather="home" class="w-5 h-5"></i><span>Início</span></a>
        <a href="#" class="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><i data-feather="globe" class="w-5 h-5"></i><span>Mundo</span></a>
        <a href="#" class="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><i data-feather="trending-up" class="w-5 h-5"></i><span>Economia</span></a>
        <a href="#" class="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><i data-feather="award" class="w-5 h-5"></i><span>Esportes</span></a>
        <a href="#" class="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><i data-feather="at-sign" class="w-5 h-5"></i><span>Contato</span></a>
    </nav>
</aside>
<div id="menu-overlay" class="fixed inset-0 bg-black bg-opacity-60 z-[60] hidden backdrop-blur-sm"></div>

<header class="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-40">
    <div class="container mx-auto px-4 py-4 flex justify-between items-center max-w-5xl">
        <button id="menu-btn" class="text-gray-600 hover:text-gray-900 focus:outline-none" aria-label="Abrir menu">
            <i data-feather="menu" class="w-6 h-6"></i>
        </button>
        <div class="text-2xl font-black">
            <span class="logo-text-com">Com</span><span class="logo-text-marilia">Marília.</span>
        </div>
        <button class="text-gray-600 hover:text-gray-900 focus:outline-none" aria-label="Perfil do usuário">
            <i data-feather="user" class="w-6 h-6"></i>
        </button>
    </div>
</header>

<main class="container mx-auto px-4 py-8 max-w-5xl">
    <h1 class="text-3xl font-bold mb-6 text-gray-900">Últimas Notícias</h1>
    <div id="news-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
</main>

<div id="story-viewer" class="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="story-title-viewer">
    <div id="story-container" class="relative w-full h-full sm:max-w-[414px] sm:h-[90vh] sm:max-h-[896px] bg-gray-900 sm:rounded-xl overflow-hidden shadow-2xl">
        <div id="story-progress-container" class="absolute top-2 left-0 w-full flex gap-1 px-2 z-20"></div>
        <div id="story-media-container" class="w-full h-full absolute inset-0"></div>
        <header class="absolute top-8 left-0 w-full p-4 flex items-center gap-3 z-20">
            <img id="story-publisher-logo" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZHRoPSI0MCIgdmlld0JveD0iMCAwIDEwMCAxMDAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiByeD0iNTAiIGZpbGw9IiNGRkZGRkYiLz48dGV4dCB4PSI1MCIgeT0iNjgiIGZvbnQtZmFtaWx5PSJQb3BwaW5zLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQwIiBmb250LXdlaWdodD0iOTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj48dHNwYW4gZmlsbD0iI0Y0QTkyMSI+QzwvdHNwYW4+PHRzcGFuIGZpbGw9IiMxRDM1NTciPk08L3RzcGFuPjwvdGV4dD48L3N2Zz4=" class="w-10 h-10 rounded-full border-2 border-white/50" alt="Logo do ComMarília">
            <div>
                <div id="story-publisher-name" class="font-bold text-white text-sm">ComMarília</div>
                <div id="story-time" class="text-white/80 text-xs"></div>
            </div>
        </header>
        <div class="absolute bottom-24 left-0 p-6 text-white z-10 w-full">
            <div id="story-title-viewer" class="text-2xl font-bold leading-tight text-shadow"></div>
        </div>
        <div id="prev-story-area" class="absolute left-0 top-0 h-full w-1/3 cursor-pointer z-30" aria-label="Página anterior do story"></div>
        <div id="next-story-area" class="absolute right-0 top-0 h-full w-2/3 cursor-pointer z-30" aria-label="Próxima página do story"></div>
        <div class="absolute top-8 right-4 flex items-center gap-2 z-30">
            <button id="share-story-btn" class="text-white bg-black/30 rounded-full p-2" aria-label="Compartilhar story">
                <i data-feather="share-2" class="w-6 h-6"></i>
            </button>
            <button id="close-story-btn" class="text-white bg-black/30 rounded-full p-2" aria-label="Fechar story">
                <i data-feather="x" class="w-6 h-6"></i>
            </button>
        </div>
        <div id="full-story-swipe-up" class="absolute bottom-10 left-0 w-full z-30 p-6 text-center cursor-pointer">
            <div class="inline-flex flex-col items-center gap-1 text-white animate-bounce">
                <i data-feather="chevron-up" class="w-6 h-6"></i>
                <span class="font-semibold text-sm">Matéria Completa</span>
            </div>
        </div>
    </div>
</div>

<div id="story-modal" class="fixed inset-0 z-[80] flex items-end sm:items-start sm:pt-12 justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div id="story-modal-overlay" class="absolute inset-0 bg-black bg-opacity-50"></div>
    <div id="story-modal-content" class="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
        <header class="p-6 border-b flex justify-between items-start">
            <div>
                <h2 id="modal-title" class="text-2xl font-bold leading-tight mb-2"></h2>
            </div>
            <button id="close-modal-btn" class="text-gray-500 hover:text-gray-900" aria-label="Fechar matéria">
                <i data-feather="x" class="w-6 h-6"></i>
            </button>
        </header>
        <div>
            <img id="modal-image" class="w-full max-h-[400px] object-cover" src="" alt="Imagem da matéria completa">
            <div id="modal-text" class="prose p-6 max-w-none"></div>
        </div>
    </div>
</div>

