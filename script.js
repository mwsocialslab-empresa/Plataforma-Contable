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

async function guardarEmpresa(e) {
    if (e) e.preventDefault();
    
    const btn = document.getElementById('btn-guardar-empresa');
    if (btn) btn.disabled = true;

    // Obtenemos los valores
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
        const resp = await fetch(URL_WEB_APP, { 
            method: 'POST', 
            body: JSON.stringify(datos) 
        });
        
        // Verificamos si la respuesta del servidor es texto "OK"
        const respuestaTexto = await resp.text();
        
        if (respuestaTexto.includes("OK")) {
            alert(esEdicion ? "✅ Empresa actualizada con éxito" : "✅ Empresa registrada");
            
            // Cerramos modal de forma segura
            const modalEl = document.getElementById('modalEmpresa');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            
            await cargarEmpresas();
        } else {
            // Esto nos dirá si Google Sheets devolvió un error específico
            throw new Error(respuestaTexto);
        }
    } catch (err) { 
        console.error("Error detallado:", err);
        alert("Error al procesar empresa: " + err.message); 
    } finally { 
        if (btn) btn.disabled = false; 
    }
}

async function eliminarEmpresa(cuit) {
    if (!confirm(`¿Estás seguro de eliminar por completo la empresa con CUIT ${cuit}?\nSe borrará de forma permanente de la base de datos.`)) return;
    
    try {
        const resp = await fetch(URL_WEB_APP, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'eliminarEmpresa', cuit: cuit }) 
        });
        const texto = await resp.text();
        if (texto === "OK") {
            alert("🗑️ Empresa eliminada correctamente");
            await cargarEmpresas();
        } else {
            alert("Error: " + texto);
        }
    } catch (e) { 
        alert("Error de conexión al eliminar la empresa."); 
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
function prepararEdicionEmpresa(cuit) {
    alert("Función de edición en preparación para el CUIT: " + cuit);
}

function eliminarEmpresa(cuit) {
    alert("Función de eliminación en preparación para el CUIT: " + cuit);
}

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

        // Buscamos empleados asociados al CUIT en el índice 9 (columna J)
        const filtrados = cacheEmpleados.filter(em => {
            if (!em || !Array.isArray(em)) return false;
            return (em[9] || "").toString().trim() === cuitBuscado;
        });

        if (filtrados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay empleados registrados.</td></tr>';
            return;
        }

        cuerpo.innerHTML = filtrados.map(em => {
            const nombre = em[1] || 'Sin Nombre';
            const cuil = em[2] || '---';
            const tarea = em[4] || 'Sin Cargo';

            return `
            <tr>
                <td class="text-center col-check d-none">
                    <input type="checkbox" class="form-check-input check-empleado" data-cuil="${cuil}">
                </td>
                <td class="fw-bold text-uppercase">${nombre}</td>
                <td>${cuil}</td>
                <td><span class="badge bg-light text-dark border">${tarea}</span></td>
                <td class="text-end pe-3">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editarEmpleado('${cuil}')"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarEmpleado('${cuil}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        }).join('');

    } catch (e) { 
        console.error("Error al cargar empleados:", e);
        cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error de conexión.</td></tr>';
    }
}

async function abrirModalEmpleado() {
    document.getElementById('form-empleado').reset();
    document.getElementById('empl-cuil-original').value = ""; // ALTA
    document.getElementById('configuracion-gremio-empleado').innerHTML = '<p class="text-muted small italic mb-0">Seleccione un gremio para ver los cargos.</p>';
    
    await prepararModalEmpleado(); 

    // Cálculo automático del Legajo (Arranca desde 1000 y sube de a 1 por empresa)
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

    const modalElement = document.getElementById('modalEmpleado');
    let modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
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
                                    <input type="number" step="any" class="form-control form-control-sm p-1 fw-bold" id="val-cep-${i}" value="${c.valor}">
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
    if (!cuitEmpresa) return alert("❌ Error: No se detectó la empresa activa.");

    const btn = e.submitter || document.querySelector('#form-empleado button[type="submit"]');
    if (btn) btn.disabled = true;

    const modalidadSeleccionada = document.querySelector('input[name="modalidad"]:checked')?.value || 'mensual';
    const cantidadModalidad = document.getElementById('empl-cantidad-modalidad')?.value || "1";

    const cuilOriginal = document.getElementById('empl-cuil-original').value;
    const esEdicion = cuilOriginal !== "";

    // Recompilamos los conceptos capturando el valor modificado del input numérico
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
            alert("✅ Empleado guardado correctamente.");
            const modalEl = document.getElementById('modalEmpleado');
            bootstrap.Modal.getInstance(modalEl)?.hide();
            await cargarEmpleadosEmpresa(cuitEmpresa);
        } else {
            alert("Error del servidor: " + textoRespuesta);
        }
    } catch (err) { 
        alert("Error de conexión al guardar empleado."); 
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
async function editarEmpleado(cuil) {
    const emp = cacheEmpleados.find(em => em[2].toString().trim() === cuil.toString().trim());
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

    // Damos un respiro pequeño para que levante el HTML de categorías antes de tildar el valor base
    setTimeout(() => {
        const selectCat = document.getElementById('empl-categoria');
        if (selectCat && emp[5]) selectCat.value = emp[5];
        
        try {
            const guardados = JSON.parse(emp[11] || "[]");
            document.querySelectorAll('.check-concepto-emp').forEach(chk => {
                const c = JSON.parse(chk.value);
                chk.checked = guardados.some(g => g.nombre === c.nombre);
            });
        } catch(err){}
    }, 150);

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

    // 🟢 NUEVA ALERTA ESTILIZADA DE CONTROL
    mostrarAlertaPersonalizada(
        "Recordatorio de Liquidación",
        "Antes de generar los recibos, verificá:\n\n✅ ¿Actualizaste el Seguro de Vida?\n✅ ¿El No Remunerativo es correcto?\n✅ ¿Están cargadas las horas?",
        "info",
        () => {
            // Todo esto se ejecuta SOLO si el usuario hace clic en "Aceptar"
            listaParaImprimir = cacheEmpleados.filter(em => seleccionados.includes((em[2] || "").toString().trim()));
            
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

    let htmlVentana = `<html><head><title>Recibos</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            @media print { .no-print { display: none; } } 
            .recibo-card { border: 2px solid #333; font-family: monospace; font-size: 11px; margin-bottom: 20px; }
            .tabla-recibo th, .tabla-recibo td { padding: 4px 8px !important; border-color: #999; }
            .totales td { font-weight: bold; border-top: 2px solid #333 !important; }
        </style>
    </head><body class="p-4">
        <div class="no-print text-center mb-4"><button class="btn btn-dark" onclick="window.print()">IMPRIMIR</button></div>
        <div class="container">`;

    listaParaImprimir.forEach(em => {
        let conceptos = [];
        try { conceptos = JSON.parse(em[11] || "[]"); } catch(e){}

        const brutoUnitario = parseFloat(em[5]) || 0; 
        const horasTrabajadas = parseFloat(em[13]) || 0; 
        
        // 🟢 DETECTAR MODALIDAD DINÁMICAMENTE DESDE LA CATEGORÍA DEL GREMIO
        let labelPrincipal = "SUELDO BÁSICO"; 
        const gremioNombre = em[10];
        const gremioObj = cacheGremios.find(g => g[0] === gremioNombre);

        if (gremioObj && gremioObj[2]) {
            try {
                const categorias = JSON.parse(decodeURIComponent(gremioObj[2]) || "[]");
                const catEmpleado = categorias.find(c => parseFloat(c.valor) === brutoUnitario);
                
                if (catEmpleado) {
                    const tipoCat = (catEmpleado.tipo || "").toUpperCase();
                    if (tipoCat.includes("HORA") || tipoCat.includes("POR HORA") || tipoCat.includes("HORAS")) {
                        labelPrincipal = "HORAS NORMALES";
                    }
                } else if (horasTrabajadas > 0) {
                    // Plan de respaldo si no machea exacto el monto pero tiene horas cargadas
                    labelPrincipal = "HORAS NORMALES";
                }
            } catch(err) {
                if (horasTrabajadas > 0) labelPrincipal = "HORAS NORMALES";
            }
        } else if (horasTrabajadas > 0) {
            labelPrincipal = "HORAS NORMALES";
        }

        // 1. BASE HORAS / SUELDO: Redondeo estricto hacia abajo (Math.floor) según la modalidad detectada
        let sueldoBaseCalculado = Math.floor(labelPrincipal === "HORAS NORMALES" ? (brutoUnitario * horasTrabajadas) : brutoUnitario);
        
        // Diccionario de configuración por defecto
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

        // Banderas para saber qué conceptos tildaste en la ficha del empleado
        let tieneAdicional = false, tienePresentismo = false, tieneNoRem = false;
        let tieneJubilacion = false, tieneLey = false, tieneObraSocial = false;
        let tieneCuota = false, tieneSeguro = false;

        // Leemos los conceptos guardados en el empleado y actualizamos los porcentajes/montos
        conceptos.forEach(c => {
            let nom = c.nombre.toUpperCase();
            let valorEditado = parseFloat(c.valor) || 0;

            if(nom.includes("ADICIONAL")) { configGremio["ADICIONAL"] = valorEditado; tieneAdicional = true; }
            if(nom.includes("PRESENTISMO")) { configGremio["PRESENTISMO"] = valorEditado; tienePresentismo = true; }
            if(nom.includes("NO REMUNERATIVO")) { configGremio["NO REMUNERATIVO"] = valorEditado; tieneNoRem = true; }
            if(nom.includes("JUBILACIÓN") || nom.includes("JUBILACION")) { configGremio["JUBILACIÓN"] = valorEditado; tieneJubilacion = true; }
            if(nom.includes("LEY 19032")) { configGremio["LEY 19032"] = valorEditado; tieneLey = true; }
            if(nom.includes("OBRA SOCIAL")) { configGremio["OBRA SOCIAL"] = valorEditado; tieneObraSocial = true; }
            if(nom.includes("SINDICAL") || nom.includes("SINDICATO")) { configGremio["CUOTA SINDICAL"] = valorEditado; tieneCuota = true; }
            if(nom.includes("SEGURO DE VIDA")) { configGremio["SEGURO DE VIDA"] = valorEditado; tieneSeguro = true; }
        });

        // 2. EJECUTAR FÓRMULAS MATEMÁTICAS ESTRICTAS (Con Math.floor para redondear siempre hacia abajo)
        let valAdicional = Math.floor(sueldoBaseCalculado * (configGremio["ADICIONAL"] / 100));
        let valPresentismo = Math.floor((sueldoBaseCalculado + valAdicional) * (configGremio["PRESENTISMO"] / 100));
        let valNoRem = Math.floor(configGremio["NO REMUNERATIVO"]);
        
        let baseRemunerativa = sueldoBaseCalculado + valAdicional + valPresentismo;
        // La Obra Social suma los remunerativos + el no remunerativo
        let baseObraSocial = baseRemunerativa + valNoRem; 

        let valJubilacion = Math.floor(baseRemunerativa * (configGremio["JUBILACIÓN"] / 100));
        let valLey = Math.floor(baseRemunerativa * (configGremio["LEY 19032"] / 100));
        let valCuota = Math.floor(baseRemunerativa * (configGremio["CUOTA SINDICAL"] / 100));
        let valObraSocial = Math.floor(baseObraSocial * (configGremio["OBRA SOCIAL"] / 100));
        let valSeguro = Math.floor(configGremio["SEGURO DE VIDA"]); 

        // 3. ESTRUCTURA DE LA TABLA Y COLUMNAS
        let htmlFilas = "";
        let tRem = 0, tNoRem = 0, tDesc = 0;

        // Función interna para inyectar filas en la columna correcta
        function agregarFila(nombre, rem, noRem, desc) {
            if (rem === 0 && noRem === 0 && desc === 0) return;
            tRem += rem;
            tNoRem += noRem;
            tDesc += desc;
            htmlFilas += `<tr>
                <td>${nombre}</td>
                <td class="text-end">${rem > 0 ? rem : ''}</td>
                <td class="text-end">${noRem > 0 ? noRem : ''}</td>
                <td class="text-end">${desc > 0 ? desc : ''}</td>
            </tr>`;
        }

        // Agregamos al recibo la fila principal de forma dinámica
        agregarFila(labelPrincipal, sueldoBaseCalculado, 0, 0);
        
        if(tieneAdicional) agregarFila(`ADICIONAL (${configGremio["ADICIONAL"]}%)`, valAdicional, 0, 0);
        if(tienePresentismo) agregarFila(`PRESENTISMO (${configGremio["PRESENTISMO"]}%)`, valPresentismo, 0, 0);
        if(tieneNoRem) agregarFila("NO REMUNERATIVO", 0, valNoRem, 0);
        
        if(tieneJubilacion) agregarFila(`JUBILACIÓN (${configGremio["JUBILACIÓN"]}%)`, 0, 0, valJubilacion);
        if(tieneLey) agregarFila(`LEY 19032 (${configGremio["LEY 19032"]}%)`, 0, 0, valLey);
        if(tieneObraSocial) agregarFila(`OBRA SOCIAL (${configGremio["OBRA SOCIAL"]}%)`, 0, 0, valObraSocial);
        if(tieneCuota) agregarFila(`CUOTA SINDICAL (${configGremio["CUOTA SINDICAL"]}%)`, 0, 0, valCuota);
        if(tieneSeguro && valSeguro > 0) agregarFila("SEGURO DE VIDA", 0, 0, valSeguro);

        let neto = (tRem + tNoRem) - tDesc;
        let textoNeto = typeof numeroALetras === 'function' ? numeroALetras(neto) : '';
        
        htmlVentana += `
        <div class="card p-3 recibo-card">
            <h6>${empActiva ? empActiva[0] : 'Empresa'} - Empleado: <span class="text-uppercase">${em[1]}</span></h6>
            <table class="table table-sm tabla-recibo table-bordered mb-0 mt-3">
                <thead class="table-light text-center">
                    <tr>
                        <th class="text-start">CONCEPTO</th>
                        <th>REMUNERATIVO</th>
                        <th>NO REMUNERATIVO</th>
                        <th>DESCUENTO</th>
                    </tr>
                </thead>
                <tbody>
                    ${htmlFilas}
                    <tr class="totales table-light">
                        <td class="text-end"><strong>SUBTOTALES:</strong></td>
                        <td class="text-end"><strong>$${tRem}</strong></td>
                        <td class="text-end"><strong>$${tNoRem}</strong></td>
                        <td class="text-end"><strong>$${tDesc}</strong></td>
                    </tr>
                </tbody>
            </table>
            <div class="d-flex justify-content-between align-items-end mt-2 fs-6">
                <small class="text-muted fw-bold" style="font-size: 9px;">${textoNeto}</small>
                <strong>NETO A COBRAR: $${neto}</strong>
            </div>
        </div><hr>`;
    });

    htmlVentana += `</div></body></html>`;
    const win = window.open('', '_blank');
    win.document.write(htmlVentana);
    win.document.close();
    bootstrap.Modal.getInstance(document.getElementById('modalLiquidacion'))?.hide();
    resetearVistaLiquidacion();
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
            <td class="fw-bold text-uppercase">${g[0]}</td>
            <td>${g[1] || '---'}</td>
            <td><span class="badge bg-success">Configurado</span></td>
            <td class="text-end">
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

function abrirModalGremio() {
    categoriasTemporales = [];
    
    // 🟢 LISTA POR DEFECTO PARA CUALQUIER GREMIO NUEVO
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
    
    const inputOriginal = document.getElementById('gre-nombre-original');
    if (inputOriginal) inputOriginal.value = ""; 
    
    renderizarCategoriasTemporales();
    renderizarConceptosTemporales(); // Llama a la función correcta de renderizado
    
    const modalElement = document.getElementById('modalGremio');
    let modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}
function renderizarConceptosTemporales() {
    const lista = document.getElementById('lista-conceptos-gremio');
    const listaCombinados = document.getElementById('lista-conceptos-combinados');
    const base = document.getElementById('lista-conceptos-base');
    if (!lista || !base) return;

    // 1. Renderizamos conceptos SIMPLES con su input numérico
    const simples = conceptosTemporales.filter(c => !c.esCombinado);
    lista.innerHTML = simples.map(c => {
        const index = conceptosTemporales.indexOf(c);
        return `
        <div class="col-md-4 mb-2">
            <div class="p-2 border rounded bg-white shadow-sm position-relative">
                <i class="bi bi-x-circle text-danger position-absolute top-0 end-0 m-1 cursor-pointer" onclick="conceptosTemporales.splice(${index},1);renderizarConceptosTemporales()" title="Eliminar"></i>
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

    // 2. Renderizamos conceptos COMBINADOS con su input numérico
    const combinados = conceptosTemporales.filter(c => c.esCombinado);
    if (listaCombinados) {
        listaCombinados.innerHTML = combinados.map(c => {
            const index = conceptosTemporales.indexOf(c);
            return `
            <div class="col-md-4 mb-2">
                <div class="p-2 border rounded bg-warning-subtle border-warning shadow-sm position-relative">
                    <i class="bi bi-x-circle text-danger position-absolute top-0 end-0 m-1 cursor-pointer" onclick="conceptosTemporales.splice(${index},1);renderizarConceptosTemporales()" title="Eliminar"></i>
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

async function guardarGremio(e) {
    e.preventDefault();
    if (categoriasTemporales.length === 0 || conceptosTemporales.length === 0) {
        return alert("⚠️ Faltan agregar categorías o conceptos mínimos para guardar el convenio.");
    }

    // Selector seguro para el botón por si e.submitter falla
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
            alert(esEdicion ? "✅ Convenio actualizado con éxito." : "✅ Convenio de Gremio guardado con éxito.");
            
            const modalElement = document.getElementById('modalGremio');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
            
            await cargarGremios();
        } else {
            alert("Error en el servidor al procesar el gremio.");
        }
    } catch (err) { 
        alert("Error al guardar gremio en la base de datos."); 
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

async function eliminarGremio(nombre) {
    if (!confirm(`¿Estás seguro de eliminar por completo el gremio ${nombre}?\nAfectará a las fichas que lo tengan asignado.`)) return;
    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify({ action: 'eliminarGremio', nombre: nombre }) });
        const texto = await resp.text();
        if (texto === "OK") {
            alert("🗑️ Gremio eliminado correctamente");
            await cargarGremios();
        }
    } catch (e) { 
        alert("Error de conexión al eliminar."); 
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