// ========================================================
// MÓDULO DE AUTENTICACIÓN
// ========================================================
var AuthModule = {

    // Función para ver/ocultar la contraseña
    togglePasswordVisibility: function () {
        var passInput = document.getElementById('login-pass');
        var eyeOpen = document.getElementById('eye-open');
        var eyeClosed = document.getElementById('eye-closed');

        if (!passInput) return;

        if (passInput.type === 'password') {
            passInput.type = 'text';
            if (eyeOpen) eyeOpen.style.display = 'none';
            if (eyeClosed) eyeClosed.style.display = 'block';
        } else {
            passInput.type = 'password';
            if (eyeOpen) eyeOpen.style.display = 'block';
            if (eyeClosed) eyeClosed.style.display = 'none';
        }
    },

    // Función para procesar el inicio de sesión
    ejecutarLogin: async function (event) {
        if (event) event.preventDefault();

        var usuario = document.getElementById('login-user').value;
        var password = document.getElementById('login-pass').value;

        if (!usuario || !password) {
            alert("Por favor llena todos los campos.");
            return;
        }

        try {
            var res = await FetchAPI("login", { user: usuario, pass: password });

            if (res && res.success) {
                // Guardamos la sesión
                localStorage.setItem('session_user', res.usuario || res.user);
                localStorage.setItem('session_userName', res.userName || "Usuario");
                localStorage.setItem('isLoggedIn', 'true');

                // Forzamos que la sección inicial sea 'home' obligatoriamente tras iniciar sesión
                localStorage.setItem('ultima_seccion', 'home');

                // Redirección
                window.location.href = "./index.html";
            } else {
                var msg = res && res.message ? res.message : "Usuario o contraseña incorrectos.";
                var errorLabel = document.getElementById('login-error');

                if (errorLabel) {
                    errorLabel.innerText = msg;
                    errorLabel.classList.remove('hidden');
                } else {
                    alert(msg);
                }
            }
        } catch (err) {
            console.error("Error en la petición de login:", err);
            alert("Hubo un problema al conectar con el servidor.");
        }
    }
};

// Lo registramos en la ventana global
window.AuthModule = AuthModule;

// ========================================================
// INICIALIZACIÓN Y QUITADO DE CARGA
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Ocultar el overlay de carga de forma inmediata al cargar el DOM
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }

    // 2. Vincular el botón del ojo para ver/ocultar contraseña
    var btnToggle = document.getElementById('btn-toggle-pass');
    if (btnToggle) {
        btnToggle.addEventListener('click', AuthModule.togglePasswordVisibility);
    }
});