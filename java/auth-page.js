const API_URL = "https://backend-bue9.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  const registerFormElement = document.getElementById("registerFormElement");
  const loginFormElement = document.getElementById("loginFormElement");

  const registerError = document.getElementById("registerError");
  const registerSuccess = document.getElementById("registerSuccess");
  const loginError = document.getElementById("loginError");

  // Cambiar pestañas
  loginTab.addEventListener("click", () => {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.classList.remove("d-none");
    registerForm.classList.add("d-none");
    clearMessages();
  });

  registerTab.addEventListener("click", () => {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    registerForm.classList.remove("d-none");
    loginForm.classList.add("d-none");
    clearMessages();
  });

  function clearMessages() {
    registerError.classList.add("d-none");
    registerSuccess.classList.add("d-none");
    loginError.classList.add("d-none");
  }

  // REGISTRO
  registerFormElement.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nick = document.getElementById("registerNick").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const confirmPassword = document.getElementById("registerConfirmPassword").value.trim();

    clearMessages();

    if (!nick || !email || !password || !confirmPassword) {
      registerError.textContent = "Por favor, completa todos los campos.";
      registerError.classList.remove("d-none");
      return;
    }

    if (password !== confirmPassword) {
      registerError.textContent = "Las contraseñas no coinciden.";
      registerError.classList.remove("d-none");
      return;
    }

    if (password.length < 6) {
      registerError.textContent = "La contraseña debe tener al menos 6 caracteres.";
      registerError.classList.remove("d-none");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nick }),
      });

      const data = await res.json();

      if (!res.ok) {
        registerError.textContent = data.error || "Error inesperado durante el registro.";
        registerError.classList.remove("d-none");
        return;
      }

      registerSuccess.innerHTML = `✅ Registro exitoso. Se ha enviado un correo de verificación a <strong>${email}</strong>. Verifica tu cuenta antes de iniciar sesión.`;
      registerSuccess.classList.remove("d-none");
      registerFormElement.reset();

      // Cambiar automáticamente a login después de unos segundos
      setTimeout(() => {
        loginTab.click();
      }, 4000);

    } catch (err) {
      registerError.textContent = "Error: " + err.message;
      registerError.classList.remove("d-none");
    }
  });

  // LOGIN
  loginFormElement.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    clearMessages();

    if (!email || !password) {
      loginError.textContent = "Por favor, completa todos los campos.";
      loginError.classList.remove("d-none");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        loginError.textContent = data.error || "Credenciales incorrectas.";
        loginError.classList.remove("d-none");
        return;
      }

      // Obtener perfil
      const perfilRes = await fetch(`${API_URL}/usuarios/perfil/${data.uid}`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });

      const perfil = await perfilRes.json();

      if (!perfilRes.ok) {
        loginError.textContent = perfil.error || "Error al obtener el perfil.";
        loginError.classList.remove("d-none");
        return;
      }

      // Guardar sesión
      localStorage.setItem("user", JSON.stringify({
        token: data.token,
        uid: data.uid,
        email,
        displayName: perfil.displayName || null,
        rol: perfil.rol || "usuario"
      }));

      // Mostrar mensaje de bienvenida y redirigir
      loginError.classList.remove("d-none");
      loginError.classList.replace("alert-danger", "alert-success");
      loginError.textContent = `Bienvenido ${perfil.displayName || ""}, redirigiendo...`;

      setTimeout(() => {
        if (perfil.rol === "admin") {
          window.location.href = "/admin.html";
        } else {
          window.location.href = "/index.html";
        }
      }, 1500);

    } catch (err) {
      loginError.textContent = "Error: " + err.message;
      loginError.classList.remove("d-none");
    }
  });
});
