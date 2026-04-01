/* ============================================================
   🔹 SCRIPT.JS: GESTIÓN DE SUELDOS (VERSIÓN CORREGIDA)
   ============================================================ */

const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycby5TjVx8Ro_Y0RxnRz7AysrHrnL875blfOC3mXMc0fv4yAVfXfFmqMh5atSZ-pi70Gt1A/exec';
let editandoCuit = null;
let cuitEmpresaActiva = null;

/* --- SEGURIDAD Y LOGIN --- */
document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("sistema_sueldos_auth") === "true") mostrarSistema();
});

document.getElementById("form-login")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = document.getElementById("user-login").value;
    const pass = document.getElementById("pass-login").value;
    if (user === "walter" && pass === "1234") { 
        sessionStorage.setItem("sistema_sueldos_auth", "true");
        mostrarSistema();
    } else {
        document.getElementById("error-login")?.classList.remove("d-none");
    }
});

function mostrarSistema() {
    document.getElementById("pantalla-login").classList.add("d-none");
    document.getElementById("app-sistema").classList.remove("d-none");
    mostrarSeccion('inicio');
    cargarEmpresas();
}

function cerrarSesion() {
    sessionStorage.clear();
    location.reload();
}

/* --- NAVEGACIÓN --- */
function mostrarSeccion(id) {
    document.querySelectorAll('.seccion-app').forEach(sec => sec.classList.add('d-none'));
    const target = document.getElementById('sec-' + id);
    if (target) target.classList.remove('d-none');
    
    const nav = document.getElementById('menuNav');
    if (nav?.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(nav) || new bootstrap.Collapse(nav);
        bsCollapse.hide();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --- GESTIÓN DE EMPRESAS (TABLA SIMPLIFICADA) --- */
async function cargarEmpresas() {
    try {
        const resp = await fetch(`${URL_WEB_APP}?action=leer&t=${Date.now()}`);
        const datos = await resp.json();

        const tabla = document.getElementById('tabla-empresas');
        if (!tabla) return;
        
        tabla.innerHTML = '';

        if (Array.isArray(datos)) {
            datos.forEach(emp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="fw-bold text-primary cursor-pointer" onclick="verDetalleEmpresa('${emp[2]}')">${emp[0]}</td>
                    <td>${emp[2]}</td>
                    <td>${emp[1]}</td>
                    <td class="text-end pe-3">
                        <button class="btn btn-sm btn-outline-warning border-0" onclick="prepararEdicionEmpresa('${emp[2]}')">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="eliminarEmpresa('${emp[2]}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                tabla.appendChild(tr);
            });
        }
    } catch (error) {
        console.error("Error en cargarEmpresas:", error);
    }
}

/* --- ACTUALIZACIÓN DE DETALLE Y FORMULARIO MENSUAL --- */

async function verDetalleEmpresa(cuit) {
    cuitEmpresaActiva = cuit;
    try {
        const resp = await fetch(`${URL_WEB_APP}?action=leer&t=${Date.now()}`);
        const datos = await resp.json();
        
        const emp = datos.find(e => e[2].toString().replace(/\D/g, '') === cuit.replace(/\D/g, ''));

        if (emp) {
            const banner = document.getElementById('cabecera-empresa-detalle');
            const contenedorInputs = document.getElementById('contenedor-inputs-mensuales');

            if (!banner || !contenedorInputs) return;

            banner.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h1 class="fw-bold mb-0 text-warning">${emp[0]}</h1>
                        <small class="text-white-50"><i class="bi bi-geo-alt"></i> ${emp[1] || 'Sin dirección'}</small>
                    </div>
                    <button class="btn btn-outline-light btn-sm rounded-pill px-3 fw-bold" onclick="mostrarSeccion('empresas')">
                        <i class="bi bi-arrow-left me-1"></i> VOLVER AL LISTADO
                    </button>
                </div>`;

            const limpiarFechaParaInput = (fechaStr, esMes = false) => {
                if (!fechaStr || fechaStr === '-' || fechaStr === '0') return '';
                let fechaLimpia = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
                if (esMes && fechaLimpia.length > 7) return fechaLimpia.substring(0, 7); 
                return fechaLimpia;
            };
            
            contenedorInputs.innerHTML = `
                <div class="col-md-3">
                    <label class="small fw-bold text-light opacity-75">CUIT</label>
                    <input type="text" id="m-cuit" class="form-control form-control-sm border-0 bg-dark text-white" value="${emp[2]}" readonly>
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold text-light opacity-75">BANCO</label>
                    <input type="text" id="m-banco" class="form-control form-control-sm border-0" style="background: #3e4f5f; color: white;" value="${emp[9] || ''}">
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold text-light opacity-75">BASE MENSUAL</label>
                    <input type="text" id="m-base" class="form-control form-control-sm border-0" style="background: #3e4f5f; color: white;" value="${emp[8] || ''}">
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold text-light opacity-75">DIRECCIÓN</label>
                    <input type="text" id="m-dir" class="form-control form-control-sm border-0" style="background: #3e4f5f; color: white;" value="${emp[1] || ''}">
                </div>
                
                <div class="col-md-3">
                    <label class="small fw-bold text-info">PERIODO DEPO.</label>
                    <input type="month" id="m-p-depo" class="form-control form-control-sm border-0" style="background: #3e4f5f; color: white;" value="${limpiarFechaParaInput(emp[3], true)}">
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold text-info">FECHA DEPO.</label>
                    <input type="date" id="m-f-depo" class="form-control form-control-sm border-0" style="background: #3e4f5f; color: white;" value="${limpiarFechaParaInput(emp[4], false)}">
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold text-info">PERIODO ABONADO</label>
                    <input type="month" id="m-p-abo" class="form-control form-control-sm border-0" style="background: #3e4f5f; color: white;" value="${limpiarFechaParaInput(emp[5], true)}">
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold text-info">FECHA PAGO</label>
                    <input type="date" id="m-f-pago" class="form-control form-control-sm border-0" style="background: #3e4f5f; color: white;" value="${limpiarFechaParaInput(emp[7], false)}">
                </div>
                <input type="hidden" id="m-nombre" value="${emp[0]}">
                <input type="hidden" id="m-domicilio" value="${emp[6] || ''}">
            `;

            mostrarSeccion('detalle-empresa');
            cargarEmpleadosEmpresa(cuit);
        }
    } catch (e) { 
        console.error("Error crítico en detalle:", e);
    }
}

document.getElementById('form-datos-mensuales')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    const body = {
        action: 'editar', 
        cuit: document.getElementById('m-cuit').value,
        empleador: document.getElementById('m-nombre').value,
        direccion: document.getElementById('m-dir').value,
        banco: document.getElementById('m-banco').value,
        base: document.getElementById('m-base').value,
        periodo: document.getElementById('m-p-depo').value,
        fechaUltimoDepo: document.getElementById('m-f-depo').value,
        periodoAbonado: document.getElementById('m-p-abo').value,
        fechaPago: document.getElementById('m-f-pago').value,
        domicilio: document.getElementById('m-domicilio').value
    };

    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify(body) });
        if ((await resp.text()).includes("OK")) {
            alert("✅ Datos actualizados correctamente.");
            cargarEmpresas();
        }
    } catch (error) { alert("Error de red."); } finally { 
        btn.disabled = false; 
        btn.innerHTML = originalText;
    }
});

/* --- GESTIÓN DE EMPLEADOS --- */
async function cargarEmpleadosEmpresa(cuit) {
    const cuerpo = document.getElementById('tabla-empleados-cuerpo');
    const tablaHeader = document.querySelector('#sec-detalle-empresa thead tr');
    if (!cuerpo) return;

    // 1. Ajuste del Encabezado: Agregamos la columna de Check al final (oculta)
    if (!document.getElementById('th-check-header')) {
        const thCheck = document.createElement('th');
        thCheck.id = 'th-check-header';
        thCheck.className = 'text-end d-none'; // Oculto por defecto
        thCheck.innerHTML = `
            <div class="d-flex align-items-center justify-content-end">
                <small class="me-2 text-warning">TODOS</small>
                <input type="checkbox" id="check-todos-empleados" onclick="toggleTodosEmpleados(this)">
            </div>`;
        tablaHeader.appendChild(thCheck);
    } else {
        // Si ya existe, nos aseguramos que esté oculto al recargar
        document.getElementById('th-check-header').classList.add('d-none');
    }

    cuerpo.innerHTML = '<tr><td colspan="4" class="text-center">Cargando empleados...</td></tr>';

    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empleados&t=${Date.now()}`);
        const todosLosEmpleados = await resp.json();

        const filtrados = todosLosEmpleados.filter(em => 
            em[9]?.toString().replace(/\D/g, '') === cuit.toString().replace(/\D/g, '')
        );

        cuerpo.innerHTML = '';

        if (filtrados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay empleados registrados.</td></tr>';
            return;
        }

        filtrados.forEach(em => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold">${em[1]}</td>
                <td>${em[3]}</td>
                <td><span class="badge bg-light text-dark border">${em[4]}</span></td>
                <td class="text-end pe-3">
                    <div class="d-flex align-items-center justify-content-end gap-3">
                        <button class="btn btn-sm btn-outline-secondary border-0" onclick="verFichaEmpleado('${em[3]}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <input type="checkbox" class="check-empleado d-none" value="${em[3]}">
                    </div>
                </td>
            `;
            cuerpo.appendChild(tr);
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

async function abrirModalEmpleado() {
    if (!cuitEmpresaActiva) return alert("Selecciona una empresa primero.");
    const inputLegajo = document.getElementById('empl-legajo');
    document.getElementById('form-empleado').reset();
    inputLegajo.value = "Cargando...";
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEmpleado')).show();

    try {
        const resp = await fetch(`${URL_WEB_APP}?action=getSiguienteLegajo&cuit=${cuitEmpresaActiva}&t=${Date.now()}`);
        const data = await resp.json();
        inputLegajo.value = data.proximo || "1001";
    } catch (e) { inputLegajo.value = "1001"; }
}

document.getElementById('form-empleado')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = 'GUARDAR EMPLEADO';
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    const conceptosTildados = [];
        document.querySelectorAll('.check-concepto:checked').forEach(cb => {
            conceptosTildados.push(cb.value);
        });

    const body = {
        action: 'crearEmpleado',
        cuitEmpresa: cuitEmpresaActiva,
        legajo: document.getElementById('empl-legajo').value,
        empleado: document.getElementById('empl-nombre').value,
        cuil: document.getElementById('empl-cuil').value,
        fechaIngreso: document.getElementById('empl-ingreso').value,
        tarea: document.getElementById('empl-tarea').value,
        gremio: document.getElementById('empl-gremio').value, 
        sueldoBruto: document.getElementById('empl-bruto').value,
        diasTrabajados: document.getElementById('empl-dias').value,
        sueldoBasico: document.getElementById('empl-basico').value
    };

    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify(body) });
        if((await resp.text()).includes("OK")) {
            bootstrap.Modal.getInstance(document.getElementById('modalEmpleado')).hide();
            e.target.reset();
            cargarEmpleadosEmpresa(cuitEmpresaActiva);
        }
    } catch (error) { alert("Error de red."); } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

/* --- GESTIÓN DE EDICIÓN DE EMPLEADOS (NUEVO) --- */
async function verFichaEmpleado(cuil) {
    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empleados&t=${Date.now()}`);
        const empleados = await resp.json();
        const em = empleados.find(e => e[3].toString() === cuil.toString());

        if (em) {
            // 1. Cargamos los datos básicos en los inputs de edición
            document.getElementById('edit-empl-legajo').value = em[0];
            document.getElementById('edit-empl-nombre').value = em[1];
            document.getElementById('edit-empl-id-original').value = em[3]; 
            document.getElementById('edit-empl-bruto').value = em[6]; 
            document.getElementById('edit-empl-dias').value = em[7]; 

            // 2. Seteamos el Gremio (ajustá el ID si es diferente en tu modal de edición)
            const selectGremio = document.getElementById('edit-empl-gremio');
            if (selectGremio) {
                selectGremio.value = em[5] || ""; // em[5] es la columna del Gremio
            }

            // 3. Procesamos los Conceptos guardados
            // em[10] es donde guardaremos la lista de conceptos tildados
            const conceptosGuardados = em[10] ? em[10].split(',') : [];
            
            // Llamamos a la función que dibuja los checks y les pone el 'checked'
            // Pasamos el gremio actual y el array de lo que ya estaba tildado
            actualizarChecksConceptos(em[5], conceptosGuardados);

            // 4. Mostramos el modal
            const modal = new bootstrap.Modal(document.getElementById('modalEditarEmpleado'));
            modal.show();
        }
    } catch (error) {
        console.error("Error detallado:", error);
        alert("Error al cargar la ficha del empleado.");
    }
}

document.getElementById('form-editar-empleado')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const body = {
        action: 'editarEmpleado',
        cuil: document.getElementById('edit-empl-id-original').value,
        nombre: document.getElementById('edit-empl-nombre').value,
        dias: document.getElementById('edit-empl-dias').value,
        bruto: document.getElementById('edit-empl-bruto').value
    };

    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify(body) });
        const resultado = await resp.text();

        if (resultado.includes("OK")) {
            const modalEl = document.getElementById('modalEditarEmpleado');
            const modalInstancia = bootstrap.Modal.getInstance(modalEl);
            if (modalInstancia) modalInstancia.hide();

            // RECARGAMOS SOLO LA TABLA DE EMPLEADOS (Mantiene la vista)
            await cargarEmpleadosEmpresa(cuitEmpresaActiva); 
            alert("✅ Datos del empleado actualizados.");
        }
    } catch (e) { alert("Error de red."); } finally { btn.disabled = false; }
});

