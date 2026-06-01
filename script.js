/* ============================================================
   🔹 SCRIPT.JS: MOTOR COMPACTO v4.0 (BLOQUE 1 DE 4)
   ============================================================ */

const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbw8xeCdKoQFS6G-12ywQPNJDoayxgxNwqT0nxLuIjX7XLdiFhrvQH11GnWH_oJtEk_Q-g/exec';

// --- ESTADOS GLOBALES ---
let cacheEmpresas = [];
let cacheEmpleados = [];
let cacheGremios = [];
let cuitEmpresaActiva = null;
let listaParaImprimir = [];
let categoriasTemporales = [];
let conceptosTemporales = [];

// --- LOGIN Y SEGURIDAD ---
async function validarAcceso(user, pass) {
    // 🔴 PARCHE TEMPORAL PARA VS CODE (Go Live)
    // Si detecta que estás en tu compu local, te deja entrar directo
    if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
        console.warn("⚠️ MODO DESARROLLO LOCAL: Saltando validación de Vercel.");
        sessionStorage.setItem("sueldos_auth", "true");
        mostrarSistema();
        return; // Corta la ejecución acá para no pedirle nada a Vercel
    }

    // Lógica real para cuando esté subido a Vercel
    try {
        const respuesta = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, pass })
        });
        
        const data = await respuesta.json();
        
        if (data.success) {
            sessionStorage.setItem("sueldos_auth", "true");
            mostrarSistema();
        } else {
            document.getElementById('error-login').classList.remove('d-none');
        }
    } catch (error) {
        console.error("Error en login:", error);
        document.getElementById('error-login').classList.remove('d-none');
    }
}


async function mostrarSistema() {
    document.getElementById('pantalla-login').classList.add('d-none');
    document.getElementById('app-sistema').classList.remove('d-none');
    mostrarSeccion('inicio');

    try {
        await cargarEmpresas();
        await cargarGremios(); // Dejamos listo el llamado para cuando acoplemos gremios
    } catch (error) { console.error("Error inicial:", error); }
}

function cerrarSesion() {
    sessionStorage.clear();
    location.reload();
}

// --- NAVEGACIÓN ---
function mostrarSeccion(id) {
    const secciones = document.querySelectorAll('.seccion-app');
    secciones.forEach(s => s.classList.add('d-none'));
    const seccionObjetivo = document.getElementById('sec-' + id);
    if (seccionObjetivo) {
        seccionObjetivo.classList.remove('d-none');
        window.scrollTo(0, 0);
    }
    if (id === 'empresas') {
        cuitEmpresaActiva = null;
        resetearVistaLiquidacion();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Aplicar formato de CUIL en vivo al input de empleado
    const inputCuil = document.getElementById('empl-cuil');
    if (inputCuil) {
        inputCuil.addEventListener('input', function() { 
            formatearCUIL(this); 
        });
    }

    // 🔴 NUEVO: Aplicar el mismo formato al CUIT de la Empresa
    const inputCuitEmpresa = document.getElementById('emp-cuit');
    if (inputCuitEmpresa) {
        inputCuitEmpresa.addEventListener('input', function() { 
            formatearCUIL(this); 
        });
    }

    if (sessionStorage.getItem("sueldos_auth") === "true") mostrarSistema();
    
    // Capturamos el submit del formulario de login
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.onsubmit = async (e) => {
            e.preventDefault();
            const u = document.getElementById('user-login').value;
            const p = document.getElementById('pass-login').value;
            await validarAcceso(u, p);
        };
    }
    
    // Vinculación de formularios nativos
    const formEmpresa = document.getElementById('form-empresa');
    if (formEmpresa) formEmpresa.onsubmit = guardarEmpresa;
    
    const formEmpleado = document.getElementById('form-empleado');
    if (formEmpleado) formEmpleado.onsubmit = guardarEmpleado;

    const formGremio = document.getElementById('form-gremio');
    if (formGremio) formGremio.onsubmit = guardarGremio;
});

/* ============================================================
   🏢 GESTIÓN DE EMPRESAS
   ============================================================ */
async function cargarEmpresas() {
    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empresas&t=${Date.now()}`);
        cacheEmpresas = await resp.json();
        renderizarTablaEmpresas();
    } catch (e) { console.error("Error al cargar empresas:", e); }
}

function renderizarTablaEmpresas() {
    const tabla = document.getElementById('tabla-empresas');
    if (!tabla) return;
    
    tabla.innerHTML = cacheEmpresas.map(emp => {
        const razonSocial = emp[0] || "Sin Nombre";
        const direccion = emp[1] || "Sin Dirección";
        const cuit = (emp[2] || "").toString().trim();

        // Escapamos los textos de forma segura para pasarlos por los botones
        const nombreEscaped = encodeURIComponent(razonSocial);
        const direccionEscaped = encodeURIComponent(direccion);
        const cuitEscaped = encodeURIComponent(cuit);

        return `
        <tr>
            <td class="fw-bold text-primary cursor-pointer text-uppercase" onclick="verDetalleEmpresa('${cuit}')">${razonSocial}</td>
            <td>${cuit}</td>
            <td>${direccion}</td>
            <td class="text-end pe-3">
                <button class="btn btn-sm btn-outline-warning me-1" onclick="prepararEdicionEmpresa('${nombreEscaped}', '${direccionEscaped}', '${cuitEscaped}')" title="Editar Empresa">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarEmpresa('${cuit}')" title="Eliminar Empresa">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function abrirModalEmpresa() {
    document.getElementById('form-empresa').reset();
    document.getElementById('emp-cuit-original').value = ""; // Vaciamos para indicar que es ALTA
    document.getElementById('titulo-modal-empresa').innerText = "NUEVA EMPRESA";
    document.getElementById('btn-guardar-empresa').innerText = "REGISTRAR EMPRESA";
    
    new bootstrap.Modal(document.getElementById('modalEmpresa')).show();
}



async function guardarEmpresa(e) {
    if (e) e.preventDefault();
    
    const btn = document.getElementById('btn-guardar-empresa');
    if (btn) btn.disabled = true;

    const cuitOriginal = document.getElementById('emp-cuit-original').value.trim();
    const empleador = document.getElementById('emp-empleador').value.trim();
    const direccion = document.getElementById('emp-direccion').value.trim();
    const cuit = document.getElementById('emp-cuit').value.trim();
    
    const esEdicion = cuitOriginal !== "";

    const datos = {
        action: esEdicion ? 'editarEmpresa' : 'crearEmpresa',
        cuitOriginal: cuitOriginal,
        empleador: empleador,
        direccion: direccion,
        cuit: cuit
    };

    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify(datos) });
        const respuestaTexto = await resp.text();
        
        if (respuestaTexto.includes("OK")) {
            mostrarAlertaPersonalizada("Éxito", esEdicion ? "Empresa actualizada con éxito." : "Empresa registrada con éxito.", "exito");
            
            const modalEl = document.getElementById('modalEmpresa');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            
            await cargarEmpresas();
        } else {
            mostrarAlertaPersonalizada("Error", respuestaTexto, "error");
        }
    } catch (err) { 
        mostrarAlertaPersonalizada("Error", "Error al procesar empresa: " + err.message, "error"); 
    } finally { 
        if (btn) btn.disabled = false; 
    }
}

function prepararEdicionEmpresa(nombreEscaped, direccionEscaped, cuitEscaped) {
    document.getElementById('form-empresa').reset();
    
    const nombre = decodeURIComponent(nombreEscaped);
    const direccion = decodeURIComponent(direccionEscaped);
    const cuit = decodeURIComponent(cuitEscaped);

    document.getElementById('emp-empleador').value = nombre;
    document.getElementById('emp-direccion').value = direccion;
    document.getElementById('emp-cuit').value = cuit;
    
    // Guardamos la llave para que el backend busque la fila exacta sin duplicar
    document.getElementById('emp-cuit-original').value = cuit;
    
    document.getElementById('titulo-modal-empresa').innerText = "EDITAR EMPRESA";
    document.getElementById('btn-guardar-empresa').innerText = "GUARDAR CAMBIOS";

    new bootstrap.Modal(document.getElementById('modalEmpresa')).show();
}

function eliminarEmpresa(cuit) {
    // 🟢 Integrado con tu nuevo sistema de alertas estilizadas
    mostrarAlertaPersonalizada(
        "¿Eliminar Empresa?", 
        `¿Estás seguro de eliminar por completo la empresa con CUIT ${cuit}?\nSe borrará de forma permanente de la base de datos.`, 
        "peligro", 
        () => ejecutarEliminacionEmpresa(cuit)
    );
}

async function ejecutarEliminacionEmpresa(cuit) {
    try {
        const resp = await fetch(URL_WEB_APP, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'eliminarEmpresa', cuit: cuit }) 
        });
        const texto = await resp.text();
        if (texto === "OK") {
            mostrarAlertaPersonalizada("Eliminado", "La empresa fue borrada correctamente.", "exito");
            await cargarEmpresas();
        } else {
            mostrarAlertaPersonalizada("Error", texto, "error");
        }
    } catch (e) { 
        mostrarAlertaPersonalizada("Error de conexión", "No se pudo conectar con el servidor para eliminar la empresa.", "error"); 
    }
}

async function verDetalleEmpresa(cuit) {
    if (!cuit) return;
    cuitEmpresaActiva = cuit.toString().trim();
    
    // Forzamos una búsqueda limpia quitando espacios en blanco de ambos lados
    const emp = cacheEmpresas.find(e => e && e[2] && e[2].toString().trim() === cuitEmpresaActiva);
    
    // Si no encuentra la empresa por CUIT estricto, usamos el nombre (índice 0) como plan B para que NO se salga en silencio
    const datosEmpresa = emp || cacheEmpresas[0] || ["Empresa", "", cuitEmpresaActiva];

    const cabecera = document.getElementById('cabecera-empresa-detalle');
    if (cabecera) {
        cabecera.innerHTML = `<h2 class="fw-bold mb-0">${datosEmpresa[0]}</h2><p class="mb-0 opacity-75">CUIT: ${datosEmpresa[2]}</p>`;
    }
    
    // Forzamos el salto de pantalla sí o sí
    mostrarSeccion('detalle-empresa');
    
    // Ejecutamos la carga real de los empleados
    await cargarEmpleadosEmpresa(cuitEmpresaActiva);
    
    // Cargamos los inputs mensuales
    if (typeof cargarDatosMensualesEmpresa === "function") {
        cargarDatosMensualesEmpresa();
    }
}
// 🔴 PARCHE DE SEGURIDAD NATIVO: Evita que el navegador se clave por funciones faltantes




function guardarCambiosEmpresa() {
    alert("✅ Datos mensuales retenidos temporalmente.");
}
/* ============================================================
   👤 GESTIÓN DE EMPLEADOS (BLOQUE 2 DE 4)
   ============================================================ */
async function cargarEmpleadosEmpresa(cuit) {
    const cuerpo = document.getElementById('tabla-empleados-cuerpo');
    if (!cuerpo) return;

    cuerpo.innerHTML = '<tr><td colspan="5" class="text-center">Cargando empleados...</td></tr>';

    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empleados&t=${Date.now()}`);
        cacheEmpleados = await resp.json();

        if (!Array.isArray(cacheEmpleados)) {
            cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error de formato.</td></tr>';
            return;
        }

        const cuitBuscado = cuit.toString().trim();
        const filtrados = cacheEmpleados.filter(em => {
            if (!em || !Array.isArray(em)) return false;
            return (em[9] || "").toString().trim() === cuitBuscado;
        });

        if (filtrados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay empleados registrados.</td></tr>';
            return;
        }

        cuerpo.innerHTML = filtrados.map(em => {
            const legajo = em[0] || '';
            const nombre = em[1] || 'Sin Nombre';
            const cuil = em[2] || '---';
            const tarea = em[4] || 'Sin Cargo';
            
            // 🔴 NUEVA LÓGICA DE ESTADO (Columna O en Sheets = Índice 14)
            const estado = em[14] ? em[14].toString().toUpperCase().trim() : 'ACTIVO';
            const esInactivo = estado === 'INACTIVO';
            const opacidadFila = esInactivo ? 'opacity-50 bg-light' : '';
            const checkDisabled = esInactivo ? 'disabled' : '';
            const badgeEstado = esInactivo ? '<span class="badge bg-danger ms-2" style="font-size: 0.65rem;">INACTIVO</span>' : '';

            return `
            <tr class="${opacidadFila}">
                <td class="col-check d-none align-middle text-center" style="width: 120px;">
                    <input type="checkbox" class="form-check-input check-empleado border-secondary shadow-sm fs-5 m-0" style="cursor: pointer;" data-cuil="${cuil}" ${checkDisabled}>
                </td>
                <td class="fw-bold text-uppercase cursor-pointer ${esInactivo ? 'text-secondary' : 'text-primary'}" onclick="verFichaEmpleado('${cuil}', '${legajo}')" title="Ver Ficha">
                    <i class="bi bi-person-lines-fill me-1"></i> ${nombre} ${badgeEstado}
                </td>
                <td>${cuil}</td>
                <td><span class="badge bg-light text-dark border">${tarea}</span></td>
                <td class="text-end pe-3">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editarEmpleado('${cuil}', '${legajo}')"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarEmpleado('${cuil}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        }).join('');

    } catch (e) { 
        console.error("Error al cargar empleados:", e);
        cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error de conexión.</td></tr>';
    }
}
function abrirModalEstados() {
    if (!cuitEmpresaActiva) return mostrarAlertaPersonalizada("Atención", "Seleccioná una empresa primero.", "advertencia");
    
    document.getElementById('filtro-estados').value = '';
    renderizarListaEstados();
    new bootstrap.Modal(document.getElementById('modalEstados')).show();
}

