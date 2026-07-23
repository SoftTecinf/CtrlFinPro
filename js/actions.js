// 🔥 INYECTORES GLOBALES DE EMERGENCIA (Deben ir en la línea 1 de actions.js)
Object.defineProperty(window, 'seccionActual', {
    get: function () {
        return localStorage.getItem('ultima_seccion') || 'home';
    },
    configurable: true
});

Object.defineProperty(window, 'movimientos', {
    get: function () {
        // Devuelve los movimientos reales desde el estado global seguro
        return window.AppState?.movimientos || [];
    },
    configurable: true
});

window.EstadoFinanciero = {
    ingresos: 0,
    gastos: 0,
    ultimaCarga: { i: -1, g: -1 }
};

// ==========================================
// FUNCIÓN AUXILIAR PARA COMPROBANTES (NUEVA)
// ==========================================
function archivoABase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({
            nombre: file.name,
            tipo: file.type,
            datos: reader.result.split(',')[1]
        });
        reader.onerror = error => reject(error);
    });
}

// ==========================================
// FUNCIÓN DE GUARDADO PRINCIPAL (ACTUALIZADA)
// ==========================================
async function guardarRegistro(tipo) {
    let btn = document.querySelector(`#sec-${tipo}s button[onclick^="guardarRegistro"]`);
    if (!btn) return;

    const pref = tipo === 'ingreso' ? 'in' : 'ex';
    const monto = parseFloat(document.getElementById(`${pref}-monto-hidden`).value);

    if (!monto || monto <= 0) {
        alert("Por favor ingresa un monto válido.");
        return;
    }

    // 🛑 1. VALIDACIÓN DE CATEGORÍA OBLIGATORIA
    const selectCat = document.getElementById(`${pref}-categoria`);
    const valorCategoria = selectCat ? selectCat.value.trim().toLowerCase() : "";

    if (!valorCategoria || valorCategoria === "" || valorCategoria === "seleccionar categoria" || valorCategoria === "seleccionarcategoria") {
        alert("Por favor, selecciona una categoría válida.");
        return;
    }

    // 🛑 2. VALIDACIÓN DE CONCEPTO EXCLUSIVA PARA GASTOS
    const inputDesc = document.getElementById(`${pref}-desc`);
    const textoDesc = inputDesc ? inputDesc.value.trim().toUpperCase() : "";

    if (tipo === 'gasto' && !textoDesc) {
        alert("El campo de concepto es obligatorio para los registros de gastos.");
        if (inputDesc) inputDesc.focus();
        return;
    }

    // 📎 3. CAPTURA DE COMPROBANTES (Ticket, PDF y XML)
    const fileTicket = document.getElementById('file-ticket') ? document.getElementById('file-ticket').files[0] : null;
    const filePdf = document.getElementById('file-pdf') ? document.getElementById('file-pdf').files[0] : null;
    const fileXml = document.getElementById('file-xml') ? document.getElementById('file-xml').files[0] : null;

    // Convertimos los archivos seleccionados a Base64
    const comprobanteTicket = await archivoABase64(fileTicket);
    const comprobantePdf = await archivoABase64(filePdf);
    const comprobanteXml = await archivoABase64(fileXml);

    const idMovi = window.editandoId || Date.now();
    const nuevaData = {
        id: idMovi,
        tipo,
        fecha: document.getElementById(`${pref}-fecha`).value,
        cat: selectCat.value.trim().toUpperCase(),
        desc: textoDesc || 'SIN NOMBRE',
        monto,
        // Agregamos los comprobantes al objeto de envío
        ticket: comprobanteTicket,
        facturaPdf: comprobantePdf,
        facturaXml: comprobanteXml
    };

    const esEdicion = !!window.editandoId;
    const estadoAnterior = JSON.stringify(AppState.movimientos);

    if (esEdicion) {
        const idx = AppState.movimientos.findIndex(m => m.id == idMovi);
        if (idx !== -1) AppState.movimientos[idx] = nuevaData;
    } else {
        AppState.movimientos.push(nuevaData);
    }

    localStorage.setItem("financiero_state", JSON.stringify(AppState));
    refrescarVistaActual();

    const textoOriginal = btn.innerText;
    btn.disabled = true;
    btn.innerText = "PROCESANDO...";
    btn.classList.add('opacity-70');

    try {
        const res = await FetchAPI("guardarMovimiento", { data: nuevaData });
        if (!res.success) throw new Error(res.message);

        // --- Sincronización y limpieza ---
        await inicializarSincronizacion();
        refrescarVistaActual();
        limpiarFormulario(tipo);

        // Limpiamos los inputs de archivos después de un guardado exitoso
        if (document.getElementById('file-ticket')) document.getElementById('file-ticket').value = '';
        if (document.getElementById('file-pdf')) document.getElementById('file-pdf').value = '';
        if (document.getElementById('file-xml')) document.getElementById('file-xml').value = '';
        
    } catch (error) {
        console.error("Error:", error);
        AppState.movimientos = JSON.parse(estadoAnterior);
        localStorage.setItem("financiero_state", JSON.stringify(AppState));
        refrescarVistaActual();
        alert("No se pudo guardar: " + error.message);
        btn.innerText = textoOriginal;
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-70');
    }
}

