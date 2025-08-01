// Función para mostrar skeleton loader (igual que en tu código)
function mostrarSkeletonLoader(container) {
  const skeletonHTML = `
    <div class="col">
      <div class="card skeleton-card h-100">
        <div class="skeleton-img"></div>
        <div class="card-body">
          <div class="skeleton-title mb-2"></div>
          <div class="skeleton-text"></div>
        </div>
      </div>
    </div>
  `.repeat(6);
  
  container.innerHTML = skeletonHTML;
}

async function cargarUltimasActualizaciones() {
  const ultimasActualizacionesCont = document.getElementById("ultimas-actualizaciones");
  if (!ultimasActualizacionesCont) return;

  mostrarSkeletonLoader(ultimasActualizacionesCont);

  try {
    // Cambia esta URL por la de tu backend en Render
    const response = await fetch('https://tu-backend-render/api/ultimas-actualizaciones');
    if (!response.ok) throw new Error('Error en la respuesta del servidor');

    const recientes = await response.json();

    ultimasActualizacionesCont.innerHTML = "";

    if (recientes.length === 0) {
      ultimasActualizacionesCont.innerHTML = "<p class='text-light'>No hay actualizaciones recientes.</p>";
      return;
    }

    recientes.forEach(({ manga, portada, capitulo, fecha }, index) => {
      const card = document.createElement("div");
      card.className = "col";
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

      const mangaNombre = manga.replaceAll("_", " ");
      const imagenSrc = portada || './Recursos/imagenes/placeholder-manga.jpg';

      card.innerHTML = `
        <a href="./html/vermangas.html?manga=${encodeURIComponent(manga)}&cap=${encodeURIComponent(capitulo)}" 
           class="text-decoration-none text-reset"
           data-manga="${manga}"
           data-capitulo="${capitulo}">
          <div class="card h-100 manga-card">
            <div class="position-relative overflow-hidden">
              <img src="${imagenSrc}" 
                   class="card-img-top" 
                   alt="${mangaNombre}"
                   loading="lazy"
                   onerror="this.src='./Recursos/imagenes/placeholder-manga.jpg'; this.alt='Imagen no disponible';" />
              <div class="card-overlay">
                <i class="bi bi-eye-fill"></i>
                <span>Ver Capítulo</span>
              </div>
            </div>
            <div class="card-body d-flex flex-column">
              <h5 class="card-title flex-grow-0" title="${mangaNombre}">${mangaNombre}</h5>
              <div class="mt-auto">
                <p class="card-text mb-1">
                  <i class="bi bi-bookmark-fill me-1"></i>
                  Capítulo ${capitulo}
                </p>
                <p class="card-text">
                  <i class="bi bi-clock me-1"></i>
                  <small class="text-muted">${tiempoDesde(fecha)}</small>
                </p>
              </div>
            </div>
          </div>
        </a>
      `;

      ultimasActualizacionesCont.appendChild(card);

      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 150);
    });

    añadirEventListenersCards();

  } catch (error) {
    console.error("Error al cargar últimas actualizaciones:", error);
    ultimasActualizacionesCont.innerHTML = `
      <div class="col-12 text-center">
        <div class="alert alert-danger border-0" style="background: rgba(220, 53, 69, 0.1); color: #ffffff;">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Error al cargar las últimas actualizaciones. 
          <button class="btn btn-sm btn-outline-light ms-2" onclick="location.reload()">
            <i class="bi bi-arrow-clockwise me-1"></i>Reintentar
          </button>
        </div>
      </div>
    `;
  }
}

// Función para añadir event listeners a las cards (igual que en tu código)
function añadirEventListenersCards() {
  const cards = document.querySelectorAll('.manga-card');
  
  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
    card.addEventListener('mousedown', function() {
      this.style.transform = 'translateY(-4px) scale(0.98)';
    });
    card.addEventListener('mouseup', function() {
      this.style.transform = 'translateY(-8px) scale(1.02)';
    });
  });
}

// Inicialización y helpers (igual que en tu código)
function inicializarPagina() {
  window.addEventListener('load', () => {
    const loader = document.getElementById('page-loader');
    if (loader) {
      setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => {
          loader.remove();
        }, 500);
      }, 1000);
    }
  });
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarPagina);
} else {
  inicializarPagina();
}

// Exporta la función para llamar desde tu JS principal
export { cargarUltimasActualizaciones };