function renderizarListaEstados() {
    const filtro = document.getElementById('filtro-estados').value.toLowerCase();
    const contenedor = document.getElementById('lista-empleados-estados');
    const cuitBuscado = cuitEmpresaActiva.toString().trim();
    
    const filtrados = cacheEmpleados.filter(em => {
        if (!em || !Array.isArray(em)) return false;
        if ((em[9] || "").toString().trim() !== cuitBuscado) return false;
        
        const legajo = (em[0] || '').toString().toLowerCase();
        const nombre = (em[1] || '').toString().toLowerCase();
        const cuil = (em[2] || '').toString().toLowerCase();
        
        return nombre.includes(filtro) || legajo.includes(filtro) || cuil.includes(filtro);
    });

    contenedor.innerHTML = filtrados.map(em => {
        const legajo = em[0] || '';
        const nombre = em[1] || 'Sin Nombre';
        const cuil = em[2] || '---';
        const estado = em[14] ? em[14].toString().toUpperCase().trim() : 'ACTIVO';
        const esInactivo = estado === 'INACTIVO';
        
        const btnClase = esInactivo ? 'btn-success' : 'btn-outline-danger';
        const btnIcono = esInactivo ? 'bi-person-check-fill' : 'bi-person-x-fill';
        const btnTexto = esInactivo ? 'Habilitar' : 'Deshabilitar';
        const nuevoEstado = esInactivo ? 'ACTIVO' : 'INACTIVO';

        return `
        <div class="d-flex justify-content-between align-items-center p-3 border rounded shadow-sm ${esInactivo ? 'bg-light' : 'bg-white'}">
            <div>
                <div class="fw-bold text-uppercase ${esInactivo ? 'text-muted' : 'text-dark'}">${nombre}</div>
                <div class="small text-muted">Leg: ${legajo} | CUIL: ${cuil}</div>
            </div>
            <button class="btn btn-sm ${btnClase} fw-bold text-uppercase" onclick="cambiarEstadoEmpleado('${cuil}', '${nuevoEstado}')">
                <i class="bi ${btnIcono} me-1"></i> ${btnTexto}
            </button>
        </div>
        `;
    }).join('');
}

async function cambiarEstadoEmpleado(cuil, nuevoEstado) {
    try {
        // 1. Efecto visual inmediato solo en el modal
        const empIndex = cacheEmpleados.findIndex(em => em[2].toString().trim() === cuil.toString().trim());
        if (empIndex !== -1) cacheEmpleados[empIndex][14] = nuevoEstado;
        
        renderizarListaEstados(); 

        // 2. Mandamos la instrucción al backend y ESPERAMOS (await)
        const resp = await fetch(URL_WEB_APP, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'cambiarEstadoEmpleado', cuil: cuil, estado: nuevoEstado }) 
        });
        
        const texto = await resp.text();
        if (texto !== "OK") {
            mostrarAlertaPersonalizada("Error", "El cambio no se guardó en la base de datos.", "error");
            // Si falló, revertimos el cambio visual
            if (empIndex !== -1) cacheEmpleados[empIndex][14] = (nuevoEstado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
            renderizarListaEstados();
        } else {
            // 3. SOLO recargamos la tabla de fondo cuando el backend confirmó que guardó con éxito
            await cargarEmpleadosEmpresa(cuitEmpresaActiva); 
        }
    } catch (e) { 
        mostrarAlertaPersonalizada("Error de conexión", "Revisá tu internet.", "error"); 
    }
}
function toggleTodosEmpleados(masterInput) {
    // 🔴 REGLA VITAL: Ignorar los checkboxes que están "disabled" (los inactivos)
    document.querySelectorAll('.check-empleado:not(:disabled)').forEach(chk => {
        chk.checked = masterInput.checked;
    });
}

// NUEVA FUNCIÓN: Formateo automático de CUIL
function formatearCUIL(input) {
    let valor = input.value.replace(/\D/g, ''); // Deja solo los números
    if (valor.length > 2 && valor.length <= 10) {
        valor = valor.substring(0, 2) + '-' + valor.substring(2);
    } else if (valor.length > 10) {
        valor = valor.substring(0, 2) + '-' + valor.substring(2, 10) + '-' + valor.substring(10, 11);
    }
    input.value = valor;
}