function limpiarFormulario(tipo) {
    const pref = tipo === 'ingreso' ? 'in' : 'ex';

    // Lista de campos específicos
    const campos = [`${pref}-categoria`, `${pref}-desc`, `${pref}-monto-mask`, `${pref}-monto-hidden`];

    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id.includes('hidden')) ? 0 : "";
    });

    window.editandoId = null;

    // 🧹 Restablecer los textos de los comprobantes al limpiar el formulario
    const textoTicket = document.getElementById('textoTicketActual');
    const textoPdf = document.getElementById('textoPdfActual');
    const textoXml = document.getElementById('textoXmlActual');

    if (textoTicket) textoTicket.innerHTML = `<span style="color: #6b7280; font-style: italic;">No hay archivo</span>`;
    if (textoPdf) textoPdf.innerHTML = `<span style="color: #6b7280; font-style: italic;">No hay archivo</span>`;
    if (textoXml) textoXml.innerHTML = `<span style="color: #6b7280; font-style: italic;">No hay archivo</span>`;

    // Limpieza de inputs de archivos por seguridad
    if (document.getElementById('file-ticket')) document.getElementById('file-ticket').value = '';
    if (document.getElementById('file-pdf')) document.getElementById('file-pdf').value = '';
    if (document.getElementById('file-xml')) document.getElementById('file-xml').value = '';

    // Limpieza de estados visuales del botón
    const btn = document.querySelector(`#sec-${tipo}s button[onclick^="guardarRegistro"]`);
    if (btn) {
        btn.innerText = tipo === 'ingreso' ? "GUARDAR REGISTRO" : "REGISTRAR EGRESO";
        btn.classList.remove('ring-4', 'ring-amber-100', 'bg-amber-600', 'opacity-70');
        btn.disabled = false;
    }
}

async function eliminarMovimiento(id) {
    if (!confirm("¿Deseas eliminar este registro de forma permanente?")) return;

    // 1. Guardamos estado previo para revertir si algo falla
    const estadoAnterior = JSON.stringify(AppState.movimientos);

    // 2. ACTUALIZACIÓN OPTIMISTA: Borramos de la memoria inmediatamente
    AppState.movimientos = AppState.movimientos.filter(m => m.id !== id);
    localStorage.setItem("financiero_state", JSON.stringify(AppState));
    refrescarVistaActual(); // La UI se limpia al instante

    try {
        // 3. Petición al servidor
        const res = await FetchAPI("eliminarMovimiento", { id });

        if (!res || !res.success) {
            throw new Error(res?.message || "Error al conectar con el servidor");
        }

        // alert("Eliminado con éxito.");
    } catch (error) {
        // 4. REVERSIÓN SI FALLA
        console.error("Error al eliminar:", error);
        AppState.movimientos = JSON.parse(estadoAnterior);
        localStorage.setItem("financiero_state", JSON.stringify(AppState));
        refrescarVistaActual();
        alert("No se pudo eliminar el registro: " + error.message);
    }
}

