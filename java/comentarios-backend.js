// Sistema de comentarios integrado con el backend
const API_BASE = 'https://backend-bue9.onrender.com/api';

// Cambia este UID por el UID real del admin
const ADMIN_UID = "Cqh5y2MlsObi4ox90jlbAiRGu4D2";

// Obtener parámetros manga y capítulo de la URL
function getParams() {
  const url = new URLSearchParams(window.location.search);
  return {
    manga: url.get("manga"),
    cap: url.get("cap")
  };
}

// Formatea fechas como "hace X minutos/hours/días"
function formatoFechaRelativa(fechaISO) {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diffMs = ahora - fecha;

  const segundos = Math.floor(diffMs / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  if (dias > 0) return `hace ${dias} día${dias > 1 ? "s" : ""}`;
  if (horas > 0) return `hace ${horas} hora${horas > 1 ? "s" : ""}`;
  if (minutos > 0) return `hace ${minutos} minuto${minutos > 1 ? "s" : ""}`;
  return "hace unos segundos";
}

// Elementos DOM
const btnIniciar = document.getElementById("btn-iniciar-sesion");
const btnLogout = document.getElementById("btn-logout");
const formComentario = document.getElementById("comment-form");
const listaComentarios = document.getElementById("lista-comentarios");
const contadorComentarios = document.querySelector(".comment-count-custom");
const inputComentario = document.getElementById("input-comentario");
const userAvatar = document.getElementById("user-avatar");

let usuarioActual = null;

// --- FUNCIONES DE UTILIDAD PARA AUTENTICACIÓN ---

// Función para obtener sesión del usuario
function getUserSession() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Función para hacer peticiones autenticadas con renovación automática de token
async function makeAuthenticatedRequest(url, options = {}) {
  let token = getUserSession()?.token || localStorage.getItem('token');
  
  // Primer intento
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
  
  // Si el token está expirado (401), renovarlo e intentar de nuevo
  if (response.status === 401) {
    console.log('Token expirado, renovando...');
    token = await getFreshToken();
    
    if (!token) {
      throw new Error('No se pudo renovar el token');
    }
    
    // Segundo intento con token fresco
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  }
  
  return response;
}

// Función para renovar token (reutilizando de auth.js)
async function getFreshToken() {
  try {
    const userSession = getUserSession();
    if (!userSession || !userSession.refreshToken) {
      throw new Error('No hay refreshToken disponible');
    }

    console.log('Renovando token expirado...');
    
    const response = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: userSession.refreshToken })
    });

    if (!response.ok) {
      throw new Error('No se pudo renovar el token');
    }

    const data = await response.json();
    
    // Actualizar la sesión con el nuevo token
    const updatedSession = {
      ...userSession,
      token: data.token,
      refreshToken: data.refreshToken
    };
    
    localStorage.setItem('user', JSON.stringify(updatedSession));
    localStorage.setItem('token', data.token);
    console.log('Token renovado exitosamente');
    
    return data.token;
    
  } catch (error) {
    console.error('Error renovando token:', error);
    console.log('No se pudo renovar el token. Debes iniciar sesión nuevamente.');
    logout();
    return null;
  }
}

// Función de logout
function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  window.location.reload();
}

// --- GESTIÓN DE ESTADO DE AUTENTICACIÓN ---

// Integración con el sistema de autenticación global
function syncWithGlobalAuth() {
  const globalUser = getUserSession();
  
  if (globalUser) {
    usuarioActual = {
      uid: globalUser.uid,
      email: globalUser.email,
      displayName: globalUser.displayName,
      token: globalUser.token
    };
  } else {
    usuarioActual = null;
  }
  
  actualizarUI(usuarioActual);
  cargarComentarios();
}

// Listener para cambios en localStorage (sincronización entre pestañas)
window.addEventListener('storage', (e) => {
  if (e.key === 'user') {
    syncWithGlobalAuth();
  }
});

// Inicializar sincronización
syncWithGlobalAuth();

// --- EVENT LISTENERS ---

btnIniciar?.addEventListener("click", () => {
  window.location.href = "../html/auth.html";
});

btnLogout?.addEventListener("click", async () => {
  // Usar el logout global si está disponible
  if (typeof logout === 'function') {
    logout();
  } else {
    // Fallback al logout local
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    mostrarNotificacion("Sesión cerrada correctamente.", "success");
    setTimeout(() => location.reload(), 1000);
  }
});