async function prepararModalEmpleado() {
    const selectGremio = document.getElementById('empl-gremio');
    if (!selectGremio) return;
    
    selectGremio.innerHTML = '<option value="">-- Seleccione un Gremio --</option>' + 
        cacheGremios.map(g => `<option value="${g[0]}" data-cats="${encodeURIComponent(g[2])}" data-cons="${encodeURIComponent(g[3])}">${g[0].toUpperCase()}</option>`).join('');
}
function actualizarOpcionesGremioEmpleado() {
    const selectGremio = document.getElementById('empl-gremio');
    const opt = selectGremio.options[selectGremio.selectedIndex];
    const contenedor = document.getElementById('configuracion-gremio-empleado');

    if (!opt || !opt.value) {
        contenedor.innerHTML = '<p class="text-muted small italic mb-0">Seleccione un gremio para ver los cargos.</p>';
        return;
    }

    try {
        const categorias = JSON.parse(decodeURIComponent(opt.dataset.cats));
        let conceptos = JSON.parse(decodeURIComponent(opt.dataset.cons));

        // Filtramos el presentismo combinado
        conceptos = conceptos.filter(c => !c.nombre.toUpperCase().includes("(COMB"));

        // Conceptos base obligatorios
        const conceptosBaseDefault = [
            { nombre: "ADICIONAL 1", tipo: "REM", modo: "porcentaje", valor: 4, esCombinado: false },
            { nombre: "PRESENTISMO", tipo: "REM", modo: "porcentaje", valor: 20, esCombinado: false },
            { nombre: "ANTIGÜEDAD", tipo: "REM", modo: "porcentaje", valor: 1, esCombinado: false },
            { nombre: "NO REMUNERATIVO", tipo: "NO_REM", modo: "monto", valor: 20000, esCombinado: false },
            { nombre: "JUBILACIÓN", tipo: "DESC", modo: "porcentaje", valor: 3, esCombinado: false },
            { nombre: "LEY 19032", tipo: "DESC", modo: "porcentaje", valor: 3, esCombinado: false },
            { nombre: "OBRA SOCIAL", tipo: "DESC", modo: "porcentaje", valor: 3, esCombinado: false },
            { nombre: "CUOTA SINDICAL", tipo: "DESC", modo: "porcentaje", valor: 2.5, esCombinado: false },
            { nombre: "SEGURO DE VIDA", tipo: "DESC", modo: "monto", valor: 0, esCombinado: false }
        ];

        conceptosBaseDefault.forEach(def => {
            if (!conceptos.find(c => c.nombre.toUpperCase() === def.nombre)) {
                conceptos.push(def);
            }
        });

        // ESTRUCTURA NUEVA: Select de categoría + Acordeón desplegable para conceptos
        contenedor.innerHTML = `
            <div class="row g-2 mb-3">
                <div class="col-md-12">
                    <label class="xs-label mb-1 text-primary">Cargo / Categoría del Gremio</label>
                    <select id="empl-categoria" class="form-select form-select-sm fw-bold border-primary bg-light" required>
                        <option value="">-- Seleccionar Cargo --</option>
                        ${categorias.map(c => `<option value="${c.valor}">${c.nombre} ($${parseFloat(c.valor).toLocaleString('es-AR')})</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div class="accordion accordion-flush border border-secondary-subtle rounded shadow-sm mb-2" id="acc-conceptos-emp">
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed py-2 fw-bold text-success bg-success-subtle rounded" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-conceptos-emp">
                            <i class="bi bi-list-check me-2"></i> CONCEPTOS DE LIQUIDACIÓN
                        </button>
                    </h2>
                    <div id="collapse-conceptos-emp" class="accordion-collapse collapse" data-bs-parent="#acc-conceptos-emp">
                        <div class="accordion-body p-0">
                            <ul class="list-group list-group-flush">
                                ${conceptos.map((c, i) => {
                                    const esCombinado = c.esCombinado || false;
                                    const bgClass = esCombinado ? 'bg-warning-subtle' : 'bg-white';
                                    
                                    return `
                                    <li class="list-group-item d-flex justify-content-between align-items-center py-2 ${bgClass}">
                                        <div class="form-check mb-0">
                                            <input class="form-check-input check-concepto-emp border-secondary" type="checkbox" id="cep-${i}" checked
                                                data-nombre="${c.nombre}" data-tipo="${c.tipo}" data-modo="${c.modo}" data-combinado="${esCombinado}">
                                            <label class="form-check-label fw-bold text-uppercase ms-1" for="cep-${i}" style="font-size: 0.8rem;">${c.nombre}</label>
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="small text-muted text-uppercase d-none d-sm-inline" style="font-size:0.65rem;">${c.tipo}</span>
                                            <div class="input-group input-group-sm" style="width: 95px;">
                                                <span class="input-group-text p-1" style="font-size:0.7rem">${c.modo === 'porcentaje' ? '%' : '$'}</span>
                                                <input type="text" inputmode="decimal" class="form-control form-control-sm p-1 fw-bold text-end bg-white" id="val-cep-${i}" value="${c.valor}" oninput="this.value = this.value.replace(',', '.')">
                                            </div>
                                        </div>
                                    </li>`;
                                }).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>`;
    } catch (e) { 
        console.error("Error al renderizar conceptos:", e);
        contenedor.innerHTML = '<div class="alert alert-danger small">Error al estructurar el gremio.</div>'; 
    }
}

async function guardarEmpleado(e) {
    if (e) e.preventDefault();
    
    const cuitEmpresa = cuitEmpresaActiva || document.getElementById('emp-cuit')?.value;
    if (!cuitEmpresa) return mostrarAlertaPersonalizada("Error", "No se detectó la empresa activa.", "error");

    const btn = e.submitter || document.querySelector('#form-empleado button[type="submit"]');
    if (btn) btn.disabled = true;

    const modalidadSeleccionada = document.querySelector('input[name="modalidad"]:checked')?.value || 'mensual';
    const cantidadModalidad = document.getElementById('empl-cantidad-modalidad')?.value || "1";

    const cuilOriginal = document.getElementById('empl-cuil-original').value;
    const esEdicion = cuilOriginal !== "";

    const conceptosSeleccionados = [];
    document.querySelectorAll('.check-concepto-emp:checked').forEach(chk => {
        const idNum = chk.id.split('-')[1];
        const inputVal = document.getElementById(`val-cep-${idNum}`);
        const valorActualizado = inputVal ? parseFloat(inputVal.value) : 0;
        
        conceptosSeleccionados.push({
            nombre: chk.dataset.nombre,
            tipo: chk.dataset.tipo,
            modo: chk.dataset.modo,
            valor: valorActualizado,
            esCombinado: chk.dataset.combinado === "true"
        });
    });

    const selectCat = document.getElementById('empl-categoria');
    
    const datos = {
        action: esEdicion ? 'editarEmpleado' : 'crearEmpleado',
        cuilOriginal: cuilOriginal,
        legajo: document.getElementById('empl-legajo').value,
        nombre: document.getElementById('empl-nombre').value.trim(),
        cuil: document.getElementById('empl-cuil').value.trim(),
        ingreso: document.getElementById('empl-ingreso').value, 
        // 🔴 NUEVO: Capturamos la fecha de baja si existe en el HTML
        baja: document.getElementById('empl-baja') ? document.getElementById('empl-baja').value : "",
        tarea: document.getElementById('empl-tarea').value.trim(),
        bruto: selectCat ? selectCat.value : "0", 
        cuitEmpresa: cuitEmpresa,
        gremio: document.getElementById('empl-gremio').value,
        conceptos: JSON.stringify(conceptosSeleccionados),
        modalidad: modalidadSeleccionada,
        cantidad: cantidadModalidad
    };

    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify(datos) });
        const textoRespuesta = await resp.text();
        
        if (textoRespuesta.includes("OK")) {
            mostrarAlertaPersonalizada("Éxito", "Empleado guardado correctamente.", "exito");
            const modalEl = document.getElementById('modalEmpleado');
            bootstrap.Modal.getInstance(modalEl)?.hide();
            await cargarEmpleadosEmpresa(cuitEmpresa);
        } else {
            mostrarAlertaPersonalizada("Error", "Error del servidor: " + textoRespuesta, "error");
        }
    } catch (err) { 
        mostrarAlertaPersonalizada("Error", "Error de conexión al guardar empleado.", "error"); 
    } finally { 
        if (btn) btn.disabled = false; 
    }
}

function renderConceptosTemporales() {
    const lista = document.getElementById('lista-conceptos-gremio');
    const listaCombinados = document.getElementById('lista-conceptos-combinados');
    const base = document.getElementById('lista-conceptos-base');
    if (!lista || !base) return;

    // 1. Renderizamos conceptos SIMPLES con su input editable
    const simples = conceptosTemporales.filter(c => !c.esCombinado);
    lista.innerHTML = simples.map(c => {
        const index = conceptosTemporales.indexOf(c);
        return `
        <div class="col-md-4 mb-2">
            <div class="p-2 border rounded bg-white shadow-sm position-relative">
                <i class="bi bi-x-circle text-danger position-absolute top-0 end-0 m-1 cursor-pointer" onclick="conceptosTemporales.splice(${index},1);renderConceptosTemporales()" title="Eliminar"></i>
                <div class="fw-bold small text-uppercase mb-1">${c.nombre}</div>
                <div class="d-flex align-items-center gap-1">
                    <span class="text-muted text-uppercase" style="font-size: 0.65rem;">${c.tipo}:</span>
                    <div class="input-group input-group-sm" style="max-width: 95px;">
                        <span class="input-group-text p-1" style="font-size:0.65rem">${c.modo === 'porcentaje' ? '%' : '$'}</span>
                        <input type="number" step="any" class="form-control form-control-sm p-1 fw-bold" value="${c.valor}" oninput="conceptosTemporales[${index}].valor = parseFloat(this.value) || 0">
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // 2. Renderizamos conceptos COMBINADOS con su input editable
    const combinados = conceptosTemporales.filter(c => c.esCombinado);
    if (listaCombinados) {
        listaCombinados.innerHTML = combinados.map(c => {
            const index = conceptosTemporales.indexOf(c);
            return `
            <div class="col-md-4 mb-2">
                <div class="p-2 border rounded bg-warning-subtle border-warning shadow-sm position-relative">
                    <i class="bi bi-x-circle text-danger position-absolute top-0 end-0 m-1 cursor-pointer" onclick="conceptosTemporales.splice(${index},1);renderConceptosTemporales()" title="Eliminar"></i>
                    <div class="fw-bold small text-uppercase mb-1">${c.nombre}</div>
                    <div class="d-flex align-items-center gap-1 mb-1">
                        <span class="text-muted text-uppercase" style="font-size: 0.65rem;">${c.tipo}:</span>
                        <div class="input-group input-group-sm" style="max-width: 95px;">
                            <span class="input-group-text p-1" style="font-size:0.65rem">${c.modo === 'porcentaje' ? '%' : '$'}</span>
                            <input type="number" step="any" class="form-control form-control-sm p-1 fw-bold" value="${c.valor}" oninput="conceptosTemporales[${index}].valor = parseFloat(this.value) || 0">
                        </div>
                    </div>
                    <div class="text-primary" style="font-size: 0.55rem; font-style: italic;">Base: ${c.conceptosBase ? c.conceptosBase.join(' + ') : ''}</div>
                </div>
            </div>`;
        }).join('');
    }

    // 3. Regeneramos los checkboxes de conceptos base
    let htmlBases = `
        <div class="form-check form-check-inline border border-primary rounded px-2 bg-light shadow-xs mb-1">
            <input class="form-check-input" type="checkbox" id="base-sueldo-basico" checked>
            <label class="form-check-label small fw-bold cursor-pointer text-primary" for="base-sueldo-basico">SUELDO BÁSICO</label>
        </div>
    `;
    
    htmlBases += conceptosTemporales.map((c, index) => {
        const claseFondo = c.esCombinado ? 'bg-warning-subtle border-warning' : 'bg-white';
        return `
        <div class="form-check form-check-inline border rounded px-2 shadow-xs mb-1 ${claseFondo}">
            <input class="form-check-input" type="checkbox" id="base-${index}">
            <label class="form-check-label small fw-bold cursor-pointer" for="base-${index}">${c.nombre}</label>
        </div>`;
    }).join('');
    
    base.innerHTML = htmlBases;
    
    if (conceptosTemporales.length === 0) {
        base.innerHTML = htmlBases + '<br><span class="text-muted small">Cargá conceptos en el Paso 4 para verlos aquí.</span>';
    }
}
function modoFormularioEmpleado(modo, cuil, legajo) {
    const fieldset = document.getElementById('fieldset-empleado');
    const footer = document.getElementById('footer-modal-empleado');
    
    if (modo === 'ver') {
        if(fieldset) fieldset.disabled = true; // Bloquea todo el formulario
        footer.innerHTML = `
            <div class="d-flex gap-2 w-100">
                <button type="button" class="btn btn-secondary fw-bold w-50 py-2 shadow-sm" data-bs-dismiss="modal">SALIR</button>
                <button type="button" class="btn btn-warning fw-bold w-50 py-2 shadow-sm" onclick="editarEmpleado('${cuil}', '${legajo}')">EDITAR FICHA</button>
            </div>
        `;
        document.getElementById('titulo-modal-empleado').innerHTML = '<i class="bi bi-person-vcard me-2"></i> FICHA DEL EMPLEADO';
    } else {
        if(fieldset) fieldset.disabled = false; // Desbloquea
        document.getElementById('empl-legajo').disabled = true; // El legajo sigue bloqueado siempre
        footer.innerHTML = `
            <button type="submit" class="btn btn-success fw-bold w-100 py-3 shadow-sm text-uppercase">
                <i class="bi bi-save me-2"></i> Guardar Perfil de Empleado
            </button>
        `;
        document.getElementById('titulo-modal-empleado').innerHTML = '<i class="bi bi-person-gear me-2"></i> EDITAR EMPLEADO';
    }
}

async function abrirModalEmpleado() {
    document.getElementById('form-empleado').reset();
    document.getElementById('empl-cuil-original').value = ""; 
    document.getElementById('configuracion-gremio-empleado').innerHTML = '<p class="text-muted small italic mb-0">Seleccione un gremio para ver los cargos.</p>';
    
    await prepararModalEmpleado(); 

    if (cuitEmpresaActiva) {
        const cuitBuscado = cuitEmpresaActiva.toString().trim();
        const empleadosDeEstaEmpresa = cacheEmpleados.filter(em => {
            if (!em || !Array.isArray(em)) return false;
            if ((em[9] || "").toString().trim() === cuitBuscado) return true;
            return em.some(celda => celda && celda.toString().trim() === cuitBuscado);
        });

        let siguienteLegajo = 1000;
        if (empleadosDeEstaEmpresa.length > 0) {
            const legajosNumericos = empleadosDeEstaEmpresa.map(em => parseInt(em[0]) || 0);
            const legajoMaximo = Math.max(...legajosNumericos);
            if (legajoMaximo >= 1000) siguienteLegajo = legajoMaximo + 1;
        }
        document.getElementById('empl-legajo').value = siguienteLegajo;
    }

    modoFormularioEmpleado('nuevo', null, null);
    document.getElementById('titulo-modal-empleado').innerHTML = '<i class="bi bi-person-plus me-2"></i> NUEVO EMPLEADO';

    const modalElement = document.getElementById('modalEmpleado');
    let modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}

async function cargarDatosEmpleadoEnModal(cuil, legajo) {
    let emp;
    if (legajo && legajo !== 'undefined') {
        emp = cacheEmpleados.find(em => em[2].toString().trim() === cuil.toString().trim() && em[0].toString().trim() === legajo.toString().trim());
    } else {
        emp = cacheEmpleados.find(em => em[2].toString().trim() === cuil.toString().trim());
    }

    if (!emp) return alert("No se encontró el registro del empleado.");

    await prepararModalEmpleado();
    
    document.getElementById('empl-cuil-original').value = emp[2];
    document.getElementById('empl-legajo').value = emp[0] || "";
    document.getElementById('empl-nombre').value = emp[1] || "";
    document.getElementById('empl-cuil').value = emp[2] || "";
    document.getElementById('empl-ingreso').value = emp[3] ? emp[3].split('T')[0] : "";
    const inputBaja = document.getElementById('empl-baja');
    if (inputBaja) {
        inputBaja.value = emp[15] ? emp[15].split('T')[0] : "";
    }
    document.getElementById('empl-tarea').value = emp[4] || "";

    // 🔴 REPARACIÓN MODALIDAD (MES/HORA)
    const modalidad = (emp[12] || 'mensual').toString().toLowerCase().trim();
    const cantidad = emp[13] || "1";
    
    const radioMes = document.getElementById('mod-mes');
    const radioHora = document.getElementById('mod-hora');
    const inputCantidad = document.getElementById('empl-cantidad-modalidad');
    
    if (radioMes && radioHora) {
        if (modalidad === 'hora') {
            radioHora.checked = true;
        } else {
            radioMes.checked = true;
        }
        toggleCamposModalidad(); // Muestra u oculta campos de horas
    }
    if (inputCantidad) inputCantidad.value = cantidad;

    const selectGremio = document.getElementById('empl-gremio');
    selectGremio.value = emp[10] || "";
    actualizarOpcionesGremioEmpleado();

    return new Promise(resolve => {
        setTimeout(() => {
            const selectCat = document.getElementById('empl-categoria');
            if (selectCat && emp[5]) selectCat.value = emp[5];
            
            try {
                const guardados = JSON.parse(emp[11] || "[]");
                document.querySelectorAll('.check-concepto-emp').forEach(chk => {
                    const nombreConcepto = chk.dataset.nombre;
                    const conceptoGuardado = guardados.find(g => g.nombre === nombreConcepto);
                    
                    if (conceptoGuardado) {
                        chk.checked = true;
                        const idNum = chk.id.split('-')[1];
                        const inputVal = document.getElementById(`val-cep-${idNum}`);
                        if (inputVal) inputVal.value = conceptoGuardado.valor;
                    } else {
                        chk.checked = false;
                    }
                });
            } catch(err){ console.error("Error al cargar conceptos", err); }
            
            resolve();
        }, 150);
    });
}

// Asegurate de reemplazar también esta función pequeña (suele estar al final de tu código o en Bloque 4)
function toggleCamposModalidad() {
    const contenedor = document.getElementById('campos-extra-modalidad');
    const radioMes = document.getElementById('mod-mes');
    
    // El if previene que se rompa si el HTML todavía no cargó los botones
    if (contenedor && radioMes) {
        const esMensual = radioMes.checked;
        contenedor.classList.toggle('d-none', esMensual);
    }
}

async function verFichaEmpleado(cuil, legajo) {
    await cargarDatosEmpleadoEnModal(cuil, legajo);
    modoFormularioEmpleado('ver', cuil, legajo);
    
    const modalElement = document.getElementById('modalEmpleado');
    let modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}

async function editarEmpleado(cuil, legajo) {
    await cargarDatosEmpleadoEnModal(cuil, legajo);
    modoFormularioEmpleado('editar', cuil, legajo);
    
    const modalElement = document.getElementById('modalEmpleado');
    let modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}

let cuilTemporalParaEliminar = null;

function eliminarEmpleado(cuil) {
    // Usamos el nuevo sistema tipo SweetAlert
    mostrarAlertaPersonalizada(
        "¿Eliminar empleado?", 
        "Esta acción no se puede deshacer.\n¿Seguro que deseas continuar?", 
        "peligro", 
        () => ejecutarEliminacionEmpleado(cuil) // Ejecuta solo si hace clic en "Eliminar"
    );
}

async function ejecutarEliminacionEmpleado(cuilParaEliminar) {
    try {
        const resp = await fetch(URL_WEB_APP, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'eliminarEmpleado', cuil: cuilParaEliminar }) 
        });
        const texto = await resp.text();
        
        if (texto === "OK") {
            mostrarAlertaPersonalizada("Eliminado", "El empleado fue borrado de la base de datos.", "exito");
            await cargarEmpleadosEmpresa(cuitEmpresaActiva);
        } else {
            mostrarAlertaPersonalizada("Error", texto, "error");
        }
    } catch (e) { 
        mostrarAlertaPersonalizada("Error de conexión", "No se pudo eliminar el empleado.", "error"); 
    }
}
/* ============================================================
   🧮 MOTOR DE LIQUIDACIÓN MENSUAL E IMPRESIÓN (BLOQUE 3 DE 4)
   ============================================================ */