/* --- GESTIÓN DE EMPRESA --- */
async function prepararEdicionEmpresa(cuit) {
    try {
        const resp = await fetch(`${URL_WEB_APP}?action=leer&t=${Date.now()}`);
        const datos = await resp.json();
        const e = datos.find(emp => emp[2].toString().replace(/\D/g, '') === cuit.replace(/\D/g, ''));
        if (e) {
            editandoCuit = cuit;
            const set = (id, v) => { if(document.getElementById(id)) document.getElementById(id).value = v || ''; };
            set('emp-nombre', e[0]); set('emp-direccion', e[1]); set('emp-cuit', e[2]);
            set('emp-periodo', e[3]); set('emp-fecha-depo', e[4]); set('emp-periodo-abonado', e[5]);
            set('emp-domicilio', e[6]); set('emp-fecha-pago', e[7]); set('emp-base', e[8]); set('emp-banco', e[9]);
            document.getElementById('tituloModalEmpresa').innerText = "EDITAR EMPRESA";
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEmpresa')).show();
        }
    } catch (err) { console.error(err); }
}

document.getElementById('form-empresa')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = "Guardando...";

    const body = {
        action: editandoCuit ? 'editar' : 'crear',
        empleador: document.getElementById('emp-nombre').value,
        direccion: document.getElementById('emp-direccion').value,
        cuit: document.getElementById('emp-cuit').value,
        periodo: document.getElementById('emp-periodo').value,
        fechaUltimoDepo: document.getElementById('emp-fecha-depo').value,
        periodoAbonado: document.getElementById('emp-periodo-abonado').value,
        domicilio: document.getElementById('emp-domicilio').value,
        fechaPago: document.getElementById('emp-fecha-pago').value,
        base: document.getElementById('emp-base').value,
        banco: document.getElementById('emp-banco').value
    };

    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify(body) });
        if ((await resp.text()).includes("OK")) {
            bootstrap.Modal.getInstance(document.getElementById('modalEmpresa')).hide();
            e.target.reset();
            editandoCuit = null;
            cargarEmpresas();
        }
    } catch (error) { alert("Error de red."); } finally { 
        btn.disabled = false; 
        btn.innerText = "GUARDAR CAMBIOS";
    }
});

