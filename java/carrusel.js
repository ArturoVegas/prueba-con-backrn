async function cargarCarruselPrincipal() {
  console.log("🎠 Iniciando carga del carrusel principal...");

  const inner = document.querySelector("#carouselExampleCaptions .carousel-inner");
  const indicators = document.querySelector("#carouselExampleCaptions .carousel-indicators");

  if (!inner || !indicators) {
    console.error("❌ No se encontraron elementos del carrusel");
    return;
  }

  // Limpiar contenido existente y mostrar loader
  inner.innerHTML = "";
  indicators.innerHTML = "";
  mostrarLoaderCarrusel(inner);

  try {
    const res = await fetch("https://backend-bue9.onrender.com/api/carrusel_Principal");
    if (!res.ok) throw new Error("No se pudo obtener el carrusel");

    const carrusel = await res.json();

    // Convertir objeto a array filtrando los que no tienen imagen
    const slides = Object.values(carrusel).filter(item => item.imagen);

    if (slides.length === 0) {
      console.log("⚠️ No hay slides válidos");
      mostrarCarruselPorDefecto();
      return;
    }

    // Limpiar loader
    inner.innerHTML = "";
    indicators.innerHTML = "";

    slides.forEach((slide, index) => {
      // Crear indicador
      const indicator = document.createElement("button");
      indicator.type = "button";
      indicator.setAttribute("data-bs-target", "#carouselExampleCaptions");
      indicator.setAttribute("data-bs-slide-to", index);
      indicator.setAttribute("aria-label", `Slide ${index + 1}`);
      if (index === 0) {
        indicator.classList.add("active");
        indicator.setAttribute("aria-current", "true");
      }
      indicators.appendChild(indicator);

      // Crear slide
      const carouselItem = document.createElement("div");
      carouselItem.classList.add("carousel-item");
      if (index === 0) carouselItem.classList.add("active");

      carouselItem.innerHTML = `
        <img src="${slide.imagen}" class="d-block w-100" alt="${slide.titulo || `Slide ${index + 1}`}" />
        <div class="carousel-caption d-none d-md-block">
          <h5>${slide.titulo || ""}</h5>
          <p>${slide.descripcion || ""}</p>
        </div>
      `;
      inner.appendChild(carouselItem);
    });

    // Opcional: inicializar funcionalidades Bootstrap si es necesario
    console.log(`✅ Carrusel cargado con ${slides.length} slides`);
  } catch (error) {
    console.error("❌ Error al cargar carrusel:", error);
    mostrarCarruselPorDefecto();
  }
}

function mostrarLoaderCarrusel(container) {
  container.innerHTML = `
    <div class="loader text-center p-5">
      <span>Cargando carrusel...</span>
    </div>
  `;
}

function mostrarCarruselPorDefecto() {
  const inner = document.querySelector("#carouselExampleCaptions .carousel-inner");
  const indicators = document.querySelector("#carouselExampleCaptions .carousel-indicators");
  if (!inner || !indicators) return;

  inner.innerHTML = `
    <div class="carousel-item active">
      <img src="https://via.placeholder.com/800x400?text=Carrusel+Por+Defecto" class="d-block w-100" alt="Por defecto" />
      <div class="carousel-caption d-none d-md-block">
        <h5>Contenido por defecto</h5>
        <p>No se pudo cargar el carrusel.</p>
      </div>
    </div>
  `;
  indicators.innerHTML = `
    <button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
  `;
}
document.addEventListener('DOMContentLoaded', () => {
  cargarCarruselPrincipal();
});