async function cargarDatosMensualesEmpresa() {
    const contenedor = document.getElementById('contenedor-inputs-mensuales');
    if (!contenedor) return;

    // Campos fijos simplificados y rápidos para la liquidación global
    contenedor.innerHTML = `
        <div class="col-6 col-md-4 mb-2">
            <label class="xs-label text-white-50 mb-1">Periodo Liquidación</label>
            <input type="month" id="liq-periodo" class="form-control form-control-sm border-0 shadow-sm" value="${new Date().toISOString().slice(0, 7)}">
        </div>
        <div class="col-6 col-md-4 mb-2">
            <label class="xs-label text-white-50 mb-1">Periodo Abonado</label>
            <input type="date" id="liq-periodo-abonado" class="form-control form-control-sm border-0 shadow-sm">
        </div>
        <div class="col-6 col-md-4 mb-2">
            <label class="xs-label text-white-50 mb-1">Fecha de Pago</label>
            <input type="date" id="liq-fecha-pago" class="form-control form-control-sm border-0 shadow-sm">
        </div>
        <div class="col-6 col-md-4 mb-2">
            <label class="xs-label text-white-50 mb-1">Banco Depósito</label>
            <input type="text" id="liq-banco" class="form-control form-control-sm border-0 shadow-sm" placeholder="Ej: Banco Nación">
        </div>
        <div class="col-6 col-md-4 mb-2">
            <label class="xs-label text-white-50 mb-1">Último Depósito Aportes</label>
            <input type="text" id="liq-aportes" class="form-control form-control-sm border-0 shadow-sm" placeholder="Ej: 10/05/2026">
        </div>
        <div class="col-12 col-md-4 mb-2">
            <label class="xs-label text-white-50 mb-1">Descripción / Observación</label>
            <input type="text" id="liq-descripcion" class="form-control form-control-sm border-0 shadow-sm" placeholder="Ej: Aguinaldo, Vacaciones...">
        </div>
    `;
}

function habilitarSeleccionLiquidacion() {
    // Ponemos el signo "?" para que si el elemento no existe, no rompa el programa
    document.getElementById('th-check-header')?.classList.remove('d-none');
    document.querySelectorAll('.col-check').forEach(td => td.classList.remove('d-none'));

    const btnLiq = document.getElementById('btn-habilitar-liq');
    if (btnLiq) {
        btnLiq.innerHTML = '<i class="bi bi-file-earmark-pdf me-1"></i> PROCESAR SELECCIONADOS';
        btnLiq.className = 'btn btn-success fw-bold btn-sm';
        btnLiq.setAttribute('onclick', 'procesarLoteLiquidacion()');
    }

    // Si el HTML no tiene el botón de cancelar, el "?" evita que tire el error en consola
    document.getElementById('btn-cancelar-liq')?.classList.remove('d-none');
}

function resetearVistaLiquidacion() {
    // 1. Ocultar columnas de selección
    document.getElementById('th-check-header')?.classList.add('d-none');
    document.querySelectorAll('.col-check').forEach(td => td.classList.add('d-none'));

    // 2. Restaurar botón principal
    const btnLiq = document.getElementById('btn-habilitar-liq');
    if (btnLiq) {
        btnLiq.innerHTML = '<i class="bi bi-calculator me-1"></i> LIQUIDAR SUELDO';
        btnLiq.className = 'btn btn-warning fw-bold btn-sm';
        btnLiq.setAttribute('onclick', 'habilitarSeleccionLiquidacion()');
    }

    // 3. Ocultar botón Cancelar
    document.getElementById('btn-cancelar-liq')?.classList.add('d-none');

    // 4. Limpiar todos los checkboxes (fila e individual)
    document.querySelectorAll('.check-empleado').forEach(chk => chk.checked = false);
    
    // Limpiar el checkbox maestro (el del encabezado)
    const mainCheck = document.getElementById('check-todos');
    if (mainCheck) mainCheck.checked = false;
}


function procesarLoteLiquidacion() {
    const seleccionados = [];
    document.querySelectorAll('.check-empleado:checked').forEach(chk => {
        seleccionados.push(chk.dataset.cuil.toString().trim());
    });

    if (seleccionados.length === 0) {
        mostrarAlertaPersonalizada("Atención", "Por favor, tildá al menos un empleado para liquidar.", "advertencia");
        return;
    }

    mostrarAlertaPersonalizada(
        "Recordatorio de Liquidación",
        "Antes de generar los recibos, verificá:\n\n✅ ¿Actualizaste el Seguro de Vida?\n✅ ¿El No Remunerativo es correcto?\n✅ ¿Cargaste las fechas, horas o sueldos?",
        "info",
        () => {
            const cuitBuscado = cuitEmpresaActiva.toString().trim();
            
            listaParaImprimir = cacheEmpleados.filter(em => {
                const cuil = (em[2] || "").toString().trim();
                const cuitEmpresa = (em[9] || "").toString().trim();
                return seleccionados.includes(cuil) && cuitEmpresa === cuitBuscado;
            });
            
            const contenedor = document.getElementById('contenedor-conceptos');
            if (!contenedor) return;

            let htmlList = `
                <div class="mb-3 px-2">
                    <div class="d-flex gap-2 mb-2">
                        <button class="btn btn-outline-primary btn-sm flex-fill" onclick="filtrarTipo('MES')">SOLO MENSUALES</button>
                        <button class="btn btn-outline-success btn-sm flex-fill" onclick="filtrarTipo('HORAS')">SOLO POR HORA</button>
                        <button class="btn btn-outline-secondary btn-sm flex-fill" onclick="filtrarTipo('TODOS')">VER TODOS</button>
                    </div>
                    <input type="text" id="filtro-empleados" class="form-control border-primary shadow-sm" 
                           placeholder="🔍 Buscar por Legajo o CUIL..." 
                           oninput="filtrarEmpleadosLiquidacion(this.value)">
                </div>`;
            
            listaParaImprimir.forEach((em, index) => {
                let claseOculta = index >= 5 ? 'fila-extra-liq d-none' : '';
                const legajo = em[0] || '';
                const nombre = em[1] || '';
                const cuil = em[2] || '';
                let brutoUnitario = parseFloat(em[5]) || 0;

                // Leemos si es mensual o por hora según su ficha guardada
                let modoFicha = (em[12] || "mensual").toString().toLowerCase().trim();
                let modoActual = modoFicha === "hora" ? "HORAS" : "MES";
                
                // 🔴 MAGIA DE ETIQUETAS Y VALORES
                // Si es por HORA, queda en blanco para llenar. Si es MES, carga el sueldo base.
                let valorDefecto = modoActual === "HORAS" ? "" : brutoUnitario;
                let labelCantidad = modoActual === "HORAS" ? "CANTIDAD HORAS" : "MENSUALIDAD";

                // Este script hace que si cambiás el menú desplegable a mano, se actualice el texto y el número al instante
                let onChangeJs = `
                    this.closest('tr').dataset.modo = this.value; 
                    const col = this.closest('.row'); 
                    const lbl = col.querySelector('.lbl-cantidad-liq'); 
                    const inp = col.querySelector('.input-valor-liq'); 
                    if(this.value === 'HORAS') { 
                        lbl.innerText = 'CANTIDAD HORAS'; 
                        inp.value = ''; 
                    } else { 
                        lbl.innerText = 'MENSUALIDAD'; 
                        inp.value = inp.dataset.bruto; 
                    }
                `;

                htmlList += `
                    <tr class="${claseOculta} fila-empleado-liq" data-modo="${modoActual}">
                        <td class="border-bottom py-3">
                            <div class="fw-bold text-uppercase text-primary mb-2">
                                <i class="bi bi-person-check text-success me-1"></i> ${nombre} 
                                <span class="text-muted fw-normal ms-1" style="font-size: 0.8em;">(CUIL: ${cuil} | Leg: ${legajo})</span>
                            </div>
                            <div class="row g-2 align-items-end">
                               <div class="col-3">
                                    <label class="small text-muted fw-bold mb-1" style="font-size: 0.7rem;">MODO</label>
                                    <select class="form-select form-select-sm select-modo-liq fw-bold border-primary" data-cuil="${cuil}" onchange="${onChangeJs}">
                                        <option value="MES" ${modoActual === "MES" ? "selected" : ""}>MENSUAL</option>
                                        <option value="HORAS" ${modoActual === "HORAS" ? "selected" : ""}>POR HORA</option>
                                    </select>
                                </div>
                                <div class="col-3">
                                    <label class="small text-muted fw-bold mb-1 lbl-cantidad-liq" style="font-size: 0.7rem;">${labelCantidad}</label>
                                    <input type="number" step="any" class="form-control form-control-sm input-valor-liq fw-bold border-primary" data-cuil="${cuil}" value="${valorDefecto}" data-bruto="${brutoUnitario}">
                                </div>
                                <div class="col-3">
                                    <label class="small text-muted fw-bold mb-1" style="font-size: 0.7rem;">FECHA DESDE</label>
                                    <input type="date" class="form-control form-control-sm input-desde-liq" data-cuil="${cuil}">
                                </div>
                                <div class="col-3">
                                    <label class="small text-muted fw-bold mb-1" style="font-size: 0.7rem;">FECHA HASTA</label>
                                    <input type="date" class="form-control form-control-sm input-hasta-liq" data-cuil="${cuil}">
                                </div> 
                            </div>
                        </td>
                    </tr>
                `;
            });

            if (listaParaImprimir.length > 5) {
                htmlList += `
                    <tr id="fila-btn-ver-mas">
                        <td class="text-center bg-light py-2">
                            <button type="button" class="btn btn-sm btn-outline-dark fw-bold rounded-pill px-3" onclick="mostrarTodoLoteLiq()">
                                <i class="bi bi-chevron-down me-1"></i> Mostrar ${listaParaImprimir.length - 5} empleado(s) más
                            </button>
                        </td>
                    </tr>
                `;
            }

            contenedor.innerHTML = htmlList;

            const modalEl = document.getElementById('modalLiquidacion');
            const modalDialog = modalEl.querySelector('.modal-dialog');
            if (modalDialog) modalDialog.classList.add('modal-lg');

            new bootstrap.Modal(modalEl).show();
        }
    );
}

// Funciones de apoyo para los filtros
function filtrarTipo(tipo) {
    const filas = document.querySelectorAll('.fila-empleado-liq');
    filas.forEach(fila => {
        fila.style.display = (tipo === 'TODOS' || fila.dataset.modo === tipo) ? "" : "none";
    });
}

function filtrarEmpleadosLiquidacion(texto) {
    texto = texto.toLowerCase();
    const filas = document.querySelectorAll('.fila-empleado-liq');
    filas.forEach(fila => {
        fila.style.display = fila.innerText.toLowerCase().includes(texto) ? "" : "none";
    });
}