async function eliminarEmpresa(cuit) {
    if (confirm(`¿Estás seguro de eliminar esta empresa?`)) {
        try {
            await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify({ action: 'eliminar', cuit }) });
            setTimeout(cargarEmpresas, 1000);
        } catch (e) { alert("Error al eliminar."); }
    }
}

function abrirModalEmpresa() {
    editandoCuit = null;
    document.getElementById('form-empresa').reset();
    document.getElementById('tituloModalEmpresa').innerText = "REGISTRAR NUEVA EMPRESA";
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEmpresa')).show();
}

// Función para el checkbox del encabezado (Tildar todos)
function toggleTodosEmpleados(source) {
    const checkboxes = document.querySelectorAll('.check-empleado');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

// Función para el botón amarillo "LIQUIDAR SUELDO"
function abrirPanelLiquidacion() {
    const checks = document.querySelectorAll('.check-empleado');
    const headerCheck = document.getElementById('th-check-header');
    const btnLiquidar = document.querySelector('button[onclick="abrirPanelLiquidacion()"]');

    // 1. Si los checks están ocultos, los mostramos
    if (headerCheck.classList.contains('d-none')) {
        headerCheck.classList.remove('d-none');
        checks.forEach(cb => cb.classList.remove('d-none'));
        btnLiquidar.innerHTML = '<i class="bi bi-check-all me-1"></i> CONFIRMAR SELECCIÓN';
        btnLiquidar.classList.replace('btn-warning', 'btn-success');
        return;
    }

    // 2. Si ya están visibles, buscamos quiénes están marcados
    const seleccionados = [];
    document.querySelectorAll('.check-empleado:checked').forEach(cb => {
        // Buscamos el nombre del empleado que está en la misma fila (primer <td>)
        const nombre = cb.closest('tr').cells[0].innerText;
        seleccionados.push({ cuil: cb.value, nombre: nombre });
    });

    if (seleccionados.length === 0) {
        alert("Selecciona al menos un empleado para continuar.");
        return;
    }

    // 3. Llenamos la lista del modal
    const listaUI = document.getElementById('lista-empleados-confirmar');
    listaUI.innerHTML = ''; // Limpiar
    seleccionados.forEach(emp => {
        const li = document.createElement('li');
        li.className = 'list-group-item bg-transparent text-white border-secondary small d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${emp.nombre}</span> <small class="text-white-50">${emp.cuil}</small>`;
        listaUI.appendChild(li);
    });

    document.getElementById('count-empleados-confirmar').innerText = `${seleccionados.length} Empleados`;

    // 4. Mostramos el modal personalizado
    const modalConfirm = new bootstrap.Modal(document.getElementById('modalConfirmarLiquidacion'));
    modalConfirm.show();
}
function procesarLiquidacionFinal() {
    // 1. Cerramos el modal de confirmación
    const modalConfirmEl = document.getElementById('modalConfirmarLiquidacion');
    const modalConfirm = bootstrap.Modal.getInstance(modalConfirmEl);
    if (modalConfirm) modalConfirm.hide();

    // 2. Buscamos quiénes están marcados en la tabla
    const seleccionados = [];
    document.querySelectorAll('.check-empleado:checked').forEach(cb => {
        // Buscamos los datos en la caché de empleados que ya tenemos en memoria
        const datosEmp = cacheEmpleados.find(e => e[3].toString() === cb.value.toString());
        if (datosEmp) {
            seleccionados.push({
                legajo: datosEmp[0],
                nombre: datosEmp[1],
                cuil: datosEmp[3],
                basico: datosEmp[8],
                conceptos: datosEmp[10] // Los conceptos guardados en la columna 10
            });
        }
    });

    if (seleccionados.length === 0) {
        alert("No hay empleados seleccionados.");
        return;
    }

    // 3. Mostramos la previa del primero (puedes iterar si son varios)
    console.log("Liquidando para:", seleccionados[0].nombre);
    previsualizarRecibo(seleccionados[0]);
}

function resetearVistaLiquidacion() {
    const btnLiquidar = document.querySelector('button[onclick="abrirPanelLiquidacion()"]');
    document.getElementById('th-check-header').classList.add('d-none');
    document.querySelectorAll('.check-empleado').forEach(cb => {
        cb.classList.add('d-none');
        cb.checked = false;
    });
    btnLiquidar.innerHTML = '<i class="bi bi-calculator me-1"></i> LIQUIDAR SUELDO';
    btnLiquidar.classList.replace('btn-success', 'btn-warning');
}

// Función para el check "TODOS"
function toggleTodosEmpleados(source) {
    const checkboxes = document.querySelectorAll('.check-empleado');
    checkboxes.forEach(cb => cb.checked = source.checked);
}
// Definición de conceptos por gremio (puedes sumar más gremios aquí)
const CONCEPTOS_POR_GREMIO = {
    "Comercio": ["Sueldo Básico", "Antigüedad", "Ad. Manejo de Caja", "Jubilación", "Ley 19032", "O. Social", "Cuota Solidaria"],
    "UOCRA": ["Sueldo Básico", "Asistencia Perfecta", "Fondo de Cese", "Jubilación", "O. Social"],
    "Gastronómicos": ["Sueldo Básico", "Plus de Servicio", "Complemento de Comida", "Jubilación", "O. Social"]
};

// Función para mostrar los checks según el gremio elegido
function actualizarChecksConceptos(gremioSeleccionado, seleccionadosPreviamente = []) {
    const contenedor = document.getElementById('contenedor-conceptos-gremio');
    const conceptos = CONCEPTOS_POR_GREMIO[gremioSeleccionado] || [];
    
    if (conceptos.length === 0) {
        contenedor.innerHTML = '<span class="text-muted small">No hay conceptos cargados para este gremio.</span>';
        return;
    }

    contenedor.innerHTML = conceptos.map(con => `
        <div class="form-check">
            <input class="form-check-input check-concepto" type="checkbox" value="${con}" id="chk-${con.replace(/\s+/g, '')}" 
            ${seleccionadosPreviamente.includes(con) ? 'checked' : ''}>
            <label class="form-check-label small" for="chk-${con.replace(/\s+/g, '')}">${con}</label>
        </div>
    `).join('');
}

// Evento para cuando cambias el Gremio en el modal
document.getElementById('empl-gremio')?.addEventListener('change', (e) => {
    actualizarChecksConceptos(e.target.value);
});
/* --- FUNCIONES DE LIQUIDACIÓN Y PREVIA --- */

// 1. Esta función busca al empleado en la memoria y lanza la previa
async function abrirPreviaIndividual(cuil) {
    // CAMBIO: Usamos cacheEmpleados en lugar de listaEmpleados
    const empleado = cacheEmpleados.find(e => e[3].toString() === cuil.toString());
    if (empleado) {
        // Adaptamos el objeto para la función de previsualización
        const empObj = {
            nombre: empleado[1],
            cuil: empleado[3],
            conceptos: empleado[10]
        };
        previsualizarRecibo(empObj);
    } else {
        alert("No se encontraron los datos del empleado en la memoria.");
    }
}

// 2. Esta función procesa a todos los seleccionados con el checkbox
function procesarLiquidacionFinal() {
    const modalConfirmEl = document.getElementById('modalConfirmarLiquidacion');
    const modalConfirm = bootstrap.Modal.getInstance(modalConfirmEl);
    if (modalConfirm) modalConfirm.hide();

    const seleccionados = [];
    document.querySelectorAll('.check-empleado:checked').forEach(cb => {
        const datosEmp = cacheEmpleados.find(e => e[3].toString() === cb.value.toString());
        if (datosEmp) {
            seleccionados.push({
                legajo: datosEmp[0],
                nombre: datosEmp[1],
                cuil: datosEmp[3],
                basico: datosEmp[8],
                conceptos: datosEmp[10] || ""
            });
        }
    });

    if (seleccionados.length === 0) {
        alert("Por favor, selecciona al menos un empleado.");
        return;
    }

    // Por ahora, visualizamos el primero de la lista seleccionada
    previsualizarRecibo(seleccionados[0]);
}