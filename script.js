/* ============================================================
   🔹 SCRIPT.JS: MOTOR COMPACTO v4.0 (BLOQUE 1 DE 4)
   ============================================================ */

const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbz8KK8tzJkunSyybaoJCB7gzRWEZLGkzJ0f_l4IsLbs7DKL_i3Ih0n2prPpLuA5ywHp7Q/exec';

// --- ESTADOS GLOBALES ---
let cacheEmpresas = [];
let cacheEmpleados = [];
let cacheGremios = [];
let cuitEmpresaActiva = null;
let listaParaImprimir = [];
let categoriasTemporales = [];
let conceptosTemporales = [];

// --- LOGIN Y SEGURIDAD ---
function iniciarSesion(e) {
    e.preventDefault();
    const u = document.getElementById('user-login').value;
    const p = document.getElementById('pass-login').value;
    if (u === "omar" && p === "1234") {
        sessionStorage.setItem("sueldos_auth", "true");
        mostrarSistema();
    } else {
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
    if (sessionStorage.getItem("sueldos_auth") === "true") mostrarSistema();
    
    // Vinculación de formularios nativos
    const formEmpresa = document.getElementById('form-empresa');
    if (formEmpresa) formEmpresa.onsubmit = guardarEmpresa;
    
    const formEmpleado = document.getElementById('form-empleado');
    if (formEmpleado) formEmpleado.onsubmit = guardarEmpleado;

    // 🔴 NUEVO: Vinculación estricta para el Gremio (evita que la página se recargue)
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

            return `
            <tr>
                <td class="text-center col-check d-none">
                    <input type="checkbox" class="form-check-input check-empleado" data-cuil="${cuil}">
                </td>
                <td class="fw-bold text-uppercase cursor-pointer text-primary" onclick="verFichaEmpleado('${cuil}', '${legajo}')" title="Ver Ficha">
                    <i class="bi bi-person-lines-fill me-1"></i> ${nombre}
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

        // Garantizamos que en la planilla del empleado figuren todos para poder tildarlos
        const conceptosBaseDefault = [
            { nombre: "ADICIONAL", tipo: "REM", modo: "porcentaje", valor: 4, esCombinado: false },
            { nombre: "PRESENTISMO", tipo: "REM", modo: "porcentaje", valor: 20, esCombinado: false },
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
            <label class="xs-label mb-2 text-success">Conceptos de Liquidación</label>
            <div class="row g-2">
                ${conceptos.map((c, i) => {
                    const esCombinado = c.esCombinado || false;
                    const estiloBorde = esCombinado ? 'border-warning' : 'border-secondary';
                    const bgClass = esCombinado ? 'bg-warning-subtle' : 'bg-white';
                    
                    return `
                    <div class="col-md-6 mb-2">
                        <div class="border ${estiloBorde} rounded p-2 ${bgClass} small shadow-xs h-100">
                            <div class="form-check mb-1">
                                <input class="form-check-input check-concepto-emp" type="checkbox" id="cep-${i}" checked
                                    data-nombre="${c.nombre}" data-tipo="${c.tipo}" data-modo="${c.modo}" data-combinado="${esCombinado}">
                                <label class="form-check-label fw-bold text-uppercase" for="cep-${i}">${c.nombre}</label>
                            </div>
                            <div class="d-flex align-items-center gap-1">
                                <span class="small text-muted text-uppercase" style="font-size:0.7rem;">${c.tipo}:</span>
                                <div class="input-group input-group-sm" style="max-width: 105px;">
                                    <span class="input-group-text p-1" style="font-size:0.7rem">${c.modo === 'porcentaje' ? '%' : '$'}</span>
                                    <input type="text" inputmode="decimal" class="form-control form-control-sm p-1 fw-bold" id="val-cep-${i}" value="${c.valor}" oninput="this.value = this.value.replace(',', '.')">
                                </div>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
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
    // Buscamos coincidencia ESTRICTA de CUIL y LEGAJO para evitar el cruce entre Juana y Walter
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
    document.getElementById('empl-tarea').value = emp[4] || "";

    const selectGremio = document.getElementById('empl-gremio');
    selectGremio.value = emp[10] || "";
    actualizarOpcionesGremioEmpleado();

    return new Promise(resolve => {
        setTimeout(() => {
            const selectCat = document.getElementById('empl-categoria');
            if (selectCat && emp[5]) selectCat.value = emp[5];
            
            try {
                // AQUÍ ESTABA EL BUG: Reparado para que lea bien qué checkbox estaba tildado
                const guardados = JSON.parse(emp[11] || "[]");
                document.querySelectorAll('.check-concepto-emp').forEach(chk => {
                    const nombreConcepto = chk.dataset.nombre;
                    const conceptoGuardado = guardados.find(g => g.nombre === nombreConcepto);
                    
                    if (conceptoGuardado) {
                        chk.checked = true;
                        // También recupera el porcentaje o monto modificado
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
        <div class="col-6 col-md-3">
            <label class="xs-label text-white-50 mb-1">Periodo Liquidación</label>
            <input type="month" id="liq-periodo" class="form-control form-control-sm border-0 shadow-sm" value="${new Date().toISOString().slice(0, 7)}">
        </div>
        <div class="col-6 col-md-3">
            <label class="xs-label text-white-50 mb-1">Fecha de Pago</label>
            <input type="date" id="liq-fecha-pago" class="form-control form-control-sm border-0 shadow-sm">
        </div>
        <div class="col-6 col-md-3">
            <label class="xs-label text-white-50 mb-1">Banco Depósito</label>
            <input type="text" id="liq-banco" class="form-control form-control-sm border-0 shadow-sm" placeholder="Ej: Banco Nación">
        </div>
        <div class="col-6 col-md-3">
            <label class="xs-label text-white-50 mb-1">Último Depósito Aportes</label>
            <input type="text" id="liq-aportes" class="form-control form-control-sm border-0 shadow-sm" placeholder="Ej: 10/05/2026">
        </div>
    `;
}

function guardarCambiosEmpresa() {
    // Al manejar datos en memoria volátil de forma dinámica para agilizar los recibos,
    // confirmamos que queden listos en el navegador para el lote de impresión
    alert("✅ Datos mensuales retenidos en caché para la próxima tanda de recibos.");
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



function toggleTodosEmpleados(masterInput) {
    document.querySelectorAll('.check-empleado').forEach(chk => {
        chk.checked = masterInput.checked;
    });
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
        "Antes de generar los recibos, verificá:\n\n✅ ¿Actualizaste el Seguro de Vida?\n✅ ¿El No Remunerativo es correcto?\n✅ ¿Están cargadas las horas?",
        "info",
        () => {
            // 🔴 CORRECCIÓN AQUÍ: Filtramos por CUIL y obligamos a que coincida con la EMPRESA ACTIVA
            const cuitBuscado = cuitEmpresaActiva.toString().trim();
            
            listaParaImprimir = cacheEmpleados.filter(em => {
                const cuil = (em[2] || "").toString().trim();
                const cuitEmpresa = (em[9] || "").toString().trim();
                return seleccionados.includes(cuil) && cuitEmpresa === cuitBuscado;
            });
            
            const contenedor = document.getElementById('contenedor-conceptos');
            if (!contenedor) return;

            let htmlList = '';
            
            listaParaImprimir.forEach((em, index) => {
                let claseOculta = index >= 5 ? 'fila-extra-liq d-none' : '';
                htmlList += `
                    <tr class="${claseOculta}">
                        <td class="fw-bold text-uppercase border-bottom py-2">
                            <i class="bi bi-person-check text-success me-2"></i> ${em[1]} <span class="text-muted fw-normal ms-2">| Legajo: ${em[0]}</span>
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

            const empActiva = cacheEmpresas.find(e => e[2] == cuitEmpresaActiva);
            document.getElementById('cabecera-recibo').innerHTML = `
                <h6 class="fw-bold text-dark mb-0 text-uppercase">${empActiva ? empActiva[0] : 'Empresa'}</h6>
                <small class="text-muted">Procesando un lote de ${listaParaImprimir.length} recibo(s).</small>
            `;

            new bootstrap.Modal(document.getElementById('modalLiquidacion')).show();
        }
    );
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

    // Datos extra del panel mensual (Periodo, Banco, etc.)
    const periodoLiq = document.getElementById('liq-periodo') ? document.getElementById('liq-periodo').value : "";
    let textoPeriodo = periodoLiq;
    if(periodoLiq) {
        const [yy, mm] = periodoLiq.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        textoPeriodo = `${meses[parseInt(mm)-1]} de ${yy}`;
    }
    
    const fechaPago = document.getElementById('liq-fecha-pago') ? document.getElementById('liq-fecha-pago').value : "";
    let textoFechaPago = fechaPago ? fechaPago.split('-').reverse().join('/') : "";
    
    const banco = document.getElementById('liq-banco') ? document.getElementById('liq-banco').value : "";
    const aportes = document.getElementById('liq-aportes') ? document.getElementById('liq-aportes').value : "";

    let htmlVentana = `<html><head><title>Recibos</title>
        <style>
            @media print { 
                .no-print { display: none; } 
                body { margin: 0; padding: 0; background: #fff; }
                .hoja-recibo { page-break-after: always; display: flex; flex-direction: column; height: 98vh; padding: 10mm; box-sizing: border-box; }
                .mitad-recibo { flex: 1; padding: 5mm 0; box-sizing: border-box; }
            } 
            @media screen {
                body { background: #525659; font-family: sans-serif; }
                .hoja-recibo { background: white; width: 210mm; min-height: 297mm; margin: 20px auto; padding: 15mm; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; flex-direction: column; box-sizing: border-box; }
                .mitad-recibo { flex: 1; padding: 5mm 0; box-sizing: border-box; }
                .btn-imprimir { position: fixed; top: 20px; right: 20px; z-index: 1000; padding: 15px 30px; font-size: 18px; font-weight: bold; background: #ffc107; border: 2px solid #000; cursor: pointer; box-shadow: 4px 4px 0 #000; transition: 0.2s; }
                .btn-imprimir:hover { background: #e0a800; }
            }
            .tabla-clasica { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; margin-bottom: 5px; }
            .tabla-clasica th, .tabla-clasica td { border: 1px solid #000; padding: 3px 5px; }
            .tabla-clasica th { text-align: center; font-weight: bold; background-color: #fff; }
            .tabla-conceptos { margin-bottom: 0; border-bottom: none; }
            .tabla-conceptos td { border-top: none; border-bottom: none; }
            .tabla-totales { margin-top: 0; border-top: none; }
            .tabla-totales td { padding: 4px 5px; }
        </style>
    </head><body>
        <div class="no-print"><button class="btn-imprimir" onclick="window.print()">🖨️ IMPRIMIR RECIBOS</button></div>`;

    listaParaImprimir.forEach((em) => {
        let conceptos = [];
        try { conceptos = JSON.parse(em[11] || "[]"); } catch(e){}

        const legajo = em[0] || '';
        const nombreEmpleado = em[1] || '';
        const cuil = em[2] || '';
        let fechaIngreso = em[3] ? em[3].split('T')[0].split('-').reverse().join('/') : '';
        const tarea = em[4] || '';
        const brutoUnitario = parseFloat(em[5]) || 0; 
        const horasTrabajadas = parseFloat(em[13]) || 0; 
        
        let labelPrincipal = "Sueldo Básico"; 
        const gremioNombre = em[10];
        const gremioObj = cacheGremios.find(g => g[0] === gremioNombre);

        if (gremioObj && gremioObj[2]) {
            try {
                const categorias = JSON.parse(decodeURIComponent(gremioObj[2]) || "[]");
                const catEmpleado = categorias.find(c => parseFloat(c.valor) === brutoUnitario);
                if (catEmpleado) {
                    const tipoCat = (catEmpleado.tipo || "").toUpperCase();
                    if (tipoCat.includes("HORA")) labelPrincipal = "Horas Normales";
                } else if (horasTrabajadas > 0) {
                    labelPrincipal = "Horas Normales";
                }
            } catch(err) {
                if (horasTrabajadas > 0) labelPrincipal = "Horas Normales";
            }
        } else if (horasTrabajadas > 0) {
            labelPrincipal = "Horas Normales";
        }

        let sueldoBaseCalculado = labelPrincipal === "Horas Normales" ? (brutoUnitario * horasTrabajadas) : brutoUnitario;
        
        let configGremio = {
            "ADICIONAL": 4, 
            "PRESENTISMO": 20, 
            "NO REMUNERATIVO": 20000, 
            "JUBILACIÓN": 3,
            "LEY 19032": 3,
            "OBRA SOCIAL": 3,
            "CUOTA SINDICAL": 2.5,
            "SEGURO DE VIDA": 0
        };

        // 1. CARGAMOS LA BASE DEL GREMIO
        if (gremioObj && gremioObj[3]) {
            try {
                const conceptosGlobales = JSON.parse(decodeURIComponent(gremioObj[3]));
                conceptosGlobales.forEach(cg => {
                    let nom = cg.nombre.toUpperCase();
                    let valor = parseFloat(cg.valor);
                    if(!isNaN(valor)) {
                        if(nom.includes("ADICIONAL")) configGremio["ADICIONAL"] = valor;
                        if(nom.includes("PRESENTISMO")) configGremio["PRESENTISMO"] = valor;
                        if(nom.includes("NO REMUNERATIVO")) configGremio["NO REMUNERATIVO"] = valor;
                        if(nom.includes("JUBILACIÓN") || nom.includes("JUBILACION")) configGremio["JUBILACIÓN"] = valor;
                        if(nom.includes("LEY 19032")) configGremio["LEY 19032"] = valor;
                        if(nom.includes("OBRA SOCIAL")) configGremio["OBRA SOCIAL"] = valor;
                        if(nom.includes("SINDICAL") || nom.includes("SINDICATO")) configGremio["CUOTA SINDICAL"] = valor;
                        if(nom.includes("SEGURO DE VIDA")) configGremio["SEGURO DE VIDA"] = valor;
                    }
                });
            } catch(err) {}
        }

        let tieneAdicional = false, tienePresentismo = false, tieneNoRem = false;
        let tieneJubilacion = false, tieneLey = false, tieneObraSocial = false;
        let tieneCuota = false, tieneSeguro = false;

        // 2. CORRECCIÓN ABSOLUTA: El número que guardaste en la ficha del empleado MANDA sobre todo.
        conceptos.forEach(c => {
            let nom = c.nombre.toUpperCase();
            let valorEditado = parseFloat(c.valor);
            
            // isNaN garantiza que hasta un 0 se respete si lo guardaste manual.
            if(!isNaN(valorEditado)) {
                if(nom.includes("ADICIONAL")) { configGremio["ADICIONAL"] = valorEditado; tieneAdicional = true; }
                if(nom.includes("PRESENTISMO")) { configGremio["PRESENTISMO"] = valorEditado; tienePresentismo = true; }
                if(nom.includes("NO REMUNERATIVO")) { configGremio["NO REMUNERATIVO"] = valorEditado; tieneNoRem = true; }
                if(nom.includes("JUBILACIÓN") || nom.includes("JUBILACION")) { configGremio["JUBILACIÓN"] = valorEditado; tieneJubilacion = true; }
                if(nom.includes("LEY 19032")) { configGremio["LEY 19032"] = valorEditado; tieneLey = true; }
                if(nom.includes("OBRA SOCIAL")) { configGremio["OBRA SOCIAL"] = valorEditado; tieneObraSocial = true; }
                if(nom.includes("SINDICAL") || nom.includes("SINDICATO")) { configGremio["CUOTA SINDICAL"] = valorEditado; tieneCuota = true; }
                if(nom.includes("SEGURO DE VIDA")) { configGremio["SEGURO DE VIDA"] = valorEditado; tieneSeguro = true; }
            }
        });

        // 3. FÓRMULAS
        let valAdicional = sueldoBaseCalculado * (configGremio["ADICIONAL"] / 100);
        let valPresentismo = (sueldoBaseCalculado + valAdicional) * (configGremio["PRESENTISMO"] / 100);
        let valNoRem = parseFloat(configGremio["NO REMUNERATIVO"]) || 0;
        
        let baseRemunerativa = sueldoBaseCalculado + valAdicional + valPresentismo;
        let baseObraSocial = baseRemunerativa + valNoRem; 

        let valJubilacion = baseRemunerativa * (configGremio["JUBILACIÓN"] / 100);
        let valLey = baseRemunerativa * (configGremio["LEY 19032"] / 100);
        let valCuota = baseRemunerativa * (configGremio["CUOTA SINDICAL"] / 100);
        let valObraSocial = baseObraSocial * (configGremio["OBRA SOCIAL"] / 100);
        let valSeguro = parseFloat(configGremio["SEGURO DE VIDA"]) || 0; 

        let htmlFilas = "";
        let tRem = 0, tNoRem = 0, tDesc = 0;

        function agregarFila(nombre, base, porcentaje, rem, desc, noRem) {
            if (rem === 0 && noRem === 0 && desc === 0) return;
            tRem += rem; tNoRem += noRem; tDesc += desc;
            htmlFilas += `<tr>
                <td style="text-align: left;">${nombre}</td>
                <td style="text-align: center;">${base}</td>
                <td style="text-align: center;">${porcentaje}</td>
                <td style="text-align: right;">${rem > 0 ? '$ ' + rem.toFixed(2) : ''}</td>
                <td style="text-align: right;">${desc > 0 ? '$ ' + desc.toFixed(2) : ''}</td>
                <td style="text-align: right;">${noRem > 0 ? '$ ' + noRem.toFixed(2) : ''}</td>
            </tr>`;
        }

        agregarFila(labelPrincipal, "30", "-", sueldoBaseCalculado, 0, 0);
        if(tieneAdicional) agregarFila("Adicional", "", configGremio["ADICIONAL"], valAdicional, 0, 0);
        if(tienePresentismo) agregarFila("Presentismo", "", configGremio["PRESENTISMO"], valPresentismo, 0, 0);
        if(tieneNoRem) agregarFila("No Remunerativo", "", "", 0, 0, valNoRem);
        if(tieneJubilacion) agregarFila("Jubilación", "", configGremio["JUBILACIÓN"], 0, valJubilacion, 0);
        if(tieneLey) agregarFila("Ley 19032", "", configGremio["LEY 19032"], 0, valLey, 0);
        if(tieneObraSocial) agregarFila("Obra Social", "", configGremio["OBRA SOCIAL"], 0, valObraSocial, 0);
        if(tieneCuota) agregarFila("Cuota Sindical", "", configGremio["CUOTA SINDICAL"], 0, valCuota, 0);
        if(tieneSeguro && valSeguro > 0) agregarFila("Seguro de Vida", "", "", 0, valSeguro, 0);

        let netoPreliminar = (tRem + tNoRem) - tDesc;
        let netoRedondeado = Math.ceil(netoPreliminar);
        let valorRedondeo = parseFloat((netoRedondeado - netoPreliminar).toFixed(2));

        if (valorRedondeo > 0) {
            agregarFila("Redondeo", "", "", 0, 0, valorRedondeo);
        }

        let neto = (tRem + tNoRem) - tDesc; 
        let textoNeto = typeof numeroALetras === 'function' ? numeroALetras(neto) : '';

        // DISEÑO CALCADO DE LA IMAGEN
        function generarMitadRecibo(tipoCopia) {
            return `
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px;">
                <div>
                    <h4 style="margin: 0; font-weight: bold; text-transform: uppercase;">${nombreEmpresa}</h4>
                    <div style="font-size: 10px; margin-top: 2px;">CUIT: ${cuitEmpresa}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold; font-size: 11px;">${tipoCopia}</div>
                    <div style="font-weight: bold; font-size: 11px;">Legajo Nº: ${legajo}</div>
                </div>
            </div>

            <table class="tabla-clasica">
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
                    <td style="text-align: center;">$ ${brutoUnitario.toFixed(2)}</td>
                </tr>
                <tr>
                    <th>Fecha Depósito</th>
                    <th colspan="2">Banco de Depósito</th>
                    <th>Fecha Último Depósito</th>
                    <th>Calificación Profesional</th>
                </tr>
                <tr>
                    <td style="text-align: center;">${textoFechaPago}</td>
                    <td colspan="2" style="text-align: center;">${banco}</td>
                    <td style="text-align: center;">${aportes}</td>
                    <td style="text-align: center;">${tarea}</td>
                </tr>
                <tr>
                    <th colspan="2">Período Abonado</th>
                    <th colspan="2">Domicilio de Pago</th>
                    <th>Tarea Desempeñada</th>
                </tr>
                <tr>
                    <td colspan="2" style="text-align: center;">${textoPeriodo.toUpperCase()}</td>
                    <td colspan="2" style="text-align: center;">${direccionEmpresa}</td>
                    <td style="text-align: center;">${tarea}</td>
                </tr>
            </table>

            <table class="tabla-clasica tabla-conceptos">
                <thead>
                    <tr style="border-bottom: 1px solid #000;">
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
                    <tr><td colspan="6" style="height: 40px;"></td></tr>
                </tbody>
            </table>

            <table class="tabla-clasica tabla-totales">
                <tr>
                    <td colspan="3" rowspan="3" style="width: 50%; border-top: 1px solid #000; vertical-align: top; border-right: 1px solid #000;"></td>
                    <td colspan="2" style="text-align: center; font-weight: bold; border-top: 1px solid #000;">Total Bruto</td>
                    <td style="text-align: right; font-weight: bold; border-top: 1px solid #000;">$ ${tRem.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="2" style="text-align: center; font-weight: bold;">TOTAL Remunerativo</td>
                    <td style="text-align: right; font-weight: bold;">$ ${tRem.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="2" style="text-align: center; font-weight: bold;">TOTAL No Remunerativo</td>
                    <td style="text-align: right; font-weight: bold;">$ ${tNoRem.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="text-align: center; font-weight: bold;">Subtotal:</td>
                    <td style="text-align: right; font-weight: bold; width: 16.6%;">$ ${tRem.toFixed(2)}</td>
                    <td style="text-align: right; font-weight: bold; width: 16.6%;">$ ${tDesc.toFixed(2)}</td>
                    <td style="text-align: right; font-weight: bold; width: 16.6%;">$ ${tNoRem.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="border: none;"></td>
                    <td colspan="2" style="text-align: right; font-weight: bold; font-size: 11px;">TOTAL NETO</td>
                    <td style="text-align: right; font-weight: bold; font-size: 11px;">$ ${neto.toFixed(2)}</td>
                </tr>
            </table>

            <div style="font-size: 10px; margin-top: 5px;">
                <p style="margin: 0;">Recibí conforme la suma de:<br><strong style="font-size: 11px;">SON: ${textoNeto}</strong></p>
                <div style="display: flex; justify-content: space-between; margin-top: 25px;">
                    <p style="margin: 0; color: #555; font-size: 8px; width: 60%;">
                        En concepto de mis haberes correspondientes al período arriba indicado y según la presente liquidación, dejando constancia de haber recibido un duplicado de este recibo.
                    </p>
                    <div style="text-align: center; width: 30%; border-top: 1px solid #000; padding-top: 5px;">
                        Firma del Empleado
                    </div>
                </div>
            </div>`;
        }

        htmlVentana += `
        <div class="hoja-recibo">
            <div class="mitad-recibo">
                ${generarMitadRecibo('ORIGINAL PARA EL EMPLEADOR')}
            </div>
            <div style="border-top: 1px dashed #666; margin: 10px 0;"></div>
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
// En tu script.js, Bloque 4
// Asegúrate de que este objeto esté disponible en la lista 
// que usas para renderizar los checkboxes del Gremio
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
    const tipo = document.getElementById('cat-tipo').value;

    if (!nombre || !valor) return alert("⚠️ Completá el nombre y el valor de la categoría");

    categoriasTemporales.push({ nombre: nombre.toUpperCase(), valor: parseFloat(valor), tipo: tipo });
    document.getElementById('cat-nombre').value = "";
    document.getElementById('cat-valor').value = "";
    renderizarCategoriasTemporales();
}

function renderizarCategoriasTemporales() {
    const lista = document.getElementById('lista-categorias-gremio');
    if (!lista) return;
    lista.innerHTML = categoriasTemporales.map((c, i) => `
        <div class="col-md-4">
            <div class="p-2 border rounded bg-white shadow-sm position-relative border-start border-4 border-primary">
                <div class="fw-bold small text-uppercase">${c.nombre}</div>
                <div class="text-muted" style="font-size:0.75rem">${c.tipo}: $${c.valor.toLocaleString('es-AR')}</div>
                <i class="bi bi-x-circle text-danger position-absolute top-0 end-0 m-1 cursor-pointer" onclick="categoriasTemporales.splice(${i},1);renderizarCategoriasTemporales()"></i>
            </div>
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
        const catsEscaped = encodeURIComponent(g[2] || "[]");
        const consEscaped = encodeURIComponent(g[3] || "[]");
        
        return `
        <tr>
            <td class="fw-bold text-uppercase ps-3">
                <i class="bi bi-folder2-open text-warning me-2"></i> ${g[0]}
            </td>
            <td class="text-muted fw-bold">${g[1] || '---'}</td>
            <td><span class="badge bg-success-subtle text-success border border-success">Configurado</span></td>
            <td class="text-end pe-3">
                <button class="btn btn-sm btn-outline-warning me-1" onclick="prepararEdicionGremio('${g[0]}', '${g[1]}', '${catsEscaped}', '${consEscaped}')" title="Editar Gremio">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarGremio('${g[0]}')" title="Eliminar Gremio">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function renderizarConceptosTemporales() {
    const lista = document.getElementById('lista-conceptos-gremio');
    const base = document.getElementById('lista-conceptos-base');
    if (!lista || !base) return;

    // Se agrega step="any" al input para que acepte decimales en edición
    lista.innerHTML = conceptosTemporales.filter(c => !c.esCombinado).map((c, i) => `
        <div class="col-md-4 mb-2">
            <div class="p-2 border rounded bg-white shadow-sm position-relative">
                <i class="bi bi-x-circle text-danger position-absolute top-0 end-0 m-1 cursor-pointer" onclick="conceptosTemporales.splice(${i},1);renderizarConceptosTemporales()"></i>
                <div class="fw-bold small text-uppercase">${c.nombre}</div>
                <div class="input-group input-group-sm mt-1">
                    <span class="input-group-text">${c.modo === 'porcentaje' ? '%' : '$'}</span>
                    <input type="number" step="any" class="form-control" value="${c.valor}" oninput="conceptosTemporales[${i}].valor = parseFloat(this.value)||0">
                </div>
            </div>
        </div>`).join('');

    // Regeneramos los checkboxes base
    base.innerHTML = conceptosTemporales.map((c, i) => `
        <div class="form-check form-check-inline border rounded px-2 mb-1">
            <input class="form-check-input" type="checkbox" id="base-${i}">
            <label class="form-check-label small" for="base-${i}">${c.nombre}</label>
        </div>`).join('');
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
        { nombre: "SEGURO DE VIDA", tipo: "DESC", modo: "monto", valor: 0, esCombinado: false }
    ];

    document.getElementById('form-gremio').reset();
    document.getElementById('gre-nombre-original').value = "";
    
    // 3. Abrimos el modal
    const modalElement = document.getElementById('modalGremio');
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

function prepararEdicionGremio(nombre, actividad, catsJson, consJson) {
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
    let modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}
function eliminarGremio(nombre) {
    mostrarAlertaPersonalizada(
        "¿Eliminar Gremio?", 
        `¿Estás seguro de eliminar por completo el gremio ${nombre}?\nAfectará a las fichas que lo tengan asignado.`, 
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

function toggleCamposModalidad() {
    const contenedor = document.getElementById('campos-extra-modalidad');
    const esMensual = document.getElementById('mod-mes').checked;
    contenedor.classList.toggle('d-none', esMensual);
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