// NUEVA FUNCIÓN: Convierte números a letras automáticamente para los recibos
function numeroALetras(num) {
    if (num === 0) return "CERO PESOS";
    function unidades(num) {
        switch (num) {
            case 1: return "UN"; case 2: return "DOS"; case 3: return "TRES"; case 4: return "CUATRO"; case 5: return "CINCO";
            case 6: return "SEIS"; case 7: return "SIETE"; case 8: return "OCHO"; case 9: return "NUEVE"; default: return "";
        }
    }
    function decenas(num) {
        let decena = Math.floor(num / 10); let unidad = num - (decena * 10);
        switch (decena) {
            case 1:
                switch (unidad) {
                    case 0: return "DIEZ"; case 1: return "ONCE"; case 2: return "DOCE"; case 3: return "TRECE";
                    case 4: return "CATORCE"; case 5: return "QUINCE"; default: return "DIECI" + unidades(unidad);
                }
            case 2: return unidad === 0 ? "VEINTE" : "VEINTI" + unidades(unidad);
            case 3: return decenasY("TREINTA", unidad); case 4: return decenasY("CUARENTA", unidad);
            case 5: return decenasY("CINCUENTA", unidad); case 6: return decenasY("SESENTA", unidad);
            case 7: return decenasY("SETENTA", unidad); case 8: return decenasY("OCHENTA", unidad);
            case 9: return decenasY("NOVENTA", unidad); case 0: return unidades(unidad);
        }
    }
    function decenasY(strSin, numUnidades) { return numUnidades > 0 ? strSin + " Y " + unidades(numUnidades) : strSin; }
    function centenas(num) {
        let centena = Math.floor(num / 100); let decena = num - (centena * 100);
        switch (centena) {
            case 1: return decena > 0 ? "CIENTO " + decenas(decena) : "CIEN";
            case 2: return "DOSCIENTOS " + decenas(decena); case 3: return "TRESCIENTOS " + decenas(decena);
            case 4: return "CUATROCIENTOS " + decenas(decena); case 5: return "QUINIENTOS " + decenas(decena);
            case 6: return "SEISCIENTOS " + decenas(decena); case 7: return "SETECIENTOS " + decenas(decena);
            case 8: return "OCHOCIENTOS " + decenas(decena); case 9: return "NOVECIENTOS " + decenas(decena);
            default: return decenas(decena);
        }
    }
    function seccion(num, divisor, strSingular, strPlural) {
        let cientos = Math.floor(num / divisor); let resto = num - (cientos * divisor); let letras = "";
        if (cientos > 0) letras = cientos > 1 ? centenas(cientos) + " " + strPlural : strSingular;
        return letras;
    }
    function miles(num) {
        let divisor = 1000; let cientos = Math.floor(num / divisor); let resto = num - (cientos * divisor);
        let strMiles = seccion(num, divisor, "UN MIL", "MIL"); let strCentenas = centenas(resto);
        return strMiles == "" ? strCentenas : strMiles + (strCentenas ? " " + strCentenas : "");
    }
    function millones(num) {
        let divisor = 1000000; let cientos = Math.floor(num / divisor); let resto = num - (cientos * divisor);
        let strMillones = seccion(num, divisor, "UN MILLON", "MILLONES"); let strMiles = miles(resto);
        return strMillones == "" ? strMiles : strMillones + (strMiles ? " " + strMiles : "");
    }
    let enteros = Math.floor(num);
    let centavos = Math.round((num - enteros) * 100);
    return `RECIBÍ CONFORME LA SUMA DE: ${millones(enteros).trim()} PESOS CON ${centavos}/100.`;
}


