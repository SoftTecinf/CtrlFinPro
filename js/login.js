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
        var usuarioInput = document.getElementById('login-user');
        var passwordInput = document.getElementById('login-pass');
        var errorLabel = document.getElementById('login-error');

        var usuario = usuarioInput ? usuarioInput.value.trim() : '';
        var password = passwordInput ? passwordInput.value.trim() : '';

        console.log("Valor leído de usuario:", usuario);
        console.log("Valor leído de contraseña:", password);

        if (!usuario || !password) {
            if (errorLabel) {
                errorLabel.innerText = "Por favor llena todos los campos.";
                errorLabel.classList.remove('hidden');
            } else {
                alert("Por favor llena todos los campos.");
            }
            return;
        }

        // Activamos el spinner solo cuando los datos sí están completos
        if (typeof toggleLoading === 'function') {
            toggleLoading(true);
        }

        await new Promise(resolve => requestAnimationFrame(resolve));

        try {
            var res = await FetchAPI("login", { usuario: usuario, password: password });

            if (res && res.success) {
                localStorage.setItem('session_user', res.usuario);
                localStorage.setItem('session_userName', res.userName);

                if (errorLabel) {
                    errorLabel.classList.add('hidden');
                }

                setTimeout(() => {
                    window.location.href = "./index.html";
                }, 600);
            } else {
                if (typeof toggleLoading === 'function') {
                    toggleLoading(false);
                }
                var msg = res && res.message ? res.message : "Usuario o contraseña incorrectos.";
                if (errorLabel) {
                    errorLabel.innerText = msg;
                    errorLabel.classList.remove('hidden');
                }
            }
        } catch (err) {
            if (typeof toggleLoading === 'function') {
                toggleLoading(false);
            }
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