async function agregarCategoria() {
    const inputCat = document.getElementById('nueva-cat-nombre');
    const selectTipo = document.getElementById('nueva-cat-tipo');
    if (!inputCat || !selectTipo) return;

    // 🌀 1. MOSTRAR SPINNER FLOTANTE
    mostrarSpinnerGlobal();

    try {
        const nom = inputCat.value.trim().toUpperCase();
        const tipo = selectTipo.value;

        if (!nom || !window.AppState) return;

        const existe = window.AppState.categorias.some(c => c.nombre.toUpperCase() === nom && c.tipo === tipo);
        if (existe) {
            alert("Esta categoría ya existe.");
            return;
        }

        const nuevaCat = {
            id: Date.now(),
            nombre: nom,
            tipo: tipo
        };

        window.AppState.categorias.push(nuevaCat);

        localStorage.setItem('cats_mxn', JSON.stringify(window.AppState.categorias));
        if (typeof guardarEstadoGlobal === 'function') {
            guardarEstadoGlobal();
        } else {
            localStorage.setItem('financiero_state', JSON.stringify(window.AppState));
        }

        inputCat.value = '';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "agregarCategoria",
                    id: nuevaCat.id,
                    nombre: nuevaCat.nombre,
                    tipo: nuevaCap.tipo
                })
            });
            const resultado = await response.json();
            if (resultado.success) {
                alert("Categoría agregada en la nube correctamente.");
            }
        } catch (error) {
            // Silencioso
        }

        if (typeof actualizarSelectsCategorias === 'function') {
            actualizarSelectsCategorias();
        }
        if (typeof abrirVistaAjustesInteligente === 'function') {
            abrirVistaAjustesInteligente();
        }
        if (typeof refrescarVistaActual === 'function') {
            refrescarVistaActual();
        }

    } catch (error) {
        // Silencioso
    } finally {
        // 🌀 2. OCULTAR SPINNER FLOTANTE (Pase lo que pase)
        ocultarSpinnerGlobal();
    }
}
async function eliminarCategoria(id) {
    if (!window.AppState) return;

    const categoriaAEliminar = window.AppState.categorias.find(c => String(c.id) === String(id));
    if (!categoriaAEliminar) return;

    const nombreCat = categoriaAEliminar.nombre;

    // Validación: Evitar borrar si hay movimientos asociados
    const tieneMovimientos = window.AppState.movimientos && window.AppState.movimientos.some(m => {
        if (!m) return false;
        const catMov = (m.cat || m.categoria || "").trim().toUpperCase();
        return catMov === nombreCat.trim().toUpperCase();
    });

    if (tieneMovimientos) {
        alert(`No se puede eliminar la categoría "${nombreCat}" porque tiene movimientos asociados.`);
        return;
    }

    if (!confirm(`¿Estás segura de que deseas eliminar la categoría "${nombreCat}"?`)) {
        return;
    }

    // 1. Filtrar localmente el estado y actualizar almacenamiento
    window.AppState.categorias = window.AppState.categorias.filter(c => String(c.id) !== String(id));
    localStorage.setItem('cats_mxn', JSON.stringify(window.AppState.categorias));
    localStorage.setItem('financiero_state', JSON.stringify(window.AppState));

    // 2. 🔥 SINCRONIZACIÓN CON GOOGLE SHEETS
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: "eliminarCategoria",
                id: id
            })
        });
        const resultado = await response.json();
        if (resultado.success) {
            alert(`Categoría "${nombreCat}" eliminada de la nube correctamente.`);
        } else {
            console.error("❌ Error en la nube al eliminar categoría:", resultado.message);
        }
    } catch (error) {
        console.error("❌ Error de red al intentar eliminar la categoría:", error);
    }

    // 3. 🔄 REFRESCAR LA PANTALLA DE INMEDIATO
    if (typeof abrirVistaAjustesInteligente === 'function') {
        abrirVistaAjustesInteligente();
    }
    if (typeof actualizarSelectsCategorias === 'function') {
        actualizarSelectsCategorias();
    }
    if (typeof refrescarVistaActual === 'function') {
        refrescarVistaActual();
    }
}

function borrarTodo() {
    if (confirm("⚠️ ¿Estás completamente seguro de borrar TODO el historial y las configuraciones del sistema? Esta acción no se puede deshacer.")) {
        localStorage.clear();
        location.reload();
    }
}

