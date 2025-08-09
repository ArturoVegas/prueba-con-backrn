class CubariReader {
  constructor() {
    this.currentUser = null;
    this.currentManga = null;
    this.currentChapter = null;
    this.images = [];
    this.currentImageIndex = 0;
    this.availableChapters = [];
    this.readingMode = 'vertical';
    this.fitMode = 'fit-width';
    this.spacing = 10;
    this.isUIVisible = false;
    this.isBarVisible = false;
    this.autoHideTimer = null;

    this.initializeElements();
    this.setupEventListeners();
    this.loadUserSettings();
    this.loadChapterFromURL();
  }

  initializeElements() {
    this.readerContainer = document.getElementById('reader-container');
    this.readerControls = document.getElementById('reader-controls');
    this.readerNavigation = document.getElementById('reader-navigation');
    this.readerInfo = document.getElementById('reader-info');
    this.toggleControls = document.getElementById('toggle-controls');
    this.clickOverlay = document.getElementById('click-overlay');
    this.progressBar = document.getElementById('progress-bar');
    this.commentsSection = document.getElementById('comments-section');
    this.loadingIndicator = document.getElementById('reader-loading');
    this.chapterTitle = document.getElementById('chapter-title');
    this.chapterProgress = document.getElementById('chapter-progress');
    this.zoomLevelSpan = document.getElementById('zoom-level');
    this.spacingSlider = document.getElementById('spacing-slider');
    this.navPrevChapter = document.getElementById('nav-prev-chapter');
    this.navPrevPage = document.getElementById('nav-prev-page');
    this.navBackManga = document.getElementById('nav-back-manga');
    this.navNextPage = document.getElementById('nav-next-page');
    this.navNextChapter = document.getElementById('nav-next-chapter');
  }

  setupEventListeners() {
    if (this.toggleControls) {
      this.toggleControls.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleEngrane();
      });
    }

    document.addEventListener('mousemove', () => this.showBar());
    document.addEventListener('touchstart', () => this.showBar());

    document.addEventListener('click', (e) => {
      if (
        this.isUIVisible &&
        this.readerControls &&
        !this.readerControls.contains(e.target) &&
        this.toggleControls &&
        !this.toggleControls.contains(e.target)
      ) {
        this.hideEngrane();
      }
    });

    document.querySelectorAll('[data-mode]').forEach(btn =>
      btn.addEventListener('click', (e) => this.changeReadingMode(e.target.dataset.mode))
    );

    document.querySelectorAll('[data-fit]').forEach(btn =>
      btn.addEventListener('click', (e) => this.changeFitMode(e.target.dataset.fit))
    );

    if (this.spacingSlider)
      this.spacingSlider.addEventListener('input', (e) => this.changeSpacing(e.target.value));

    if (this.navPrevChapter) this.navPrevChapter.addEventListener('click', () => this.previousChapter());
    if (this.navPrevPage) this.navPrevPage.addEventListener('click', () => this.previousPage());
    if (this.navNextPage) this.navNextPage.addEventListener('click', () => this.nextPage());
    if (this.navNextChapter) this.navNextChapter.addEventListener('click', () => this.nextChapter());

    this.setupBackButton();
    this.setupClickOverlay();

    document.removeEventListener('keydown', this.handleKeyPress);
    document.addEventListener('keydown', this.handleKeyPress.bind(this));

    window.addEventListener('scroll', () => this.updateProgress());
    window.addEventListener('resize', () => this.adjustLayout());
  }

  toggleEngrane() {
    this.isUIVisible = !this.isUIVisible;
    this.readerControls?.classList.toggle('visible', this.isUIVisible);
    this.toggleControls?.classList.toggle('active', this.isUIVisible);
  }

  hideEngrane() {
    this.isUIVisible = false;
    this.readerControls?.classList.remove('visible');
    this.toggleControls?.classList.remove('active');
  }

  showBar() {
    if (this.isBarVisible) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = setTimeout(() => this.hideBar(), 3000);
      return;
    }
    this.isBarVisible = true;
    this.readerNavigation?.classList.add('visible');
    this.readerInfo?.classList.add('visible');
    this.autoHideTimer = setTimeout(() => this.hideBar(), 3000);
  }

  hideBar() {
    this.isBarVisible = false;
    this.readerNavigation?.classList.remove('visible');
    this.readerInfo?.classList.remove('visible');
  }

  toggleUI() {
    this.isBarVisible ? this.hideBar() : this.showBar();
  }

  async loadChapterFromURL() {
    this.showLoading();
    const urlParams = new URLSearchParams(window.location.search);
    this.currentManga = urlParams.get('manga');
    this.currentChapter = urlParams.get('cap');

    if (!this.currentManga || !this.currentChapter) {
      this.showError('Parámetros de URL inválidos');
      return;
    }

    try {
      await this.loadAvailableChapters();
      await this.loadChapterImages();
      this.setupNavigation();
      this.hideLoading();
      this.showBar();
    } catch (error) {
      console.error('Error cargando capítulo:', error);
      this.showError('Error al cargar el capítulo');
    }
  }

  loadUserSettings() {
    const settings = JSON.parse(localStorage.getItem('readerSettings')) || {};
    this.readingMode = settings.readingMode || 'vertical';
    this.fitMode = settings.fitMode || 'fit-width';
    this.spacing = settings.spacing || 10;
    this.renderImages();
    this.adjustLayout();
  }

  saveUserSettings() {
    const settings = {
      readingMode: this.readingMode,
      fitMode: this.fitMode,
      spacing: this.spacing,
    };
    localStorage.setItem('readerSettings', JSON.stringify(settings));
  }

  async loadAvailableChapters() {
    try {
      const res = await fetch(`https://backend-bue9.onrender.com/api/lectura/chapters?manga=${encodeURIComponent(this.currentManga)}`);
      if (!res.ok) throw new Error('Error cargando capítulos');
      this.availableChapters = await res.json();
      this.availableChapters.sort((a, b) => Number(a) - Number(b));
    } catch (err) {
      console.error('Error cargando capítulos:', err);
      this.availableChapters = [];
    }
  }

  async loadChapterImages() {
    try {
      const res = await fetch(`https://backend-bue9.onrender.com/api/lectura?manga=${encodeURIComponent(this.currentManga)}&cap=${encodeURIComponent(this.currentChapter)}`);
      if (!res.ok) throw new Error('Capítulo no encontrado');
      const data = await res.json();

      if (!data.imagenes || data.imagenes.length === 0) {
        this.showError('No se encontraron imágenes para este capítulo');
        return;
      }

      this.images = data.imagenes.map((url, index) => ({
        url,
        index,
        loaded: false
      }));

      this.updateChapterInfo(data.nombreManga, data.capitulo);
      this.renderImages();
      this.preloadImages();

      const token = localStorage.getItem('token');
if (token) {
  try {
    console.log('Marcando capítulo como visto...');

    // Usar makeAuthenticatedRequest si está disponible, sino usar fetch normal
    if (typeof makeAuthenticatedRequest === 'function') {
      await makeAuthenticatedRequest('https://backend-bue9.onrender.com/api/lectura/marcar-visto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ manga: this.currentManga, cap: this.currentChapter })
      });
      console.log('Capítulo marcado como visto exitosamente');
    } else {
      // Fallback al método anterior
      await fetch('https://backend-bue9.onrender.com/api/lectura/marcar-visto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ manga: this.currentManga, cap: this.currentChapter })
      });
    }
  } catch (err) {
    console.error('Error al marcar como visto:', err);
  }
} else {
  console.log('Usuario no logueado, no se marcará como visto');
}

    } catch (err) {
      console.error('Error cargando imágenes:', err);
      this.showError('Error al cargar las imágenes');
    }
  }

  renderImages() {
    this.readerContainer.innerHTML = '';
    this.readerContainer.className = `reader-container ${this.readingMode}`;

    this.images.forEach((imgData, index) => {
      const img = document.createElement('img');
      img.className = `reader-image ${this.fitMode}`;
      img.src = imgData.url;
      img.alt = `Página ${index + 1}`;
      img.dataset.index = index;
      img.loading = 'lazy';

      img.addEventListener('load', () => {
        imgData.loaded = true;
        this.updateProgress();
      });

      img.addEventListener('click', (e) => {
        e.preventDefault();
        const rect = e.target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        clickX < rect.width / 2 ? this.previousPage() : this.nextPage();
      });

      img.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.previousPage();
      });

      this.readerContainer.appendChild(img);
    });

    this.applySpacing();
    this.adjustLayout();
  }

  preloadImages() {
    const start = Math.max(0, this.currentImageIndex - 1);
    const end = Math.min(this.images.length, this.currentImageIndex + 4);
    for (let i = start; i < end; i++) {
      if (!this.images[i].loaded) {
        const img = new Image();
        img.src = this.images[i].url;
      }
    }
  }

  changeReadingMode(mode) {
    this.readingMode = mode;
    document.querySelectorAll('[data-mode]').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.mode === mode)
    );
    this.renderImages();
    this.adjustLayout();
    this.saveUserSettings();
  }

  changeFitMode(fit) {
    this.fitMode = fit;
    document.querySelectorAll('[data-fit]').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.fit === fit)
    );
    document.querySelectorAll('.reader-image').forEach(img =>
      img.className = `reader-image ${fit}`
    );
    this.adjustLayout();
    this.saveUserSettings();
  }

  changeSpacing(value) {
    this.spacing = parseInt(value);
    this.applySpacing();
  }

  applySpacing() {
    if (this.readingMode === 'vertical' || this.readingMode === 'webtoon') {
      this.readerContainer.style.gap = `${this.spacing}px`;
    }
  }

  previousPage() {
    this.readingMode === 'horizontal'
      ? this.readerContainer.scrollLeft -= window.innerWidth
      : window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
  }

  nextPage() {
    this.readingMode === 'horizontal'
      ? this.readerContainer.scrollLeft += window.innerWidth
      : window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  }

  previousChapter() {
    const i = this.availableChapters.indexOf(String(this.currentChapter));
    if (i > 0) this.navigateToChapter(this.availableChapters[i - 1]);
  }

  nextChapter() {
    const i = this.availableChapters.indexOf(String(this.currentChapter));
    if (i < this.availableChapters.length - 1) this.navigateToChapter(this.availableChapters[i + 1]);
  }

  navigateToChapter(chapter) {
    this.showLoading();
    setTimeout(() => {
      const url = new URL(window.location);
      url.searchParams.set('cap', chapter);
      window.location.href = url.toString();
    }, 100);
  }

  setupBackButton() {
    const btn = document.getElementById('nav-back-manga');
    if (btn && this.currentManga) {
      const path = window.location.pathname.includes('/html/') ? 'infoMangas.html' : 'html/infoMangas.html';
      const url = `${path}?manga=${encodeURIComponent(this.currentManga)}`;
      btn.href = url;
      btn.replaceWith(btn.cloneNode(true));
      const newBtn = document.getElementById('nav-back-manga');
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setTimeout(() => { window.location.href = url; }, 50);
      });
    }
  }

  setupNavigation() {
    const i = this.availableChapters.indexOf(String(this.currentChapter));
    if (this.navPrevChapter) this.navPrevChapter.disabled = i <= 0;
    if (this.navNextChapter) this.navNextChapter.disabled = i >= this.availableChapters.length - 1;
    this.setupBackButton();
  }

  updateChapterInfo(nombreManga, capitulo) {
    const name = nombreManga || this.currentManga.replaceAll("_", " ");
    if (this.chapterTitle) this.chapterTitle.textContent = `${name} - Capítulo ${capitulo}`;
    if (this.chapterProgress) this.chapterProgress.textContent = `${this.images.length} páginas`;
  }

  updateProgress() {
    if (!this.progressBar) return;
    const percent = this.readingMode === 'horizontal'
      ? (this.readerContainer.scrollLeft / (this.readerContainer.scrollWidth - this.readerContainer.clientWidth)) * 100
      : (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    this.progressBar.style.width = `${Math.min(100, percent)}%`;
  }

  handleKeyPress(e) {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); this.previousPage(); break;
      case 'ArrowRight': e.preventDefault(); this.nextPage(); break;
      case 'ArrowUp':
        if (this.readingMode !== 'vertical') {
          e.preventDefault();
          this.previousPage();
        }
        break;
      case 'F3': e.preventDefault(); this.toggleFullscreen(); break;
      case 'Escape': e.preventDefault(); this.hideEngrane(); break;
    }
  }

  showLoading() {
    if (this.loadingIndicator) this.loadingIndicator.style.display = 'flex';
  }

  hideLoading() {
    if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
  }

  showError(msg) {
    this.hideLoading();
    if (this.chapterTitle) this.chapterTitle.textContent = 'Error';
    if (this.chapterProgress) this.chapterProgress.textContent = msg;
    this.readerContainer.innerHTML = `<div style="text-align: center; padding: 50px; color: var(--reader-text);">${msg}</div>`;
  }

  setupClickOverlay() {
    if (!this.readerContainer) return;
    let overlay = document.getElementById('click-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'click-overlay';
      this.readerContainer.appendChild(overlay);
    }

    overlay.style.cssText = `
      position: absolute;
      top: 40%; left: 40%;
      width: 20%; height: 20%;
      z-index: 20; cursor: pointer; pointer-events: auto;
    `;
    overlay.innerHTML = '';
    overlay.onclick = (e) => {
      if (this.isClickAllowed(e)) this.toggleUI();
    };
    this.readerContainer.style.position = 'relative';
  }

  isClickAllowed(e) {
    if (!this.commentsSection) return true;
    return e.clientY < this.commentsSection.getBoundingClientRect().top;
  }

  toggleFullscreen() {
    !document.fullscreenElement
      ? document.documentElement.requestFullscreen()
      : document.exitFullscreen();
  }

  adjustLayout() {
    if (!this.readerContainer) return;
    if (this.readingMode === 'horizontal') {
      Object.assign(this.readerContainer.style, {
        height: '100vh',
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        flexWrap: 'nowrap'
      });
    } else {
      Object.assign(this.readerContainer.style, {
        height: 'auto',
        overflowX: 'visible',
        overflowY: 'visible',
        display: 'block'
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CubariReader();
});
