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
        if (window._loginEnProceso) return;
        window._loginEnProceso = true;

        var usuario = document.getElementById('login-user').value;
        var password = document.getElementById('login-pass').value;

        if (!usuario || !password) {
            alert("Por favor llena todos los campos.");
            window._loginEnProceso = false;
            return;
        }

        // ❌ QUITAMOS el toggleLoading(true) aquí para que el login no muestre el overlay al salir

        try {
            var res = await FetchAPI("login", { user: usuario, pass: password });

            if (res && res.success) {
                localStorage.setItem('session_user', res.usuario || res.user);
                localStorage.setItem('session_userName', res.userName || "Usuario");
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('ultima_seccion', 'home');

                // Sincronizamos los datos de forma silenciosa de fondo
                if (typeof inicializarSincronizacion === 'function') {
                    await inicializarSincronizacion();
                }

                // Saltamos directo al home sin esperas ni spinners molestos
                window.location.href = "./index.html";
                
            } else {
                var msg = res && res.message ? res.message : "Usuario o contraseña incorrectos.";
                alert(msg);
                window._loginEnProceso = false;
            }
        } catch (err) {
            console.error("Error atrapado en el login:", err);
            alert("Error al conectar con el servidor. Revisa la consola.");
            window._loginEnProceso = false;
        }
    }
};

window.AuthModule = AuthModule;

// Limpieza absoluta al cargar cualquier página de acceso
document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none'; // Apagado total e inmediato
    }

    var btnToggle = document.getElementById('btn-toggle-pass');
    if (btnToggle) {
        btnToggle.addEventListener('click', AuthModule.togglePasswordVisibility);
    }
});