function prepararEdicion(id, tipo) {
    const mov = AppState.movimientos.find(m => m.id === id);
    if (!mov) return;

    window.editandoId = id;
    const pref = tipo === 'ingreso' ? 'in' : 'ex';

    // 1. Fecha
    const fechaObj = new Date(mov.fecha);
    document.getElementById(`${pref}-fecha`).value = fechaObj.toISOString().split('T')[0];

    // 2. Categoría - DECLARAMOS 'selectCat' SOLO UNA VEZ
    // --- NUEVA PRUEBA PARA LA CATEGORÍA ---
    const selectCat = document.getElementById(`${pref}-categoria`);

    // Forzamos un pequeño retraso para asegurar que el DOM esté listo
    setTimeout(() => {
        selectCat.value = mov.cat;

        // Si sigue sin seleccionarse, el valor no existe en la lista
        if (selectCat.value !== mov.cat) {
            console.warn("¡Cuidado! No se pudo asignar el valor. ¿Está en la lista de opciones?");
        }
    }, 200);

    // 3. Descripción y Monto
    document.getElementById(`${pref}-desc`).value = mov.desc;
    const mask = document.getElementById(`${pref}-monto-mask`);
    const hidden = document.getElementById(`${pref}-monto-hidden`);

    if (mask && hidden) {
        hidden.value = mov.monto;
        mask.value = Number(mov.monto).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    }

    // 4. Feedback
    const btn1 = document.querySelector(`#sec-${tipo}s button[onclick^="guardarRegistro"]`);
    if (btn1) {
        btn1.innerText = "ACTUALIZAR REGISTRO";
        btn1.classList.add('ring-4', 'ring-amber-100', 'bg-amber-600');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 5. 📎 Mostrar los nombres de los comprobantes actuales si existen
    const camposArchivos = [
        { url: mov.ticket, textoId: 'textoTicketActual' },
        { url: mov.facturaPdf, textoId: 'textoPdfActual' },
        { url: mov.facturaXml, textoId: 'textoXmlActual' }
    ];

    camposArchivos.forEach(item => {
        const span = document.getElementById(item.textoId);
        if (span) {
            const urlArchivo = typeof item.url === 'object' ? item.url?.url : item.url;
            const nombreArchivo = typeof item.url === 'object' ? item.url?.nombre : '';

            if (urlArchivo && urlArchivo.trim() !== "") {
                // Si hay archivo, mostramos el nombre como enlace directo para abrirlo
                span.innerHTML = `
                    <a href="${urlArchivo}" target="_blank" style="color: #0284c7; text-decoration: underline; font-weight: 500;">
                        ${nombreArchivo ? nombreArchivo : 'Ver archivo cargado'}
                    </a>
                `;
            } else {
                // Si no hay, dejamos el texto sencillo
                span.innerHTML = `<span style="color: #6b7280; font-style: italic;">No hay archivo</span>`;
            }
        }
    });
}

// ==========================================
// CONTROL DE GRÁFICOS GLOBALES
// ==========================================
window.chartH = window.chartH || null;
window.miChartResumenInstance = window.miChartResumenInstance || null;
window.ultimaCarga = { i: -1, g: -1 };

// --- GRÁFICO 1: PANTALLA INICIO (HOME) ---
window.actualizarGraficoDistribucion = function () {
    const canvas = document.getElementById('chartHome');
    if (!canvas) return;

    const ingresos = window.EstadoFinanciero?.ingresos || 0;
    const gastos = window.EstadoFinanciero?.gastos || 0;

    // El cerrojo para evitar parpadeos innecesarios
    if (window.chartH && window.ultimaCarga?.i === ingresos && window.ultimaCarga?.g === gastos) {
        return;
    }

    if (window.chartH) {
        window.chartH.destroy();
    }

    const ctx = canvas.getContext('2d');
    window.chartH = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{
                data: [ingresos, gastos],
                backgroundColor: ['#D6C7B3', '#E5E7EB']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    window.ultimaCarga = { i: ingresos, g: gastos };
};

// --- BUCLE DE SEGURIDAD PARA HOME ---
window.addEventListener('load', async () => {
    // Ocultamos el mensaje de carga apenas arranca el Home
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
});

function mostrarSpinnerGlobal() {
    const spinner = document.getElementById('spinner-global'); // Asegúrate de que este sea el ID de tu contenedor de carga
    if (spinner) {
        spinner.classList.remove('hidden');
        spinner.style.display = 'flex'; // O 'block' según como lo tengas diseñado
    }
}

function ocultarSpinnerGlobal() {
    const spinner = document.getElementById('spinner-global');
    if (spinner) {
        spinner.classList.add('hidden');
        spinner.style.display = 'none';
    }
}

// --- CONTROL DE SESIÓN ---
function cerrarSesion() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('session_user');
    localStorage.removeItem('session_userName');
    localStorage.removeItem('ultima_seccion');
    
    window.location.replace("./login.html");
}

function obtenerPeriodoActual() {
    // Detecta la sección activa del estado global seguro
    const seccion = window.AppState?.seccionActual || 'home';
    let pref = seccion === 'ingresos' ? 'in' : (seccion === 'gastos' ? 'ex' : 'res');

    const mesEl = document.getElementById(`${pref}-mes`);
    const anioEl = document.getElementById(`${pref}-año`);

    return {
        mes: mesEl ? parseInt(mesEl.value) : new Date().getMonth(),
        año: anioEl ? parseInt(anioEl.value) : new Date().getFullYear()
    };
}

function obtenerMovimientosFiltrados() {
    const { mes, año } = obtenerPeriodoActual(); // mes viene de 0 a 11 (ej. Julio es 6)
    const listaMovs = window.movimientos || [];

    return listaMovs.filter(m => {
        if (!m.fecha) return false;

        // Extraemos directamente los primeros 10 caracteres (YYYY-MM-DD) ignorando horas y zonas horarias
        const fechaStr = String(m.fecha).split('T')[0];
        const partes = fechaStr.split('-');

        if (partes.length < 3) return false;

        const anioMov = parseInt(partes[0], 10);
        const mesMov = parseInt(partes[1], 10) - 1; // Ajustamos a base 0 (Enero = 0, Julio = 6)
        const diaMov = parseInt(partes[2], 10);

        // Validamos si coincide de forma exacta con el periodo seleccionado
        return mesMov === mes && anioMov === año;
    });
}

// ========================================================
// FUNCIÓN DE REPORTE FINANCIERO INTEGRADO (4 PESTAÑAS)
// ========================================================
async function exportarFiltradoXLSX(tipo) {
    // 🌀 1. MOSTRAR SPINNER AL INICIAR EL PROCESO
    const spinner = document.getElementById('spinner-global'); // Revisa el ID de tu spinner en el HTML
    if (spinner) spinner.classList.remove('hidden');

    try {
        let filtrados = [];
        if (typeof obtenerMovimientosFiltrados === 'function') {
            filtrados = obtenerMovimientosFiltrados();
        }

        if (!filtrados || filtrados.length === 0) {
            const listaGeneral = window.listaIngresos || window.movimientos || [];
            filtrados = listaGeneral.filter(m => String(m.tipo || '').toLowerCase().includes(tipo.toLowerCase()));
        }

        if (!filtrados.length) {
            alert(`Sin movimientos de ${tipo} para el periodo seleccionado.`);
            return; // El bloque finally se encargará de ocultar el spinner
        }

        const inputsFecha = document.querySelectorAll('input[type="date"]');
        const txtInicio = inputsFecha.length > 0 ? inputsFecha[0].value : '';
        const txtFin = inputsFecha.length > 1 ? inputsFecha[1].value : '';

        const ahora = new Date();
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Detalle');
        let filaFil = 1;

        const periodoTexto = (txtInicio && txtFin) ? `DEL ${txtInicio} AL ${txtFin}` : `PERIODO ACTUAL`;

        filaFil = Encabezado(ws, "DETALLE DE " + tipo.toUpperCase(), filaFil);
        filaFil = Encabezado(ws, periodoTexto, filaFil);
        filaFil = Encabezado(ws, "GENERADO EL " + ahora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), filaFil);
        filaFil++; 

        if (typeof llenarTablaDetalle === 'function') {
            llenarTablaDetalle(ws, filtrados, filaFil);
        }

        if (typeof descargarArchivo === 'function') {
            descargarArchivo(workbook, "Detalle_" + tipo + "_" + (txtInicio || 'reporte') + "_al_" + (txtFin || 'fecha'));
        }

    } catch (error) {
        console.error("❌ Error en el proceso:", error);
    } finally {
        // 🌀 2. OCULTAR SPINNER AL TERMINAR (Éxito o Error)
        if (spinner) spinner.classList.add('hidden');
    }
}

