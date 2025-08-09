let listaMangasCompleta = [];

async function cargarNombresMangas() {
  console.log("🔍 Iniciando carga de contenido desde backend...");
  try {
    const res = await fetch("https://backend-bue9.onrender.com/api/contenido");
    if (!res.ok) throw new Error("No se pudo obtener el contenido");

    const data = await res.json();

    listaMangasCompleta = data.map(item => ({
      nombre: item.id,
      titulo: item.titulo,
      portada: item.portada,
      estado: estadoBackendToFrontend(item.estado),
      generos: item.generos,
      tipo: item.tipo,
    }));

    console.log("✅ Contenido cargado:", listaMangasCompleta.length);
    console.log("📋 Primeros 3 ítems:", listaMangasCompleta.slice(0, 3));
  } catch (error) {
    console.error("❌ Error cargando contenido para autocompletado:", error);
    listaMangasCompleta = [];
  }
}

function estadoBackendToFrontend(estado) {
  const mapEstados = {
    "En emisión": "ongoing",
    "Completado": "completed",
    "Pausado": "paused",
    "Abandonado": "dropped",
  };
  return mapEstados[estado] || "ongoing";
}

function getRutaInfoMangas() {
  const origin = window.location.origin;
  const pathParts = window.location.pathname.split("/");
  pathParts.pop();
  if (pathParts[pathParts.length - 1] === "html") {
    return `${origin}${pathParts.join("/")}/infoMangas.html`;
  } else {
    return `${origin}${pathParts.join("/")}/html/infoMangas.html`;
  }
}

function inicializarBuscadorConAutocomplete() {
  console.log("🔍 Inicializando buscador con autocomplete...");
  const formBuscar = document.getElementById("form-buscar");
  const inputBuscar = document.getElementById("input-buscar");

  if (!formBuscar || !inputBuscar) {
    console.log("⚠️ No se encontraron elementos del buscador");
    return;
  }

  console.log("✅ Elementos del buscador encontrados");
  console.log("📊 Ítems cargados para autocompletado:", listaMangasCompleta.length);

  const contenedorSugerencias = document.createElement("ul");
  contenedorSugerencias.classList.add("autocomplete-list");

  inputBuscar.parentNode.style.position = "relative";
  inputBuscar.parentNode.appendChild(contenedorSugerencias);

  let clickEnSugerencia = false;

  inputBuscar.addEventListener("input", () => {
    const valor = inputBuscar.value.trim().toLowerCase();
    contenedorSugerencias.innerHTML = "";

    if (!valor) {
      contenedorSugerencias.classList.remove("show");
      return;
    }

    const filtrados = listaMangasCompleta
      .filter((item) => item.titulo.toLowerCase().includes(valor))
      .slice(0, 10);

    if (filtrados.length === 0) {
      const noResultados = document.createElement("li");
      noResultados.classList.add("autocomplete-no-results");
      noResultados.textContent = "No se encontraron resultados";
      contenedorSugerencias.appendChild(noResultados);
    } else {
      filtrados.forEach((item) => {
        const li = document.createElement("li");
        li.classList.add("autocomplete-item");

        const imagenSrc =
          item.portada || "https://via.placeholder.com/50x70/333/fff?text=Manga";

        const estadoTexto = {
          ongoing: "En Emisión",
          completed: "Completado",
          paused: "Pausado",
          dropped: "Abandonado",
        }[item.estado] || item.estado;

        const generosTexto =
          item.generos && item.generos.length > 0
            ? item.generos.slice(0, 3).join(", ")
            : "Sin géneros";

        li.innerHTML = `
          <img src="${imagenSrc}" alt="${item.titulo}" class="autocomplete-item-image" 
            onerror="this.src='https://via.placeholder.com/50x70/333/fff?text=Manga'" />
          <div class="autocomplete-item-content">
            <span class="autocomplete-item-title" title="${item.titulo}">${item.titulo}</span>
            <div class="autocomplete-item-details">
              <span class="autocomplete-item-status status-${item.estado}">${estadoTexto}</span>
              <span title="${generosTexto}">${generosTexto}</span>
            </div>
          </div>
        `;

        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          clickEnSugerencia = true;

          const rutaInfo = getRutaInfoMangas();
          window.location.href = `${rutaInfo}?manga=${encodeURIComponent(item.nombre)}`;
        });

        contenedorSugerencias.appendChild(li);
      });
    }

    contenedorSugerencias.classList.add("show");
  });

  inputBuscar.addEventListener("blur", () => {
    setTimeout(() => {
      if (!clickEnSugerencia) {
        contenedorSugerencias.innerHTML = "";
        contenedorSugerencias.classList.remove("show");
      }
      clickEnSugerencia = false;
    }, 150);
  });

  formBuscar.addEventListener("submit", (e) => {
    e.preventDefault();
    const mangaBuscado = inputBuscar.value.trim();
    if (mangaBuscado) {
      const rutaInfo = getRutaInfoMangas();
      window.location.href = `${rutaInfo}?manga=${encodeURIComponent(mangaBuscado)}`;
    }
  });
}
window.addEventListener("DOMContentLoaded", async () => {
  await cargarNombresMangas(); // ⏳ Carga datos desde el backend en Render
  inicializarBuscadorConAutocomplete(); // 🔍 Activa autocompletado
});