function imprimirRecibo() {
    const empActiva = cacheEmpresas.find(e => e[2] == cuitEmpresaActiva);
    const nombreEmpresa = empActiva ? empActiva[0] : 'Empresa';
    const direccionEmpresa = empActiva ? empActiva[1] : '';
    const cuitEmpresa = empActiva ? empActiva[2] : '';

    const periodoLiq = document.getElementById('liq-periodo') ? document.getElementById('liq-periodo').value : "";
    let textoPeriodo = periodoLiq;
    if(periodoLiq) {
        const [yy, mm] = periodoLiq.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        textoPeriodo = `${meses[parseInt(mm)-1]} de ${yy}`;
    }
    
    const fechaPago = document.getElementById('liq-fecha-pago') ? document.getElementById('liq-fecha-pago').value : "";
    let textoFechaPago = fechaPago ? fechaPago.split('-').reverse().join('/') : "";
    
    const periodoAbonado = document.getElementById('liq-periodo-abonado') ? document.getElementById('liq-periodo-abonado').value : "";
    let textoPeriodoAbonado = periodoAbonado ? periodoAbonado.split('-').reverse().join('/') : "";
    
    const banco = document.getElementById('liq-banco') ? document.getElementById('liq-banco').value : "";
    const aportes = document.getElementById('liq-aportes') ? document.getElementById('liq-aportes').value : "";
    const textoDescripcion = document.getElementById('liq-descripcion') ? document.getElementById('liq-descripcion').value.trim() : "";
    let htmlVentana = `<html><head><title>Recibos</title>
        <style>
            @media print { 
                .no-print { display: none !important; } 
                @page { size: A4; margin: 10mm; } 
                body { margin: 0; padding: 0; background: #fff; }
                .hoja-recibo { 
                    page-break-after: always; 
                    page-break-inside: avoid;
                    display: flex; 
                    flex-direction: column; 
                    min-height: 277mm; 
                    padding: 5mm; 
                    box-sizing: border-box; 
                }
                .mitad-recibo { width: 100%; padding: 0; box-sizing: border-box; }
            } 
            @media screen {
                body { background: #525659; font-family: sans-serif; }
                .hoja-recibo { background: white; width: 210mm; min-height: 297mm; margin: 20px auto; padding: 15mm; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; flex-direction: column; box-sizing: border-box; }
                .mitad-recibo { width: 100%; box-sizing: border-box; }
                /* CONTENEDOR DE BOTONES FLOTANTES */
                .contenedor-botones { position: fixed; top: 20px; right: 20px; z-index: 1000; display: flex; gap: 10px; }
                .btn-imprimir { padding: 10px 20px; font-size: 14px; font-weight: bold; background: #ffc107; border: 2px solid #000; cursor: pointer; box-shadow: 3px 3px 0 #000; transition: 0.2s; border-radius: 5px; }
                .btn-imprimir:hover { transform: translate(1px, 1px); box-shadow: 2px 2px 0 #000; }
                .btn-excel { background: #28a745; color: white; }
                .btn-word { background: #0d6efd; color: white; }
            }
            .tabla-clasica { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; margin-bottom: 5px; }
            .tabla-clasica th, .tabla-clasica td { border: 1px solid #000; padding: 4px 6px; }
            .tabla-clasica th { text-align: center; font-weight: bold; background-color: #fff; }
            .tabla-conceptos { margin-bottom: 0; }
            .tabla-conceptos th { border-bottom: 2px solid #000; }
            .tabla-conceptos td { border-top: none; border-bottom: none; }
        </style>
        <script>
            // Funciones inyectadas para exportar en la nueva ventana
            function exportarExcel() {
                var html = document.documentElement.outerHTML;
                var blob = new Blob(['\\ufeff', html], { type: 'application/vnd.ms-excel' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'Recibos_Sueldo.xls';
                a.click();
            }
            function exportarWord() {
                var header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Recibos</title></head><body>";
                var footer = "</body></html>";
                var html = header + document.body.innerHTML + footer;
                var blob = new Blob(['\\ufeff', html], { type: 'application/msword' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'Recibos_Sueldo.doc';
                a.click();
            }
        </script>
    </head><body>
        <div class="no-print contenedor-botones">
            <button class="btn-imprimir" onclick="window.print()">🖨️ IMPRIMIR</button>
            <button class="btn-imprimir btn-word" onclick="exportarWord()">📄 WORD</button>
            <button class="btn-imprimir btn-excel" onclick="exportarExcel()">📊 EXCEL</button>
        </div>`;
    listaParaImprimir.forEach((em) => {
        let conceptos = [];
        try { conceptos = JSON.parse(em[11] || "[]"); } catch(e){}

        const legajo = em[0] || '';
        const nombreEmpleado = em[1] || '';
        const cuil = em[2] || '';
        let fechaIngreso = em[3] ? em[3].split('T')[0].split('-').reverse().join('/') : '';
        const tarea = em[4] || '';
        let brutoUnitario = parseFloat(em[5]) || 0; 
        let horasTrabajadas = parseFloat(em[13]) || 0; 
        
        let labelPrincipal = "Sueldo Básico"; 
        
        const selectModo = document.querySelector(`.select-modo-liq[data-cuil="${cuil}"]`);
        const inputValor = document.querySelector(`.input-valor-liq[data-cuil="${cuil}"]`);
        const inputDesde = document.querySelector(`.input-desde-liq[data-cuil="${cuil}"]`);
        const inputHasta = document.querySelector(`.input-hasta-liq[data-cuil="${cuil}"]`);
        

        if (selectModo && inputValor) {
            let modoSeleccionado = selectModo.value; 
            let valorEditado = parseFloat(inputValor.value) || 0;
            
            if (modoSeleccionado === "HORAS") {
                labelPrincipal = "Horas Normales";
                horasTrabajadas = valorEditado;
            } else {
                labelPrincipal = "Sueldo Básico";
                brutoUnitario = valorEditado; 
            }
        }

        let periodoRecibo = textoPeriodo;
        if (inputDesde && inputHasta && inputDesde.value && inputHasta.value) {
            let fDesde = inputDesde.value.split('-').reverse().join('/');
            let fHasta = inputHasta.value.split('-').reverse().join('/');
            periodoRecibo = `DESDE ${fDesde} HASTA ${fHasta}`;
        } else if (inputDesde && inputDesde.value) {
            periodoRecibo = `DESDE ${inputDesde.value.split('-').reverse().join('/')}`;
        }

        let sueldoBaseCalculado = labelPrincipal === "Horas Normales" ? (brutoUnitario * horasTrabajadas) : brutoUnitario;
        
        let aniosAntiguedad = 0;
        if (em[3]) {
            let fechaIngresoDate = new Date(em[3].split('T')[0] + 'T00:00:00');
            let fechaLiquidacionDate = new Date(); 
            const periodoLiqVal = document.getElementById('liq-periodo') ? document.getElementById('liq-periodo').value : "";
            if (periodoLiqVal) {
                fechaLiquidacionDate = new Date(periodoLiqVal + '-01T00:00:00');
            }
            
            aniosAntiguedad = fechaLiquidacionDate.getFullYear() - fechaIngresoDate.getFullYear();
            if (fechaLiquidacionDate.getMonth() < fechaIngresoDate.getMonth() || 
               (fechaLiquidacionDate.getMonth() === fechaIngresoDate.getMonth() && fechaLiquidacionDate.getDate() < fechaIngresoDate.getDate())) {
                aniosAntiguedad--;
            }
            if (aniosAntiguedad < 0) aniosAntiguedad = 0;
        }

        let configGremio = {
            "ADICIONAL": 4, 
            "PRESENTISMO": 20, 
            "ANTIGÜEDAD": 1,
            "NO REMUNERATIVO": 20000, 
            "JUBILACIÓN": 3,
            "LEY 19032": 3,
            "OBRA SOCIAL": 3,
            "CUOTA SINDICAL": 2.5,
            "SEGURO DE VIDA": 0
        };

        const gremioNombre = em[10];
        const gremioObj = cacheGremios.find(g => g[0] === gremioNombre);

        let customConceptos = [];
        let tieneAdicional = false, tienePresentismo = false, tieneNoRem = false, tieneAntiguedad = false;
        let tieneJubilacion = false, tieneLey = false, tieneObraSocial = false;
        let tieneCuota = false, tieneSeguro = false;

        conceptos.forEach(c => {
            let nom = c.nombre.toUpperCase().trim();
            let valorEditado = parseFloat(c.valor);
            
            if(!isNaN(valorEditado)) {
                if(nom === "ADICIONAL" || nom === "ADICIONAL 1") { configGremio["ADICIONAL"] = valorEditado; tieneAdicional = true; }
                else if(nom === "PRESENTISMO") { configGremio["PRESENTISMO"] = valorEditado; tienePresentismo = true; }
                else if(nom === "ANTIGÜEDAD" || nom === "ANTIGUEDAD") { configGremio["ANTIGÜEDAD"] = valorEditado; tieneAntiguedad = true; }
                else if(nom === "NO REMUNERATIVO") { configGremio["NO REMUNERATIVO"] = valorEditado; tieneNoRem = true; }
                else if(nom === "JUBILACIÓN" || nom === "JUBILACION") { configGremio["JUBILACIÓN"] = valorEditado; tieneJubilacion = true; }
                else if(nom === "LEY 19032") { configGremio["LEY 19032"] = valorEditado; tieneLey = true; }
                else if(nom === "OBRA SOCIAL") { configGremio["OBRA SOCIAL"] = valorEditado; tieneObraSocial = true; }
                else if(nom === "CUOTA SINDICAL") { configGremio["CUOTA SINDICAL"] = valorEditado; tieneCuota = true; }
                else if(nom === "SEGURO DE VIDA") { configGremio["SEGURO DE VIDA"] = valorEditado; tieneSeguro = true; }
                else if (valorEditado > 0) {
                    customConceptos.push({ nombre: c.nombre, tipo: (c.tipo || "REM").toUpperCase(), modo: (c.modo || "monto").toLowerCase(), valor: valorEditado });
                }
            }
        });

        let customRemunerativos = [];
        let customNoRemunerativos = [];
        let customDescuentos = [];

        customConceptos.forEach(c => {
            let isPorcentaje = (c.modo === 'porcentaje' || c.modo === '%');
            let calcVal = 0;
            let porcStr = isPorcentaje ? c.valor : "";
            
            if (c.tipo.includes("NO_REM") || c.tipo.includes("NO REM")) {
                calcVal = isPorcentaje ? (sueldoBaseCalculado * (c.valor / 100)) : c.valor;
                customNoRemunerativos.push({ nombre: c.nombre, porc: porcStr, valor: calcVal });
            } else if (c.tipo.includes("DESC") || c.tipo.includes("RETENCION")) {
                customDescuentos.push({ nombre: c.nombre, porc: porcStr, valor: c.valor, isPorcentaje: isPorcentaje });
            } else { 
                calcVal = isPorcentaje ? (sueldoBaseCalculado * (c.valor / 100)) : c.valor;
                customRemunerativos.push({ nombre: c.nombre, porc: porcStr, valor: calcVal });
            }
        });

        let valAntiguedad = tieneAntiguedad ? (sueldoBaseCalculado * (configGremio["ANTIGÜEDAD"] / 100) * aniosAntiguedad) : 0;
        let valAdicional = tieneAdicional ? (sueldoBaseCalculado * (configGremio["ADICIONAL"] / 100)) : 0;
        let valPresentismo = tienePresentismo ? ((sueldoBaseCalculado + valAdicional + valAntiguedad) * (configGremio["PRESENTISMO"] / 100)) : 0;
        let valCustomRem = customRemunerativos.reduce((sum, item) => sum + item.valor, 0);
        
        let baseRemunerativa = sueldoBaseCalculado + valAdicional + valPresentismo + valAntiguedad + valCustomRem;
        
        let valNoRem = tieneNoRem ? (parseFloat(configGremio["NO REMUNERATIVO"]) || 0) : 0;
        let valCustomNoRem = customNoRemunerativos.reduce((sum, item) => sum + item.valor, 0);
        
        let baseObraSocial = baseRemunerativa + valNoRem + valCustomNoRem; 

        let valJubilacion = tieneJubilacion ? (baseRemunerativa * (configGremio["JUBILACIÓN"] / 100)) : 0;
        let valLey = tieneLey ? (baseRemunerativa * (configGremio["LEY 19032"] / 100)) : 0;
        let valCuota = tieneCuota ? (baseRemunerativa * (configGremio["CUOTA SINDICAL"] / 100)) : 0;
        let valObraSocial = tieneObraSocial ? (baseObraSocial * (configGremio["OBRA SOCIAL"] / 100)) : 0;
        let valSeguro = tieneSeguro ? (parseFloat(configGremio["SEGURO DE VIDA"]) || 0) : 0; 
        
        customDescuentos.forEach(cd => { cd.calcVal = cd.isPorcentaje ? (baseRemunerativa * (cd.valor / 100)) : cd.valor; });

        let htmlFilas = "";
        let tRem = 0, tNoRem = 0, tDesc = 0;

        function agregarFila(nombre, base, porcentaje, rem, desc, noRem) {
            if (rem === 0 && noRem === 0 && desc === 0) return;
            tRem += rem; tNoRem += noRem; tDesc += desc;
            // 🔴 APLICANDO EL FORMATO A LAS FILAS
            htmlFilas +=`<tr>
                <td style="text-align: left;">${nombre}</td>
                <td style="text-align: center;">${base}</td>
                <td style="text-align: center;">${porcentaje}</td>
                <td style="text-align: right;">${rem > 0 ? '$ ' + formatoMoneda(rem) : ''}</td>
                <td style="text-align: right;">${desc > 0 ? '$ ' + formatoMoneda(desc) : ''}</td>
                <td style="text-align: right;">${noRem > 0 ? '$ ' + formatoMoneda(noRem) : ''}</td>
            </tr>`;
        }

        let baseSueldoImpreso = labelPrincipal === "Horas Normales" ? horasTrabajadas : "30";
        agregarFila(labelPrincipal, baseSueldoImpreso, "-", sueldoBaseCalculado, 0, 0);
        
        if(tieneAntiguedad && aniosAntiguedad > 0) {
            let porcentajeImpreso = (configGremio["ANTIGÜEDAD"] * aniosAntiguedad);
            agregarFila("Antigüedad (" + aniosAntiguedad + " años)", "", porcentajeImpreso.toFixed(1), valAntiguedad, 0, 0);
        }
        if(tieneAdicional && valAdicional > 0) agregarFila("Adicional", "", configGremio["ADICIONAL"], valAdicional, 0, 0);
        if(tienePresentismo && valPresentismo > 0) agregarFila("Presentismo", "", configGremio["PRESENTISMO"], valPresentismo, 0, 0);
        
        customRemunerativos.forEach(cr => agregarFila(cr.nombre, "", cr.porc, cr.valor, 0, 0));

        if(tieneNoRem && valNoRem > 0) agregarFila("No Remunerativo", "", "", 0, 0, valNoRem);
        customNoRemunerativos.forEach(cnr => agregarFila(cnr.nombre, "", cnr.porc, 0, 0, cnr.valor));

        if(tieneJubilacion && valJubilacion > 0) agregarFila("Jubilación", "", configGremio["JUBILACIÓN"], 0, valJubilacion, 0);
        if(tieneLey && valLey > 0) agregarFila("Ley 19032", "", configGremio["LEY 19032"], 0, valLey, 0);
        if(tieneObraSocial && valObraSocial > 0) agregarFila("Obra Social", "", configGremio["OBRA SOCIAL"], 0, valObraSocial, 0);
        if(tieneCuota && valCuota > 0) agregarFila("Cuota Sindical", "", configGremio["CUOTA SINDICAL"], 0, valCuota, 0);
        if(tieneSeguro && valSeguro > 0) agregarFila("Seguro de Vida", "", "", 0, valSeguro, 0);

        customDescuentos.forEach(cd => agregarFila(cd.nombre, "", cd.porc, 0, cd.calcVal, 0));

        let netoPreliminar = (tRem + tNoRem) - tDesc;
        let netoRedondeado = Math.ceil(netoPreliminar);
        let valorRedondeo = parseFloat((netoRedondeado - netoPreliminar).toFixed(2));

        if (valorRedondeo > 0) { agregarFila("Redondeo", "", "", 0, 0, valorRedondeo); }

        let neto = (tRem + tNoRem) - tDesc; 
        
        let textoNetoRaw = typeof numeroALetras === 'function' ? numeroALetras(neto) : '';
        let textoNetoLimpio = textoNetoRaw.replace('RECIBÍ CONFORME LA SUMA DE:', '').trim();

        function generarMitadRecibo(tipoCopia) {
            
            // 🔴 NUEVO: Armamos la fila final dinámicamente. 
            // Si hay descripción, la metemos al medio. Si está vacía, dejamos el diseño original.
            let headersFilaFinal = "";
            let valoresFilaFinal = "";

            if (typeof textoDescripcion !== 'undefined' && textoDescripcion !== "") {
                headersFilaFinal = `
                    <th>Último Depósito</th>
                    <th colspan="2">Descripción / Observación</th>
                    <th>Domicilio de Pago</th>
                    <th>Tarea Desempeñada</th>
                `;
                valoresFilaFinal = `
                    <td style="text-align: center;">${periodoRecibo.toUpperCase()}</td>
                    <td colspan="2" style="text-align: center; font-weight: bold;">${textoDescripcion}</td>
                    <td style="text-align: center;">${direccionEmpresa}</td>
                    <td style="text-align: center;">${tarea}</td>
                `;
            } else {
                headersFilaFinal = `
                    <th colspan="2">Último Depósito</th>
                    <th colspan="2">Domicilio de Pago</th>
                    <th>Tarea Desempeñada</th>
                `;
                valoresFilaFinal = `
                    <td colspan="2" style="text-align: center;">${periodoRecibo.toUpperCase()}</td>
                    <td colspan="2" style="text-align: center;">${direccionEmpresa}</td>
                    <td style="text-align: center;">${tarea}</td>
                `;
            }

            return `
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; margin-bottom: 15px;">
                <div>
                    <h4 style="margin: 0; font-weight: bold; text-transform: uppercase;">${nombreEmpresa}</h4>
                    <div style="font-size: 11px; margin-top: 2px;">CUIT: ${cuitEmpresa}</div>
                    <div style="font-size: 11px; margin-top: 2px;">Dirección: ${direccionEmpresa}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold; font-size: 12px;">${tipoCopia}</div>
                    <div style="font-weight: bold; font-size: 12px;">Legajo Nº: ${legajo}</div>
                </div>
            </div>

            <table class="tabla-clasica" style="margin-bottom: 0;">
                <tr>
                    <th style="width: 25%">Nombre y Apellido</th>
                    <th style="width: 15%">Fecha Ingreso</th>
                    <th style="width: 20%">CUIL</th>
                    <th style="width: 20%">Dep. en Caja de Ahorro Nº</th>
                    <th style="width: 20%">Sueldo Básico</th>
                </tr>
                <tr>
                    <td style="text-align: center;">${nombreEmpleado}</td>
                    <td style="text-align: center;">${fechaIngreso}</td>
                    <td style="text-align: center;">${cuil}</td>
                    <td style="text-align: center;"></td>
                    <td style="text-align: center;">$ ${formatoMoneda(brutoUnitario)}</td>
                </tr>
                    <tr>
                    <th>Período Abonado</th>
                    <th>Fecha de Pago</th>
                    <th>Banco de Depósito</th>
                    <th>Fecha Último Depósito</th>
                    <th>Calificación Profesional</th>
                </tr>
                <tr>
                    <td style="text-align: center;">${textoPeriodoAbonado}</td>
                    <td style="text-align: center;">${textoFechaPago}</td>
                    <td style="text-align: center;">${banco}</td>
                    <td style="text-align: center;">${aportes}</td>
                    <td style="text-align: center;">${tarea}</td>
                </tr>
                <tr>
                    ${headersFilaFinal}
                </tr>
                <tr>
                    ${valoresFilaFinal}
                </tr>
            </table>

            <table class="tabla-clasica tabla-conceptos" style="table-layout: fixed; margin-bottom: 0;">
                <thead>
                    <tr>
                        <th style="width: 35%">Descripción de Conceptos</th>
                        <th style="width: 8%">Base</th>
                        <th style="width: 7%">%</th>
                        <th style="width: 16.6%">Remuneraciones</th>
                        <th style="width: 16.6%">Descuentos</th>
                        <th style="width: 16.6%">Conceptos No Remun.</th>
                    </tr>
                </thead>
                <tbody>
                    ${htmlFilas}
                    <tr style="height: 120px;">
                        <td></td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr style="border-top: 2px solid #000; border-bottom: 2px solid #000; background: #f8f9fa;">
                        <td colspan="3" style="text-align: right; font-weight: bold; border-right: 1px solid #000;">Subtotales:</td>
                        <td style="text-align: right; font-weight: bold; border-right: 1px solid #000;">$ ${formatoMoneda(tRem)}</td>
                        <td style="text-align: right; font-weight: bold; border-right: 1px solid #000;">$ ${formatoMoneda(tDesc)}</td>
                        <td style="text-align: right; font-weight: bold;">$ ${formatoMoneda(tNoRem)}</td>
                    </tr>
                    <tr>
                        <td colspan="3" rowspan="4" style="border: none; padding: 15px 10px; vertical-align: top;">
                            <p style="margin: 0; font-size: 11px;">Recibí conforme la suma de:<br>
                            <strong>SON: ${textoNetoLimpio}</strong></p>
                        </td>
                        <td colspan="2" style="text-align: center; font-weight: bold; border-left: 1px solid #000; border-bottom: 1px solid #000;">TOTAL BRUTO</td>
                        <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000;">$ ${formatoMoneda(tRem)}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="text-align: center; font-weight: bold; border-left: 1px solid #000; border-bottom: 1px solid #000;">TOTAL NO REMUNERATIVO</td>
                        <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000;">$ ${formatoMoneda(tNoRem)}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="text-align: center; font-weight: bold; border-left: 1px solid #000; border-bottom: 1px solid #000;">TOTAL DESCUENTOS</td>
                        <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000;">$ ${formatoMoneda(tDesc)}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="text-align: center; font-weight: bold; font-size: 13px; border-left: 1px solid #000; border-bottom: 1px solid #000; background: #e9ecef;">TOTAL NETO</td>
                        <td style="text-align: right; font-weight: bold; font-size: 13px; border-bottom: 1px solid #000; background: #e9ecef;">$ ${formatoMoneda(neto)}</td>
                    </tr>
                </tfoot>
            </table>

            <div style="font-size: 10px; margin-top: 33px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <p style="margin: 0; color: #555; font-size: 9px; width: 60%;">
                        En concepto de mis haberes correspondientes al período arriba indicado y según la presente liquidación, dejando constancia de haber recibido un duplicado de este recibo.
                    </p>
                    <div style="text-align: center; width: 30%; border-top: 1px solid #000; padding-top: 5px; margin-top: 40px;">
                        Firma del Empleado
                    </div>
                </div>
            </div>
            `;
        }

        htmlVentana += `
        <div class="hoja-recibo">
            <div class="mitad-recibo">
                ${generarMitadRecibo('ORIGINAL PARA EL EMPLEADOR')}
            </div>
        </div>
        
        <div class="hoja-recibo">
            <div class="mitad-recibo">
                ${generarMitadRecibo('DUPLICADO PARA EL EMPLEADO')}
            </div>
        </div>`;
    });

    htmlVentana += `</body></html>`;
    
    const win = window.open('', '_blank');
    win.document.write(htmlVentana);
    win.document.close();
    
    const modalEl = document.getElementById('modalLiquidacion');
    if(modalEl) {
        const inst = bootstrap.Modal.getInstance(modalEl);
        if(inst) inst.hide();
    }
    if(typeof resetearVistaLiquidacion === 'function') resetearVistaLiquidacion();
}