window.generarLibroContable = generarLibroContable;

async function exportarFiltradoXLSX(tipo) {
    // 1. Tomamos los datos directamente de la función que alimenta la tabla visual en pantalla
    let filtrados = [];
    if (typeof obtenerMovimientosFiltrados === 'function') {
        filtrados = obtenerMovimientosFiltrados();
    }

    // Si por alguna razón la función global no trae nada, respaldamos con la lista general filtrada por el tipo actual
    if (!filtrados || filtrados.length === 0) {
        const listaGeneral = window.listaIngresos || window.movimientos || [];
        filtrados = listaGeneral.filter(m => String(m.tipo || '').toLowerCase().includes(tipo.toLowerCase()));
    }

    if (!filtrados.length) {
        return alert(`Sin movimientos de ${tipo} para el periodo seleccionado.`);
    }

    // 2. Extraer las fechas de los inputs visuales para el título del reporte
    const inputsFecha = document.querySelectorAll('input[type="date"]');
    const txtInicio = inputsFecha.length > 0 ? inputsFecha[0].value : '';
    const txtFin = inputsFecha.length > 1 ? inputsFecha[1].value : '';

    const ahora = new Date();
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Detalle');
    let filaFil = 1;

    const periodoTexto = (txtInicio && txtFin) ? `DEL ${txtInicio} AL ${txtFin}` : `PERIODO ACTUAL`;

    filaFil = Encabezado(ws, "DETALLE DE " + tipo.toUpperCase(), filaFil);
    filaFil = Encabezado(ws, periodoTexto, filaFil);
    filaFil = Encabezado(ws, "GENERADO EL " + ahora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), filaFil);
    filaFil++; 

    if (typeof llenarTablaDetalle === 'function') {
        llenarTablaDetalle(ws, filtrados, filaFil);
    } else {
        console.error("❌ Error: La función 'llenarTablaDetalle' no está definida.");
    }

    if (typeof descargarArchivo === 'function') {
        descargarArchivo(workbook, "Detalle_" + tipo + "_" + (txtInicio || 'reporte') + "_al_" + (txtFin || 'fecha'));
    } else {
        console.error("❌ Error: La función 'descargarArchivo' no está definida.");
    }
}