document.getElementById("btn-publicar-comentario")?.addEventListener("click", publicarComentario);

// --- FUNCIONES DE UI ---

// Actualiza la UI según si está logueado o no
async function actualizarUI(user) {
  if (user) {
    if (btnIniciar) btnIniciar.style.display = "none";
    if (btnLogout) btnLogout.style.display = "inline-block";
    if (formComentario) formComentario.style.display = "flex";
    if (userAvatar) {
      // Obtener avatar del usuario actual
      const displayName = user.displayName || user.email?.split('@')[0] || "Usuario";
      try {
        const avatarUrl = await getUserAvatar(user.uid, displayName);
        // Convertir el div de avatar a imagen
        userAvatar.innerHTML = '';
        const avatarImg = document.createElement('img');
        avatarImg.src = avatarUrl;
        avatarImg.alt = `Avatar de ${displayName}`;
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.objectFit = 'cover';
        avatarImg.style.borderRadius = '50%';
        userAvatar.appendChild(avatarImg);
      } catch (error) {
        // Fallback al texto si hay error
        userAvatar.textContent = displayName.charAt(0).toUpperCase();
      }
    }
  } else {
    if (btnIniciar) btnIniciar.style.display = "inline-block";
    if (btnLogout) btnLogout.style.display = "none";
    if (formComentario) formComentario.style.display = "none";
    if (userAvatar) userAvatar.textContent = "U";
  }
}

// --- FUNCIONES DE COMENTARIOS ---

// Publicar comentario
async function publicarComentario() {
  const { manga, cap } = getParams();
  if (!manga || !cap) {
    mostrarNotificacion("Error: No se especificó manga o capítulo.", "error");
    return;
  }

  if (!usuarioActual) {
    mostrarNotificacion("Debes iniciar sesión para comentar.", "warning");
    return;
  }

  const texto = inputComentario?.value.trim();
  if (!texto) {
    mostrarNotificacion("Escribe un comentario antes de publicar.", "warning");
    return;
  }

  // Deshabilitar botón durante envío
  const btnPublicar = document.getElementById("btn-publicar-comentario");
  const textoOriginal = btnPublicar?.textContent;
  if (btnPublicar) {
    btnPublicar.disabled = true;
    btnPublicar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Publicando...';
  }

  const nick = usuarioActual.displayName?.trim() || usuarioActual.email?.split("@")[0] || "Anónimo";

  const comentario = {
    usuario: nick && nick !== "" ? nick : "Anónimo",
    texto,
    manga,
    capitulo: cap,
    respuestaA: null // Para comentarios principales
  };

  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comentario)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al publicar comentario');
    }

    inputComentario.value = "";
    mostrarNotificacion("¡Comentario publicado con éxito!", "success");
    cargarComentarios();
    
  } catch (error) {
    console.error("Error al publicar comentario:", error);
    mostrarNotificacion("No se pudo publicar el comentario. Inténtalo de nuevo.", "error");
  } finally {
    // Rehabilitar botón
    if (btnPublicar) {
      btnPublicar.disabled = false;
      btnPublicar.textContent = textoOriginal;
    }
  }
}

