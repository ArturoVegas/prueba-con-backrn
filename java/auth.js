const API_BASE = 'https://backend-bue9.onrender.com/api';

// --- Obtener token fresco ---
async function getFreshToken() {
  try {
    const userSession = getUserSession();
    if (!userSession || !userSession.email) {
      throw new Error('No hay sesión de usuario');
    }

    // Intentar renovar el token a través del backend
    // Por ahora, como no tenemos endpoint de renovación,
    // simplemente pediremos al usuario que vuelva a iniciar sesión
    console.log('Token expirado. Necesitas iniciar sesión nuevamente.');
    
    // Limpiar sesión y redirigir al login
    logout();
    return null;
    
  } catch (error) {
    console.error('Error obteniendo token fresco:', error);
    logout();
    return null;
  }
}

// --- Hacer petición con token automático ---
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

// --- Obtener perfil usuario desde backend ---
async function loadUserProfileData(uid, token) {
  try {
    const res = await makeAuthenticatedRequest(`${API_BASE}/usuarios/perfil/${uid}`, {
      method: 'GET'
    });
    if (!res.ok) throw new Error('No se pudo cargar perfil');
    return await res.json();
  } catch (error) {
    console.error('Error cargando datos del usuario:', error);
    return null;
  }
}

// --- Actualizar UI según usuario logueado ---
async function updateAuthUI(user) {
  const authDropdown = document.getElementById('authDropdown');
  const dropdownMenu = document.querySelector('#authDropdown + .dropdown-menu');

  if (!authDropdown || !dropdownMenu) return;

  if (user) {
    const { uid, email, displayName, token } = user;
    const nameToShow = displayName || email.split('@')[0];

    // Intentar obtener datos actualizados del perfil
    const userData = await loadUserProfileData(uid, token);
    const avatarUrl = userData?.avatarURL
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameToShow)}&background=0d6efd&color=fff&size=32`;

    authDropdown.innerHTML = `
      <img src="${avatarUrl}" alt="Avatar" class="user-avatar-small me-2"
           style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
      <span class="d-none d-md-inline">${nameToShow}</span>
    `;

    const currentPath = window.location.pathname;
    const isInSubfolder = currentPath.includes('/html/');
    const perfilPath = isInSubfolder ? 'perfilUsuario.html' : './html/perfilUsuario.html';

    dropdownMenu.innerHTML = `
      <li>
        <div class="dropdown-header d-flex align-items-center py-2">
          <img src="${avatarUrl}" alt="Avatar" class="me-2"
               style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
          <div>
            <div class="fw-bold">${nameToShow}</div>
            <small class="text-muted">${email}</small>
          </div>
        </div>
      </li>
      <li><hr class="dropdown-divider"></li>
      <li><a class="dropdown-item" href="${perfilPath}"><i class="bi bi-person me-2"></i>Mi perfil</a></li>
      <li><a class="dropdown-item" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</a></li>
    `;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', e => {
        e.preventDefault();
        logout();
      });
    }
  } else {
    // No hay usuario logueado
    authDropdown.innerHTML = `<i class="bi bi-person-circle me-1"></i>Cuenta`;

    const currentPath = window.location.pathname;
    const isInSubfolder = currentPath.includes('/html/');
    const authPath = isInSubfolder ? '../html/auth.html' : './html/auth.html';

    dropdownMenu.innerHTML = `
      <li><a class="dropdown-item" href="${authPath}"><i class="bi bi-box-arrow-in-right me-2"></i>Iniciar sesión</a></li>
      <li><a class="dropdown-item" href="${authPath}"><i class="bi bi-person-plus me-2"></i>Registrarse</a></li>
    `;
  }
}

// --- Guardar usuario en localStorage ---
function saveUserSession(user) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', user.token);
}

// --- Obtener usuario de localStorage ---
function getUserSession() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// --- Limpiar sesión ---
function clearUserSession() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
}

// --- Logout ---
function logout() {
  // Cerrar sesión en Firebase también
  if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
    firebase.auth().signOut();
  }
  clearUserSession();
  window.location.reload();
}

// --- Verificar sesión y actualizar UI ---
async function checkSessionAndUpdateUI() {
  const user = getUserSession();
  await updateAuthUI(user);
}

// --- Login ---
async function login(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error en login');

    // Guardamos token, uid, email y displayName (si viene)
    saveUserSession({
      token: data.token,
      uid: data.uid,
      email: data.email,
      displayName: data.displayName || null,
    });

    await checkSessionAndUpdateUI();

    return true;
  } catch (error) {
    alert(error.message);
    return false;
  }
}

// --- Registro ---
async function register(email, password, nick) {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nick }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error en registro');

    alert(data.message);
    return true;
  } catch (error) {
    alert(error.message);
    return false;
  }
}

// --- Guardar perfil ---
async function guardarPerfil(uid, email, displayName, rol = 'usuario') {
  try {
    const res = await makeAuthenticatedRequest(`${API_BASE}/usuarios/guardar-perfil`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uid, email, displayName, rol }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error guardando perfil');

    alert(data.mensaje || 'Perfil guardado');
    return true;
  } catch (error) {
    alert(error.message);
    return false;
  }
}

// --- Inicializar autenticación ---
async function initAuth() {
  await checkSessionAndUpdateUI();
}

// --- Ejecutar al cargar DOM ---
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