// Exponer globalmente para que el HTML la reconozca en el onclick
function llenarTablaDetalle(ws, datos, filaLle) {
    ws.views = [{ showGridLines: false }];
    // Configuramos el encabezado de la tabla en la fila indicada
    const head = ws.getRow(filaLle);
    head.values = ['FECHA', 'CATEGORÍA', 'DESCRIPCIÓN', 'MONTO'];

    head.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7E705B' } };
        c.alignment = { horizontal: 'center' };
    });

    head.commit();
    filaLle++; // Pasamos a la siguiente fila para los registros

    // Llenamos los datos de los movimientos filtrados
    datos.forEach((d, i) => {
        const r = ws.getRow(filaLle);

        // Convertir la fecha al formato formal DD/MM/YYYY para que luzca ordenada en el Excel
        let fechaFormateada = d.fecha;
        if (d.fecha) {
            const fechaObj = new Date(d.fecha);
            if (!isNaN(fechaObj.getTime())) {
                const dia = String(fechaObj.getDate()).padStart(2, '0');
                const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                const anio = fechaObj.getFullYear();
                fechaFormateada = `${dia}/${mes}/${anio}`;
            }
        }

        r.values = [fechaFormateada, d.cat, d.desc, d.monto];

        const colorFila = (i % 2 === 0) ? 'FFF2ECE5' : 'FFB9AB97';

        r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorFila } };
            cell.font = { size: 12, color: { argb: 'FF45423E' } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } } };

            // Alinear la fecha al centro y dar formato de moneda a la columna de monto (Columna 4)
            if (colNumber === 1) {
                cell.alignment = { horizontal: 'center' };
            }
            if (colNumber === 4) {
                cell.numFmt = '"$"#,##0.00';
                cell.alignment = { horizontal: 'right' };
            }
        });

        r.commit();
        filaLle++;
    });

    // Ajustar el ancho automático de las columnas
    ws.columns.forEach(c => c.width = 22);
}

