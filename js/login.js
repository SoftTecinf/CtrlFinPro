// ========================================================
// MÓDULO DE AUTENTICACIÓN
// ========================================================
var AuthModule = {

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

    ejecutarLogin: async function () {
        var usuario = document.getElementById('login-user').value;
        var password = document.getElementById('login-pass').value;

        if (!usuario || !password) {
            alert("Por favor llena todos los campos.");
            return;
        }

        try {
            var res = await FetchAPI("login", { user: usuario, pass: password });

            if (res && res.success) {
                localStorage.setItem('session_user', res.usuario || res.user);
                localStorage.setItem('session_userName', res.userName || "Usuario");
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('ultima_seccion', 'home');

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

window.AuthModule = AuthModule;

// Limpieza de carga al iniciar
document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }

    var btnToggle = document.getElementById('btn-toggle-pass');
    if (btnToggle) {
        btnToggle.addEventListener('click', AuthModule.togglePasswordVisibility);
    }
});