// NUEVA FUNCIÓN: Solo se encarga de mostrar los ocultos y borrar el botón
function mostrarTodoLoteLiq() {
    document.querySelectorAll('.fila-extra-liq').forEach(fila => fila.classList.remove('d-none'));
    const btnFila = document.getElementById('fila-btn-ver-mas');
    if (btnFila) btnFila.remove();
}

/* ============================================================
   🏷️ GESTIÓN INTEGRAL DE GREMIOS (BLOQUE 4 DE 4)
   ============================================================ */

const CONCEPTOS_DISPONIBLES = [
    // ... tus otros conceptos ...
    {
        nombre: "HORAS COMUNES",
        tipo: "REM",
        modo: "cantidad" 
    },
    
    // 2. ADICIONAL 1 (4% sobre HORAS COMUNES)
    {
        nombre: "ADICIONAL 1",
        tipo: "REM",
        modo: "porcentaje",
        valor: 4,
        esCombinado: true,
        conceptosBase: ["HORAS COMUNES"]
    },
    
    // 3. PRESENTISMO (20% sobre la suma de HORAS COMUNES + ADICIONAL 1)
    {
        nombre: "PRESENTISMO",
        tipo: "REM",
        modo: "porcentaje",
        valor: 20,
        esCombinado: true,
        conceptosBase: ["HORAS COMUNES", "ADICIONAL 1"]
    }
];


function actualizarPlaceholderValor() {
    const modo = document.getElementById('con-modo').value;
    const input = document.getElementById('con-valor');
    const label = document.getElementById('label-con-valor');
    if (!input || !label) return;

    if (modo === 'porcentaje') { 
        input.placeholder = "Ej: 11"; 
        label.innerText = "VALOR (%)"; 
    } else if (modo === 'monto') { 
        input.placeholder = "Ej: 5000"; 
        label.innerText = "MONTO ($)"; 
    } else { 
        input.placeholder = "Ej: 1"; 
        label.innerText = "CANTIDAD (#)"; 
    }
}

function agregarCategoriaGremio() {
    const nombre = document.getElementById('cat-nombre').value.trim();
    const valor = document.getElementById('cat-valor').value;
    const tipo = document.getElementById('cat-tipo').value; // MENSUAL o POR HORA
    
    // Capturamos el nuevo desplegable
    const claseEl = document.getElementById('cat-clase');
    const clase = claseEl ? claseEl.value : 'REMUNERATIVO';

    if (!nombre || !valor) {
        return mostrarAlertaPersonalizada("Atención", "Completá el nombre y el sueldo básico de la categoría.", "advertencia");
    }

    // Lo agregamos al arreglo manteniendo la estructura vieja + el dato nuevo
    categoriasTemporales.push({ 
        nombre: nombre.toUpperCase(), 
        valor: parseFloat(valor), 
        tipo: tipo, 
        clase: clase 
    });
    
    // Limpiamos y volvemos el foco al nombre para cargar rápido
    document.getElementById('cat-nombre').value = "";
    document.getElementById('cat-valor').value = "";
    document.getElementById('cat-nombre').focus(); 
    
    renderizarCategoriasTemporales();
}

function renderizarCategoriasTemporales() {
    const lista = document.getElementById('lista-categorias-gremio');
    if (!lista) return;
    lista.innerHTML = categoriasTemporales.map((c, i) => `
        <div class="col-md-4 mb-2">
            <div class="p-2 border rounded bg-white shadow-sm position-relative border-start border-4 border-primary">
                <div class="fw-bold small text-uppercase" style="padding-right: 15px;">${c.nombre}</div>
                <div class="text-muted" style="font-size:0.75rem">${c.tipo} | ${c.clase || 'REMUNERATIVO'}: $${parseFloat(c.valor).toLocaleString('es-AR')}</div>
                <i class="bi bi-x-circle text-danger position-absolute top-0 end-0 m-1 cursor-pointer" onclick="categoriasTemporales.splice(${i},1);renderizarCategoriasTemporales()" title="Eliminar"></i>
            </div>
        </div>`).join('');
}
function renderizarConceptosTemporales() {
    const lista = document.getElementById('lista-conceptos-gremio');
    const base = document.getElementById('lista-conceptos-base');
    if (!lista || !base) return;

    // 🔴 ESTRUCTURA NUEVA: Acordeón desplegable (siempre abierto con la clase "show")
    lista.innerHTML = `
        <div class="col-12 mb-2">
            <div class="accordion accordion-flush border border-secondary-subtle rounded shadow-sm" id="acc-conceptos-gre">
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button py-2 fw-bold text-success bg-success-subtle rounded" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-conceptos-gre">
                            <i class="bi bi-list-task me-2"></i> CONCEPTOS SIMPLES (BÁSICOS)
                        </button>
                    </h2>
                    <div id="collapse-conceptos-gre" class="accordion-collapse collapse show" data-bs-parent="#acc-conceptos-gre">
                        <div class="accordion-body p-0">
                            <ul class="list-group list-group-flush">
                                ${conceptosTemporales.filter(c => !c.esCombinado).map(c => {
                                    // Obtenemos el índice real para que la función de eliminar siga funcionando perfecto
                                    const indexReal = conceptosTemporales.indexOf(c); 
                                    return `
                                    <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                        <div class="fw-bold small text-uppercase d-flex align-items-center">
                                            <i class="bi bi-x-circle text-danger me-2 cursor-pointer fs-6" onclick="conceptosTemporales.splice(${indexReal},1);renderizarConceptosTemporales()" title="Eliminar"></i>
                                            ${c.nombre}
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="small text-muted text-uppercase d-none d-sm-inline" style="font-size:0.65rem;">${c.tipo}</span>
                                            <div class="input-group input-group-sm" style="width: 95px;">
                                                <span class="input-group-text p-1" style="font-size:0.7rem">${c.modo === 'porcentaje' ? '%' : '$'}</span>
                                                <input type="number" step="any" class="form-control form-control-sm p-1 fw-bold text-end bg-white" value="${c.valor}" oninput="conceptosTemporales[${indexReal}].valor = parseFloat(this.value)||0">
                                            </div>
                                        </div>
                                    </li>`;
                                }).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Regeneramos los checkboxes base para los conceptos combinados
    base.innerHTML = conceptosTemporales.map((c, i) => `
        <div class="form-check form-check-inline border rounded px-2 mb-1 shadow-xs bg-white">
            <input class="form-check-input" type="checkbox" id="base-${i}">
            <label class="form-check-label small" for="base-${i}">${c.nombre}</label>
        </div>`).join('');
}
function agregarConceptoTemporal() {
    const nombre = document.getElementById('con-nombre').value.trim();
    const tipo = document.getElementById('con-tipo').value;
    const modo = document.getElementById('con-modo').value;
    const valor = document.getElementById('con-valor').value;

    if (!nombre || !valor) return alert("⚠️ Completá el nombre y valor del concepto básico.");

    conceptosTemporales.push({
        nombre: nombre.toUpperCase(),
        tipo: tipo,
        modo: modo,
        valor: parseFloat(valor),
        esCombinado: false,
        conceptosBase: []
    });

    document.getElementById('con-nombre').value = "";
    document.getElementById('con-valor').value = "";
    renderizarConceptosTemporales();
}

function crearConceptoCombinado() {
    const nombre = document.getElementById('comb-nombre').value.trim();
    const tipo = document.getElementById('comb-tipo').value;
    const modo = document.getElementById('comb-modo').value;
    const valor = document.getElementById('comb-valor').value;
    
    const seleccionados = [];
    
    // Verificamos el Sueldo Básico
    const checkSueldo = document.getElementById('base-sueldo-basico');
    if (checkSueldo && checkSueldo.checked) {
        seleccionados.push("SUELDO BÁSICO");
    }

    // NUEVO: Verificamos todos los conceptos por su índice real en el array completo
    conceptosTemporales.forEach((c, index) => {
        const check = document.getElementById(`base-${index}`);
        if (check && check.checked) {
            seleccionados.push(c.nombre);
        }
    });

    if (!nombre || !valor || seleccionados.length === 0) {
        return alert("⚠️ Poné un nombre, valor y tildá al menos un concepto básico para usar como base.");
    }

    conceptosTemporales.push({
        nombre: nombre.toUpperCase() + " (COMB)",
        tipo: tipo,
        modo: modo,
        valor: parseFloat(valor),
        esCombinado: true,
        conceptosBase: seleccionados
    });
    
    document.getElementById('comb-nombre').value = "";
    document.getElementById('comb-valor').value = "";
    renderizarConceptosTemporales();
}




async function cargarGremios() {
    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=gremios&t=${Date.now()}`);
        cacheGremios = await resp.json();
        renderizarTablaGremios();
    } catch (e) { console.error("Error al cargar gremios:", e); }
}