window.llenarTablaDetalle = llenarTablaDetalle;
// ========================================================
// --- FUNCIONES AUXILIARES PARA GENERACIÓN DE EXCEL ---
// ========================================================

function Encabezado(ws, texto, fila) {
    ws.mergeCells(`A${fila}:D${fila}`);
    const cell = ws.getCell(`A${fila}`);
    cell.value = texto.toUpperCase();
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF45423E' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Configuración estética base de la pestaña
    ws.views = [{ showGridLines: true }];
    ws.getRow(fila).height = 25;

    // Definimos anchos fijos proporcionales una sola vez por pestaña
    ws.getColumn('A').width = 35; // Categoría / Concepto
    ws.getColumn('B').width = 22; // Montos financieros
    ws.getColumn('C').width = 15; // Columnas auxiliares si aplican
    ws.getColumn('D').width = 15;

    return fila + 1;
}

function TitRepCont(ws, tit, monto, fila) {
    ws.getRow(fila).height = 22;

    const cellA = ws.getCell(`A${fila}`);
    cellA.value = tit.toUpperCase();
    cellA.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7E705B' } };
    cellA.alignment = { vertical: 'middle', horizontal: 'left' };

    const cellB = ws.getCell(`B${fila}`);
    // Si no viene monto (es solo título de sección), dejamos la celda vacía de forma limpia
    cellB.value = monto !== null && monto !== undefined ? monto : "";
    cellB.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7E705B' } };
    cellB.alignment = { vertical: 'middle', horizontal: 'right' };
    if (monto !== null && monto !== undefined) {
        cellB.numFmt = '"$"#,##0.00';
    }

    return fila + 1;
}

function DatoRepCont(ws, cat, monto, fila) {
    ws.getRow(fila).height = 20;

    // Paleta arena y crema desaturada para filas cebra
    const colorFondo = (fila % 2 !== 0) ? 'FFF5F2EB' : 'FFFFFFFF';
    const bordeGrisFino = { style: 'thin', color: { argb: 'FFEAE6DF' } };

    const cellA = ws.getCell(`A${fila}`);
    cellA.value = cat.toUpperCase();
    cellA.font = { name: 'Arial', size: 10, color: { argb: 'FF45423E' } };
    cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorFondo } };
    cellA.alignment = { vertical: 'middle', horizontal: 'left' };
    cellA.border = { bottom: bordeGrisFino, right: bordeGrisFino };

    const cellB = ws.getCell(`B${fila}`);
    cellB.value = monto;
    cellB.font = { name: 'Arial', size: 10, color: { argb: 'FF45423E' } };
    cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorFondo } };
    cellB.alignment = { vertical: 'middle', horizontal: 'right' };
    cellB.numFmt = '"$"#,##0.00';
    cellB.border = { bottom: bordeGrisFino };

    return fila + 1;
}

function UtiNeta(ws, tit, monto, utilidad, fila) {
    ws.getRow(fila).height = 24;

    const cellA = ws.getCell(`A${fila}`);
    cellA.value = tit.toUpperCase();
    cellA.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF45423E' } }; // Fondo oscuro distinguible
    cellA.alignment = { vertical: 'middle', horizontal: 'left' };

    const cellB = ws.getCell(`B${fila}`);
    // 🔥 CORRECCIÓN CLAVE: Asigna el valor real de la utilidad calculada en lugar del acumulado de gastos
    cellB.value = utilidad;
    cellB.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: utilidad >= 0 ? 'FFFFFFFF' : 'FFFF8A8A' } // Blanco si es positivo, Rojo suave si es negativo
    };
    cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF45423E' } };
    cellB.alignment = { vertical: 'middle', horizontal: 'right' };
    cellB.numFmt = '"$"#,##0.00';

    return fila + 1;
}

async function descargarArchivo(workbook, nombre) { 
    const buffer = await workbook.xlsx.writeBuffer(); 
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); 
    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(blob); 
    link.download = `${nombre}.xlsx`; 
    link.click(); 
}