// Cargar comentarios
async function cargarComentarios() {
  const { manga, cap } = getParams();
  if (!manga || !cap) return;

  // Mostrar spinner de carga
  mostrarCargandoComentarios();

  try {
    const response = await fetch(`${API_BASE}/comentarios/${manga}/${cap}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar comentarios');
    }
    
    const data = await response.json();
    const comentarios = data.comentarios || [];

    setTimeout(() => {
      listaComentarios.innerHTML = "";
      
      if (comentarios.length === 0) {
        contadorComentarios.textContent = "0 Comentarios";
        mostrarEstadoVacio();
        return;
      }

      // Filtrar solo comentarios principales (no respuestas)
      const comentariosPrincipales = comentarios.filter(com => !com.respuestaA);
      
      // Ordenar por fecha (más recientes primero)
      comentariosPrincipales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      contadorComentarios.textContent = `${comentarios.length} Comentario${comentarios.length !== 1 ? "s" : ""}`;

      comentariosPrincipales.forEach((com, index) => {
        const div = document.createElement("div");
        div.className = "comentario-box";
        div.setAttribute('data-key', com.id);
        div.style.animationDelay = `${index * 0.1}s`;

        // Header del comentario mejorado
        const userInfo = document.createElement("div");
        userInfo.className = "comment-user-info";

        // Avatar del usuario
        const userAvatarElement = document.createElement("img");
        userAvatarElement.className = "comment-user-avatar";
        
        // Obtener datos del usuario para el avatar
        getUserAvatar(com.uid, com.usuario).then(avatarUrl => {
          userAvatarElement.src = avatarUrl;
          userAvatarElement.alt = `Avatar de ${com.usuario}`;
        });

        const username = document.createElement("span");
        username.className = "comment-username";
        username.textContent = com.usuario;

        // Badge de admin
        if (com.uid === ADMIN_UID) {
          const adminBadge = document.createElement("span");
          adminBadge.className = "comment-admin-badge";
          adminBadge.textContent = "Admin";
          username.appendChild(adminBadge);
        }

        const fechaElem = document.createElement("small");
        fechaElem.className = "fecha-comentario";
        fechaElem.textContent = formatoFechaRelativa(com.fecha);

        userInfo.appendChild(userAvatarElement);
        userInfo.appendChild(username);
        userInfo.appendChild(fechaElem);

        const textoElem = document.createElement("p");
        textoElem.className = "comment-text";
        textoElem.textContent = com.texto;

        div.appendChild(userInfo);
        div.appendChild(textoElem);

        if (com.editado) {
          const editadoSpan = document.createElement("small");
          editadoSpan.className = "comment-edited-badge";
          editadoSpan.textContent = "✏️ editado";
          userInfo.appendChild(editadoSpan);
        }

        // Botón de responder (visible para todos los usuarios autenticados)
        if (usuarioActual && !com.respuestaA) { // Solo en comentarios principales
          const btnResponder = document.createElement("button");
          btnResponder.className = "btn btn-sm btn-outline-info me-2";
          btnResponder.innerHTML = '💬 Responder';
          btnResponder.onclick = () => mostrarFormularioRespuesta(com.id, com);
          
          const accionesRespuesta = document.createElement("div");
          accionesRespuesta.className = "mt-2 comment-reply-actions";
          accionesRespuesta.appendChild(btnResponder);
          div.appendChild(accionesRespuesta);
        }

        // Mostrar botones solo para comentarios propios o admin
        if (usuarioActual && (com.uid === usuarioActual.uid || usuarioActual.uid === ADMIN_UID)) {
          const acciones = document.createElement("div");
          acciones.className = "mt-2 comment-admin-actions";

          const btnEditar = document.createElement("button");
          btnEditar.className = "btn btn-sm btn-outline-primary me-2";
          btnEditar.textContent = "Editar";
          btnEditar.onclick = () => editarComentario(com.id, com, manga, cap);

          const btnEliminar = document.createElement("button");
          btnEliminar.className = "btn btn-sm btn-outline-danger";
          btnEliminar.textContent = "Eliminar";
          btnEliminar.onclick = () => eliminarComentario(com.id, com.uid, manga, cap);

          acciones.appendChild(btnEditar);
          acciones.appendChild(btnEliminar);
          div.appendChild(acciones);
        }

        // Cargar y mostrar respuestas si las hay
        const respuestas = comentarios.filter(resp => resp.respuestaA === com.id);
        if (respuestas.length > 0) {
          const respuestasContainer = document.createElement("div");
          respuestasContainer.className = "replies-container";
          cargarRespuestas(respuestasContainer, com.id, respuestas);
          div.appendChild(respuestasContainer);
        }

        listaComentarios.appendChild(div);
      });
    }, 300); // Pequeño delay para mostrar el loading
    
  } catch (error) {
    console.error('Error cargando comentarios:', error);
    listaComentarios.innerHTML = '<div class="alert alert-danger">Error al cargar comentarios</div>';
  }
}

// Función para mostrar loading
function mostrarCargandoComentarios() {
  listaComentarios.innerHTML = `
    <div class="loading-comments">
      <div class="loading-spinner"></div>
      <span>Cargando comentarios...</span>
    </div>
  `;
}

// Función para mostrar estado vacío
function mostrarEstadoVacio() {
  listaComentarios.innerHTML = `
    <div class="empty-comments">
      <div class="empty-comments-icon">💭</div>
      <div class="empty-comments-text">¡Sé el primero en comentar!</div>
      <div class="empty-comments-subtext">Comparte tu opinión sobre este capítulo</div>
    </div>
  `;
}

// Editar comentario
function editarComentario(comentarioId, comentario, manga, cap) {
  mostrarModalEdicion(comentario.texto, async (nuevoTexto) => {
    if (!usuarioActual) {
      mostrarNotificacion("Debes iniciar sesión para editar.", "warning");
      return;
    }
    if (usuarioActual.uid !== comentario.uid && usuarioActual.uid !== ADMIN_UID) {
      mostrarNotificacion("No tienes permiso para editar este comentario.", "error");
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/comentarios/${comentarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: nuevoTexto })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al editar comentario');
      }

      cargarComentarios();
      mostrarNotificacion("Comentario editado con éxito.", "success");
    } catch (err) {
      console.error("Error editando comentario:", err);
      mostrarNotificacion("Error al editar el comentario.", "error");
    }
  });
}

// Eliminar comentario
function eliminarComentario(comentarioId, uid, manga, cap) {
  mostrarModalConfirmacion("¿Estás seguro de eliminar este comentario?", "Eliminar", async () => {
    if (!usuarioActual) {
      mostrarNotificacion("Debes iniciar sesión para eliminar.", "warning");
      return;
    }
    if (usuarioActual.uid !== uid && usuarioActual.uid !== ADMIN_UID) {
      mostrarNotificacion("No tienes permiso para eliminar este comentario.", "error");
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/comentarios/${comentarioId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar comentario');
      }

      cargarComentarios();
      mostrarNotificacion("Comentario eliminado con éxito.", "success");
    } catch (err) {
      console.error("Error al eliminar comentario:", err);
      mostrarNotificacion("No se pudo eliminar el comentario.", "error");
    }
  });
}

// Función para obtener el avatar del usuario
async function getUserAvatar(uid, username) {
  try {
    const response = await fetch(`${API_BASE}/usuarios/perfil/${uid}`);
    
    if (response.ok) {
      const userData = await response.json();
      if (userData.avatarURL) {
        return userData.avatarURL;
      }
    }
    
    // Fallback a ui-avatars.com
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=54a3ff&color=fff&size=40`;
  } catch (error) {
    console.error('Error obteniendo avatar del usuario:', error);
    // Fallback en caso de error
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=54a3ff&color=fff&size=40`;
  }
}

// Sistema de notificaciones mejorado
function mostrarNotificacion(mensaje, tipo = 'info') {
  // Remover notificaciones existentes
  const existente = document.querySelector('.notification-toast');
  if (existente) existente.remove();

  const notification = document.createElement('div');
  notification.className = `notification-toast notification-${tipo}`;
  
  const icon = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }[tipo] || 'ℹ️';
  
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${icon}</span>
      <span class="notification-message">${mensaje}</span>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  document.body.appendChild(notification);
  
  // Mostrar con animación
  setTimeout(() => notification.classList.add('show'), 100);
  
  // Auto-remover después de 4 segundos
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Mostrar formulario para respuesta
function mostrarFormularioRespuesta(parentId, comentarioPadre) {
  const respuestaContainer = document.createElement("div");
  respuestaContainer.className = "respuesta-form-container mt-3";

  const textareaRespuesta = document.createElement("textarea");
  textareaRespuesta.className = "form-control mb-2";
  textareaRespuesta.rows = "3";
  textareaRespuesta.placeholder = `Respondiendo a ${comentarioPadre.usuario}...`;

  const btnEnviarRespuesta = document.createElement("button");
  btnEnviarRespuesta.className = "btn btn-success btn-sm me-2";
  btnEnviarRespuesta.textContent = "Enviar respuesta";
  btnEnviarRespuesta.onclick = () => enviarRespuesta(textareaRespuesta, parentId);

  const btnCancelar = document.createElement("button");
  btnCancelar.className = "btn btn-secondary btn-sm";
  btnCancelar.textContent = "Cancelar";
  btnCancelar.onclick = () => {
    respuestaContainer.remove();
    cargarComentarios(); // Recargar para restaurar botones originales
  };

  const buttonsContainer = document.createElement("div");
  buttonsContainer.appendChild(btnEnviarRespuesta);
  buttonsContainer.appendChild(btnCancelar);

  respuestaContainer.appendChild(textareaRespuesta);
  respuestaContainer.appendChild(buttonsContainer);

  // Es respuesta a comentario principal
  const accionesRespuesta = document.querySelector(`[data-key="${parentId}"] .comment-reply-actions`);
  if (accionesRespuesta) {
    accionesRespuesta.replaceWith(respuestaContainer);
  }
  
  // Focus en el textarea
  setTimeout(() => {
    textareaRespuesta.focus();
  }, 100);
}

// Enviar respuesta a comentario
async function enviarRespuesta(textarea, parentId) {
  const { manga, cap } = getParams();
  const texto = textarea.value.trim();

  if (!texto) {
    mostrarNotificacion("Escribe una respuesta antes de enviar.", "warning");
    return;
  }

  const nick = usuarioActual.displayName?.trim() || usuarioActual.email?.split("@")[0] || "Anónimo";
  const respuesta = {
    usuario: nick,
    texto,
    manga,
    capitulo: cap,
    respuestaA: parentId
  };

  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(respuesta)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al enviar respuesta');
    }

    mostrarNotificacion("¡Respuesta publicada con éxito!", "success");
    cargarComentarios();
  } catch (error) {
    console.error("Error al enviar respuesta:", error);
    mostrarNotificacion("No se pudo enviar la respuesta. Inténtalo de nuevo.", "error");
  }
}

// Función para cargar respuestas de un comentario
function cargarRespuestas(container, parentId, respuestas) {
  // Ordenar respuestas por fecha
  respuestas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  
  container.innerHTML = '';
  
  respuestas.forEach(respuesta => {
    const respuestaDiv = document.createElement('div');
    respuestaDiv.className = 'respuesta-item';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'comment-user-info';
    
    const userAvatarElement = document.createElement('img');
    userAvatarElement.className = 'comment-user-avatar comment-user-avatar-small';
    
    getUserAvatar(respuesta.uid, respuesta.usuario).then(avatarUrl => {
      userAvatarElement.src = avatarUrl;
      userAvatarElement.alt = `Avatar de ${respuesta.usuario}`;
    });
    
    const username = document.createElement('span');
    username.className = 'comment-username';
    username.textContent = respuesta.usuario;
    
    if (respuesta.uid === ADMIN_UID) {
      const adminBadge = document.createElement('span');
      adminBadge.className = 'comment-admin-badge';
      adminBadge.textContent = 'Admin';
      username.appendChild(adminBadge);
    }
    
    const fechaElem = document.createElement('small');
    fechaElem.className = 'fecha-comentario';
    fechaElem.textContent = formatoFechaRelativa(respuesta.fecha);
    
    userInfo.appendChild(userAvatarElement);
    userInfo.appendChild(username);
    userInfo.appendChild(fechaElem);
    
    const textoElem = document.createElement('p');
    textoElem.className = 'comment-text';
    textoElem.textContent = respuesta.texto;
    
    respuestaDiv.appendChild(userInfo);
    respuestaDiv.appendChild(textoElem);
    
    // Botones de editar/eliminar para respuestas
    if (usuarioActual && (respuesta.uid === usuarioActual.uid || usuarioActual.uid === ADMIN_UID)) {
      const acciones = document.createElement('div');
      acciones.className = 'mt-1 comment-admin-actions';
      
      const btnEditar = document.createElement('button');
      btnEditar.className = 'btn btn-sm btn-outline-primary me-2';
      btnEditar.textContent = 'Editar';
      btnEditar.onclick = () => editarComentario(respuesta.id, respuesta, getParams().manga, getParams().cap);
      
      const btnEliminar = document.createElement('button');
      btnEliminar.className = 'btn btn-sm btn-outline-danger';
      btnEliminar.textContent = 'Eliminar';
      btnEliminar.onclick = () => eliminarComentario(respuesta.id, respuesta.uid, getParams().manga, getParams().cap);
      
      acciones.appendChild(btnEditar);
      acciones.appendChild(btnEliminar);
      respuestaDiv.appendChild(acciones);
    }
    
    container.appendChild(respuestaDiv);
  });
}

// === SISTEMA DE MODALES MODERNOS ===
function crearModal() {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';

  const modalTitle = document.createElement('h5');
  modalTitle.className = 'modal-title';
  modalHeader.appendChild(modalTitle);

  const modalClose = document.createElement('button');
  modalClose.className = 'modal-close';
  modalClose.innerHTML = '&times;';
  modalClose.onclick = () => cerrarModal(modalOverlay);
  modalHeader.appendChild(modalClose);

  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';

  const modalText = document.createElement('p');
  modalText.className = 'modal-text';
  modalBody.appendChild(modalText);

  const modalTextarea = document.createElement('textarea');
  modalTextarea.className = 'modal-textarea';
  modalTextarea.style.display = 'none'; // Oculto por defecto
  modalBody.appendChild(modalTextarea);

  const modalActions = document.createElement('div');
  modalActions.className = 'modal-actions';

  const cancelarBtn = document.createElement('button');
  cancelarBtn.className = 'modal-btn modal-btn-cancel';
  cancelarBtn.textContent = 'Cancelar';
  cancelarBtn.onclick = () => cerrarModal(modalOverlay);

  const confirmarBtn = document.createElement('button');
  confirmarBtn.className = 'modal-btn modal-btn-confirm';
  confirmarBtn.textContent = 'Confirmar';

  modalActions.appendChild(cancelarBtn);
  modalActions.appendChild(confirmarBtn);
  modalBody.appendChild(modalActions);

  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modalOverlay.appendChild(modalContent);

  // Cerrar al hacer clic fuera del modal
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) {
      cerrarModal(modalOverlay);
    }
  };

  // Cerrar con tecla Escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      cerrarModal(modalOverlay);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  document.body.appendChild(modalOverlay);

  return { modalOverlay, modalTitle, modalText, modalTextarea, confirmarBtn, cancelarBtn };
}

function mostrarModalEdicion(textoInicial, callback) {
  const { modalOverlay, modalTitle, modalText, modalTextarea, confirmarBtn } = crearModal();

  modalTitle.innerHTML = '<span class="modal-icon modal-icon-edit">✏️</span> Editar Comentario';
  modalText.textContent = 'Modifica tu comentario abajo:';
  modalTextarea.style.display = 'block';
  modalTextarea.value = textoInicial;
  modalTextarea.placeholder = 'Escribe tu comentario aquí...';
  confirmarBtn.textContent = 'Guardar Cambios';
  confirmarBtn.className = 'modal-btn modal-btn-confirm';

  // Focus en el textarea
  setTimeout(() => {
    modalTextarea.focus();
    modalTextarea.setSelectionRange(modalTextarea.value.length, modalTextarea.value.length);
  }, 300);

  confirmarBtn.onclick = () => {
    const nuevoTexto = modalTextarea.value.trim();
    if (!nuevoTexto) {
      mostrarNotificacion('El comentario no puede estar vacío', 'warning');
      return;
    }
    if (nuevoTexto === textoInicial) {
      cerrarModal(modalOverlay);
      return;
    }
    
    // Mostrar loading
    confirmarBtn.disabled = true;
    confirmarBtn.innerHTML = '<div class="spinner"></div> Guardando...';
    
    callback(nuevoTexto);
    setTimeout(() => cerrarModal(modalOverlay), 500);
  };

  abrirModal(modalOverlay);
}

function mostrarModalConfirmacion(mensaje, accion, callback) {
  const { modalOverlay, modalTitle, modalText, confirmarBtn } = crearModal();

  modalTitle.innerHTML = '<span class="modal-icon modal-icon-delete">🗑️</span> Confirmar Acción';
  modalText.textContent = mensaje;
  confirmarBtn.textContent = accion;
  confirmarBtn.className = 'modal-btn modal-btn-danger';

  confirmarBtn.onclick = () => {
    // Mostrar loading
    confirmarBtn.disabled = true;
    confirmarBtn.innerHTML = '<div class="spinner"></div> Eliminando...';
    
    callback();
    setTimeout(() => cerrarModal(modalOverlay), 500);
  };

  abrirModal(modalOverlay);
}

function abrirModal(modalOverlay) {
  modalOverlay.classList.add('show');
  document.body.style.overflow = 'hidden'; // Prevenir scroll
}

function cerrarModal(modalOverlay) {
  modalOverlay.classList.remove('show');
  document.body.style.overflow = ''; // Restaurar scroll
  setTimeout(() => {
    if (modalOverlay.parentNode) {
      modalOverlay.remove();
    }
  }, 300);
}