function renderizarTablaGremios() {
    const cuerpo = document.getElementById('tabla-gremios-cuerpo');
    if (!cuerpo) return;
    
    cuerpo.innerHTML = cacheGremios.map(g => {
        // 🔴 Se encriptan todas las variables para que NUNCA rompan el evento onclick
        const nombreEscaped = encodeURIComponent(g[0] || "").replace(/'/g, "%27");
        const actividadEscaped = encodeURIComponent(g[1] || "").replace(/'/g, "%27");
        const catsEscaped = encodeURIComponent(g[2] || "[]").replace(/'/g, "%27");
        const consEscaped = encodeURIComponent(g[3] || "[]").replace(/'/g, "%27");
        
        return `
        <tr onclick="prepararEdicionGremio('${nombreEscaped}', '${actividadEscaped}', '${catsEscaped}', '${consEscaped}')" style="cursor: pointer;" title="Haga clic para editar">
            <td class="fw-bold text-uppercase ps-3">
                <i class="bi bi-folder2-open text-warning me-2"></i> ${g[0]}
            </td>
            <td class="text-muted fw-bold">${g[1] || '---'}</td>
            <td><span class="badge bg-success-subtle text-success border border-success">Configurado</span></td>
            <td class="text-end pe-3" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-outline-warning me-1" onclick="prepararEdicionGremio('${nombreEscaped}', '${actividadEscaped}', '${catsEscaped}', '${consEscaped}')" title="Editar Gremio">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarGremio('${nombreEscaped}')" title="Eliminar Gremio">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function abrirModalGremio() {
    // 1. LIMPIEZA DE CATEGORÍAS (esto sí debe ser nuevo al crear un gremio)
    categoriasTemporales = [];
    
    // 2. LÓGICA DE CONCEPTOS: 
    // Cargamos SIEMPRE los valores por defecto al abrir un gremio nuevo para que aparezcan fijos.
    conceptosTemporales = [
        { nombre: "ADICIONAL 1", tipo: "REM", modo: "porcentaje", valor: 4, esCombinado: false },
        { nombre: "PRESENTISMO", tipo: "REM", modo: "porcentaje", valor: 20, esCombinado: false },
        { nombre: "NO REMUNERATIVO", tipo: "NO_REM", modo: "monto", valor: 20000, esCombinado: false },
        { nombre: "JUBILACIÓN", tipo: "DESC", modo: "porcentaje", valor: 3, esCombinado: false },
        { nombre: "LEY 19032", tipo: "DESC", modo: "porcentaje", valor: 3, esCombinado: false },
        { nombre: "OBRA SOCIAL", tipo: "DESC", modo: "porcentaje", valor: 3, esCombinado: false },
        { nombre: "CUOTA SINDICAL", tipo: "DESC", modo: "porcentaje", valor: 2.5, esCombinado: false },
        { nombre: "ANTIGÜEDAD", tipo: "REM", modo: "porcentaje", valor: 1, esCombinado: false },
        { nombre: "SEGURO DE VIDA", tipo: "DESC", modo: "monto", valor: 0, esCombinado: false }
    ];

    document.getElementById('form-gremio').reset();
    document.getElementById('gre-nombre-original').value = "";
    
    // 3. Abrimos el modal
    // 3. Abrimos el modal y lo forzamos al 70% de ancho
    const modalElement = document.getElementById('modalGremio');
    const modalDialog = modalElement.querySelector('.modal-dialog');
    if (modalDialog) {
        modalDialog.style.maxWidth = '70%';
        modalDialog.style.width = '70%';
    }
    let modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();

    // 4. Renderizado
    setTimeout(() => {
        renderizarCategoriasTemporales();
        renderizarConceptosTemporales();
    }, 100); 
}
function renderizarConceptosGremios() {
    const contenedor = document.getElementById('contenedor-conceptos-gremio'); // El div donde quieres que aparezcan
    if (!contenedor) return;

    contenedor.innerHTML = conceptosTemporales.map((c, i) => `
        <div class="row align-items-center mb-2 p-2 border-bottom">
            <div class="col-4 fw-bold">${c.nombre}</div>
            <div class="col-4">
                <input type="number" class="form-control form-control-sm" value="${c.valor}" 
                       oninput="conceptosTemporales[${i}].valor = parseFloat(this.value)">
            </div>
            <div class="col-4 text-muted small">${c.modo === 'porcentaje' ? '%' : '$'}</div>
        </div>
    `).join('');
}


async function guardarGremio(e) {
    e.preventDefault();
    
    // 🟢 YA NO BLOQUEAMOS MÁS porque siempre hay conceptos en conceptosTemporales
    const btn = e.submitter || document.querySelector('#form-gremio button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> GUARDANDO...';
    }

    const inputOriginal = document.getElementById('gre-nombre-original');
    const nombreOriginal = inputOriginal ? inputOriginal.value : "";
    const esEdicion = nombreOriginal !== "";

    const datos = {
        action: esEdicion ? 'editarGremio' : 'crearGremio',
        nombreOriginal: nombreOriginal,
        nombre: document.getElementById('gre-nombre').value.trim(),
        actividad: document.getElementById('gre-actividad').value.trim(),
        categorias: JSON.stringify(categoriasTemporales),
        conceptos: JSON.stringify(conceptosTemporales)
    };

    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify(datos) });
        if (resp.ok) {
            mostrarAlertaPersonalizada("Éxito", esEdicion ? "Convenio actualizado." : "Convenio guardado.", "exito");
            bootstrap.Modal.getInstance(document.getElementById('modalGremio'))?.hide();
            await cargarGremios();
        } else {
            mostrarAlertaPersonalizada("Error", "Error en el servidor.", "error");
        }
    } catch (err) { 
        mostrarAlertaPersonalizada("Error", "Error al conectar con la base de datos.", "error"); 
    } finally { 
        if (btn) {
            btn.disabled = false;
            btn.innerText = "GUARDAR GREMIO COMPLETO";
        }
    }
}

function prepararEdicionGremio(nombreEsc, actividadEsc, catsJson, consJson) {
    // 🔴 DESENCRIPTAMOS el nombre y la actividad para limpiar los %20 y %C3%B3
    const nombre = decodeURIComponent(nombreEsc);
    const actividad = decodeURIComponent(actividadEsc);

    document.getElementById('form-gremio').reset();
    document.getElementById('gre-nombre').value = nombre;
    document.getElementById('gre-actividad').value = actividad;
    
    const inputOriginal = document.getElementById('gre-nombre-original');
    if (inputOriginal) inputOriginal.value = nombre;

    try {
        categoriasTemporales = JSON.parse(decodeURIComponent(catsJson));
        conceptosTemporales = JSON.parse(decodeURIComponent(consJson));
    } catch (e) {
        categoriasTemporales = [];
        conceptosTemporales = [];
    }

    // 🟢 INYECTA LOS CONCEPTOS SI EL GREMIO ES VIEJO Y NO LOS TENÍA
    const conceptosBaseDefault = [
        { nombre: "ADICIONAL 1", tipo: "REM", modo: "porcentaje", valor: 4, esCombinado: false },
        { nombre: "PRESENTISMO", tipo: "REM", modo: "porcentaje", valor: 20, esCombinado: false },
        { nombre: "NO REMUNERATIVO", tipo: "NO_REM", modo: "monto", valor: 20000, esCombinado: false },
        { nombre: "JUBILACIÓN", tipo: "DESC", modo: "porcentaje", valor: 3, esCombinado: false },
        { nombre: "LEY 19032", tipo: "DESC", modo: "porcentaje", valor: 3, esCombinado: false },
        { nombre: "OBRA SOCIAL", tipo: "DESC", modo: "porcentaje", valor: 3, esCombinado: false },
        { nombre: "ANTIGÜEDAD", tipo: "REM", modo: "porcentaje", valor: 1, esCombinado: false },
        { nombre: "CUOTA SINDICAL", tipo: "DESC", modo: "porcentaje", valor: 2.5, esCombinado: false },
        { nombre: "SEGURO DE VIDA", tipo: "DESC", modo: "monto", valor: 0, esCombinado: false }
    ];

    conceptosBaseDefault.forEach(def => {
        if (!conceptosTemporales.find(c => c.nombre.toUpperCase() === def.nombre)) {
            conceptosTemporales.push(def);
        }
    });

    renderizarCategoriasTemporales();
    renderizarConceptosTemporales();

    const modalElement = document.getElementById('modalGremio');
    const modalDialog = modalElement.querySelector('.modal-dialog');
    if (modalDialog) {
        modalDialog.style.maxWidth = '70%';
        modalDialog.style.width = '70%';
    }
    let modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}
function eliminarGremio(nombreEsc) {
    // 🔴 DESENCRIPTAMOS EL NOMBRE
    const nombre = decodeURIComponent(nombreEsc);
    
    mostrarAlertaPersonalizada(
        "¿Eliminar Categoría?", 
        `¿Estás seguro de eliminar por completo la categoría ${nombre}?\nAfectará a las fichas que lo tengan asignado.`, 
        "peligro", 
        () => ejecutarEliminacionGremio(nombre)
    );
}

async function ejecutarEliminacionGremio(nombre) {
    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify({ action: 'eliminarGremio', nombre: nombre }) });
        const texto = await resp.text();
        if (texto === "OK") {
            mostrarAlertaPersonalizada("Eliminado", "Gremio eliminado correctamente.", "exito");
            await cargarGremios();
        } else {
            mostrarAlertaPersonalizada("Error", texto, "error");
        }
    } catch (e) { 
        mostrarAlertaPersonalizada("Error de conexión", "No se pudo conectar con el servidor al eliminar.", "error"); 
    }
}


// Pon esto al final de tu script.js
document.addEventListener('click', function(e) {
    // Si el usuario hace clic en un input de tipo date
    if (e.target && e.target.type === 'date') {
        if (e.target.showPicker) {
            e.target.showPicker();
        }
    }
});
async function renderizarTablaEmpleados(empleados) {
    const contenedor = document.getElementById('lista-empleados'); // Asegúrate de tener este ID
    if (!contenedor) return;

    contenedor.innerHTML = empleados.map(em => `
        <div class="card mb-2 shadow-sm border-0">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="fw-bold mb-0">${em[1]}</h6> <small class="text-muted">CUIL: ${em[2]}</small> </div>
                    <div>
                        <button class="btn btn-outline-warning btn-sm me-1" onclick="prepararEdicionEmpleado('${em[2]}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="eliminarEmpleado('${em[2]}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}
// ============================================================
// 🔔 MOTOR DE ALERTAS PERSONALIZADAS
// ============================================================
function mostrarAlertaPersonalizada(titulo, mensaje, tipo = 'info', funcionConfirmar = null) {
    // Eliminamos cualquier alerta previa que haya quedado en pantalla
    const modalPrevio = document.getElementById('modal-alerta-custom');
    if (modalPrevio) modalPrevio.remove();

    let colorTema = 'text-primary';
    let btnConfirmarClase = 'btn-primary';
    
    // Ícono por defecto
    let iconoHtml = `<div class="mx-auto d-flex align-items-center justify-content-center border border-primary rounded-circle mb-3" style="width: 65px; height: 65px; border-width: 3px !important; color: #0d6efd;">
        <i class="bi bi-info" style="font-size: 2.5rem; font-weight: bold;"></i>
    </div>`;

    // Adaptamos colores e íconos según el tipo de mensaje
    if (tipo === 'exito') {
        btnConfirmarClase = 'btn-success';
        iconoHtml = `<div class="mx-auto d-flex align-items-center justify-content-center border border-success rounded-circle mb-3" style="width: 65px; height: 65px; border-width: 3px !important; color: #198754;">
            <i class="bi bi-check" style="font-size: 3rem; font-weight: bold;"></i>
        </div>`;
    } else if (tipo === 'error' || tipo === 'peligro') {
        btnConfirmarClase = 'btn-danger';
        iconoHtml = `<div class="mx-auto d-flex align-items-center justify-content-center border border-danger rounded-circle mb-3" style="width: 65px; height: 65px; border-width: 3px !important; color: #dc3545;">
            <span style="font-size: 2.5rem; font-weight: bold;">!</span>
        </div>`;
    } else if (tipo === 'advertencia') {
        btnConfirmarClase = 'btn-warning text-dark';
        iconoHtml = `<div class="mx-auto d-flex align-items-center justify-content-center border border-warning rounded-circle mb-3" style="width: 65px; height: 65px; border-width: 3px !important; color: #ffc107;">
            <span style="font-size: 2.5rem; font-weight: bold;">!</span>
        </div>`;
    }

    const mostrarCancelar = funcionConfirmar !== null;
    const textoBtnConfirmar = mostrarCancelar ? (tipo === 'peligro' ? 'Eliminar' : 'Aceptar') : 'Aceptar';

    // Generamos el HTML calcado de tu imagen
    const htmlModal = `
        <div class="modal fade" id="modal-alerta-custom" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" style="max-width: 320px;">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 16px;">
                    <div class="modal-body text-center p-4">
                        ${iconoHtml}
                        <h5 class="fw-bold text-dark mb-2">${titulo}</h5>
                        <p class="text-muted small mb-4" style="font-size: 0.9rem;">${mensaje.replace(/\n/g, '<br>')}</p>
                        <div class="d-flex justify-content-center gap-2">
                            ${mostrarCancelar ? `<button type="button" class="btn btn-light px-4 text-dark fw-bold" style="background-color: #e9ecef; border-radius: 8px;" data-bs-dismiss="modal">Cancelar</button>` : ''}
                            <button type="button" class="btn ${btnConfirmarClase} px-4 fw-bold" id="btn-alerta-confirmar" style="border-radius: 8px;">${textoBtnConfirmar}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', htmlModal);
    
    const modalElement = document.getElementById('modal-alerta-custom');
    const modalInstance = new bootstrap.Modal(modalElement);
    
    // Si el usuario confirma, ejecutamos la función que pasamos por parámetro
    document.getElementById('btn-alerta-confirmar').addEventListener('click', () => {
        modalInstance.hide();
        if (funcionConfirmar) funcionConfirmar();
    });

    modalInstance.show();
}
function formatoMoneda(valor) {
    // Convierte el valor a número y le da formato es-AR (155.987,10)
    return parseFloat(valor || 0).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}