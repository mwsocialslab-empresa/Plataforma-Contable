/* ============================================================
   🔹 SCRIPT.JS: GESTIÓN DE SUELDOS (VERSIÓN RESPETUOSA - REGLA DE ORO)
   ============================================================ */

const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbw6iOEHiqyDlRWYajcX2eLD44wE1Ou6qKivBtEfJxijWlY-JCQb5DTLisFrJnz3fDqNSg/exec';
let editandoCuit = null;
let cuitEmpresaActiva = null;
let cacheEmpresas = []; 
let cacheEmpleados = []; 
let cacheGremios = [];

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
    cargarTodosLosEmpleados(); 
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
    
    if (id === 'gremios') cargarGremios();

    const nav = document.getElementById('menuNav');
    if (nav?.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(nav) || new bootstrap.Collapse(nav);
        bsCollapse.hide();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --- GESTIÓN DE EMPRESAS --- */
async function cargarEmpresas() {
    try {
        const resp = await fetch(`${URL_WEB_APP}?action=leer&t=${Date.now()}`);
        cacheEmpresas = await resp.json();
        renderizarTablaEmpresas();
    } catch (e) { console.error(e); }
}

function renderizarTablaEmpresas() {
    const tabla = document.getElementById('tabla-empresas');
    if (!tabla) return;
    tabla.innerHTML = '';
    if (Array.isArray(cacheEmpresas)) {
        cacheEmpresas.forEach(emp => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold text-primary cursor-pointer" onclick="verDetalleEmpresa('${emp[2]}')">${emp[0]}</td>
                <td>${emp[2]}</td>
                <td>${emp[1]}</td>
                <td class="text-end pe-3">
                    <button class="btn btn-sm btn-outline-warning border-0" onclick="prepararEdicionEmpresa('${emp[2]}')"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-outline-danger border-0" onclick="eliminarEmpresa('${emp[2]}')"><i class="bi bi-trash"></i></button>
                </td>`;
            tabla.appendChild(tr);
        });
    }
}

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
                    <div><h1 class="fw-bold mb-0 text-warning">${emp[0]}</h1><small class="text-white-50"><i class="bi bi-geo-alt"></i> ${emp[1] || 'Sin dirección'}</small></div>
                    <button class="btn btn-outline-light btn-sm rounded-pill px-3 fw-bold" onclick="mostrarSeccion('empresas')"><i class="bi bi-arrow-left me-1"></i> VOLVER AL LISTADO</button>
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
    } catch (e) { console.error(e); }
}

/* --- GESTIÓN DE EMPLEADOS --- */
async function cargarTodosLosEmpleados() {
    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empleados&t=${Date.now()}`);
        cacheEmpleados = await resp.json();
    } catch (e) { console.error(e); }
}

async function cargarEmpleadosEmpresa(cuit) {
    const cuerpo = document.getElementById('tabla-empleados-cuerpo');
    const tablaHeader = document.querySelector('#sec-detalle-empresa thead tr');
    if (!cuerpo) return;

    if (!document.getElementById('th-check-header')) {
        const thCheck = document.createElement('th');
        thCheck.id = 'th-check-header';
        thCheck.className = 'text-end d-none';
        thCheck.innerHTML = `<div class="d-flex align-items-center justify-content-end"><small class="me-2 text-warning">TODOS</small><input type="checkbox" id="check-todos-empleados" onclick="toggleTodosEmpleados(this)"></div>`;
        tablaHeader.appendChild(thCheck);
    } else {
        document.getElementById('th-check-header').classList.add('d-none');
    }

    cuerpo.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';

    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empleados&t=${Date.now()}`);
        const todos = await resp.json();
        const filtrados = todos.filter(em => em[9]?.toString().replace(/\D/g, '') === cuit.toString().replace(/\D/g, ''));
        cuerpo.innerHTML = '';

        if (filtrados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay empleados registrados.</td></tr>';
            return;
        }

        filtrados.forEach(em => {
            const tr = document.createElement('tr');
            // AQUÍ LA CLAVE: Guardamos los datos para que procesarLiquidacionFinal los lea sin errores
            tr.setAttribute('data-legajo', em[0]);
            tr.setAttribute('data-nombre', em[1]);
            tr.setAttribute('data-cuil', em[3]);
            tr.setAttribute('data-basico', em[8]);
            tr.setAttribute('data-conceptos', em[10] || "Sueldo Básico");

            tr.innerHTML = `
                <td class="fw-bold">${em[1]}</td>
                <td>${em[3]}</td>
                <td><span class="badge bg-light text-dark border">${em[4]}</span></td>
                <td class="text-end pe-3">
                    <div class="d-flex align-items-center justify-content-end gap-3">
                        <button class="btn btn-sm btn-outline-secondary border-0" onclick="verFichaEmpleado('${em[3]}')"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="eliminarEmpleado('${em[3]}')"><i class="bi bi-trash"></i></button>
                        <input type="checkbox" class="check-empleado d-none" value="${em[3]}">
                    </div>
                </td>`;
            cuerpo.appendChild(tr);
        });
    } catch (e) { console.error(e); }
}

async function eliminarEmpleado(cuil) {
    // 1. Confirmación de seguridad
    if (!confirm(`¿Estás seguro de eliminar al empleado con CUIL ${cuil}?`)) return;

    try {
        // 2. Definimos el cuerpo exacto para el POST
        const datos = {
            action: 'eliminarEmpleado',
            cuil: cuil.toString() // Nos aseguramos que sea texto
        };

        const resp = await fetch(URL_WEB_APP, {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        const resultado = await resp.text();

        if (resultado.includes("OK")) {
            alert("✅ Empleado eliminado correctamente.");
            // 3. Recargamos solo la tabla de empleados de la empresa actual
            cargarEmpleadosEmpresa(cuitEmpresaActiva);
        } else {
            console.error("Respuesta del servidor:", resultado);
            alert("El servidor no pudo eliminar al empleado.");
        }
    } catch (e) {
        console.error("Error de red:", e);
        alert("Error de conexión al intentar borrar.");
    }
}

/* --- LIQUIDACIÓN E IMPRESIÓN --- */
function abrirPanelLiquidacion() {
    const checks = document.querySelectorAll('.check-empleado');
    const headerCheck = document.getElementById('th-check-header');
    const btnLiquidar = document.querySelector('button[onclick="abrirPanelLiquidacion()"]');

    if (headerCheck.classList.contains('d-none')) {
        headerCheck.classList.remove('d-none');
        checks.forEach(cb => cb.classList.remove('d-none'));
        btnLiquidar.innerHTML = '<i class="bi bi-check-all me-1"></i> CONFIRMAR SELECCIÓN';
        btnLiquidar.classList.replace('btn-warning', 'btn-success');
        return;
    }

    const seleccionados = [];
    document.querySelectorAll('.check-empleado:checked').forEach(cb => {
        const fila = cb.closest('tr');
        seleccionados.push({ nombre: fila.getAttribute('data-nombre'), cuil: cb.value });
    });

    if (seleccionados.length === 0) return alert("Selecciona al menos un empleado.");

    const listaUI = document.getElementById('lista-empleados-confirmar');
    listaUI.innerHTML = '';
    seleccionados.forEach(emp => {
        const li = document.createElement('li');
        li.className = 'list-group-item bg-transparent text-white border-secondary small d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${emp.nombre}</span> <small class="text-white-50">${emp.cuil}</small>`;
        listaUI.appendChild(li);
    });
    document.getElementById('count-empleados-confirmar').innerText = `${seleccionados.length} Empleados`;
    new bootstrap.Modal(document.getElementById('modalConfirmarLiquidacion')).show();
}

function procesarLiquidacionFinal() {
    // 1. Cerrar el modal de confirmación
    const modalEl = document.getElementById('modalConfirmarLiquidacion');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    const seleccionados = [];
    // 2. Buscar todos los checks marcados
    const checks = document.querySelectorAll('.check-empleado:checked');
    
    if (checks.length === 0) {
        alert("No hay empleados seleccionados.");
        return;
    }

    checks.forEach(cb => {
        const fila = cb.closest('tr');
        // Extraemos los datos de los atributos data que pusimos al cargar
        seleccionados.push({
            legajo: fila.getAttribute('data-legajo') || "S/N",
            nombre: fila.getAttribute('data-nombre') || "Sin Nombre",
            cuil: fila.getAttribute('data-cuil') || cb.value,
            basico: fila.getAttribute('data-basico') || "0",
            conceptos: fila.getAttribute('data-conceptos') || "Sueldo Básico"
        });
    });

    // 3. Disparar la previsualización
    console.log("Liquidando a:", seleccionados); // Para debug
    previsualizarRecibos(seleccionados);
    
    // 4. Limpiar la vista (quitar checks y volver botones a su estado original)
    resetearVistaLiquidacion();
}

function previsualizarRecibos(listaSeleccionados) {
    if (!listaSeleccionados || listaSeleccionados.length === 0) return;

    const datosEmpresa = {
        nombre: document.getElementById('m-nombre')?.value || "Empresa",
        cuit: document.getElementById('m-cuit')?.value || "",
        direccion: document.getElementById('m-dir')?.value || "",
        periodoAbonado: document.getElementById('m-p-abo')?.value || "2026-01",
        fechaPago: document.getElementById('m-f-pago')?.value || "",
        domicilioPago: document.getElementById('m-domicilio')?.value || "",
        banco: document.getElementById('m-banco')?.value || "-"
    };

    const periodoFormateado = `${datosEmpresa.periodoAbonado.split('-')[1]}/${datosEmpresa.periodoAbonado.split('-')[0]}`;

    let htmlCompleto = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibos</title><style>
        @page { size: A4; margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 10pt; margin: 0; padding: 0; background-color: #f0f0f0; }
        .no-print { position: fixed; top: 0; width: 100%; background: #222; color: white; padding: 15px; text-align: center; z-index: 9999; }
        .recibo-pagina { width: 210mm; min-height: 297mm; margin: 80px auto 20px auto; padding: 15mm; box-sizing: border-box; background: #fff; border: 1px solid #ccc; page-break-after: always; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; }
        .bg-gray { background-color: #f2f2f2; font-weight: bold; }
        @media print { body { background: none; } .no-print { display: none; } .recibo-pagina { margin: 0; border: none; } }
    </style></head><body>
    <div class="no-print"><button onclick="window.print()" style="padding:10px 25px; background:#ffc107; border:none; font-weight:bold; cursor:pointer;">🖨️ IMPRIMIR RECIBOS (${listaSeleccionados.length})</button></div>`;

    listaSeleccionados.forEach(emp => {
    // 1. Convertimos los conceptos en un array limpio
    const listaConceptos = (emp.conceptos || "Sueldo Básico").split(',').map(c => c.trim());
    
    // 2. Generamos las filas de la tabla
    let filasConceptos = listaConceptos.map(c => {
        // Normalizamos el texto para comparar (quita tildes y pasa a minúsculas)
        const conceptoNormalizado = c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const esBasico = conceptoNormalizado.includes("sueldo basico") || conceptoNormalizado.includes("basico");

        // Si es el básico, usamos el valor de emp.basico, si no, ponemos guion (por ahora)
        const valorRemunerativo = esBasico ? `$ ${emp.basico}` : "-";

        return `
            <tr>
                <td>${c}</td>
                <td style="text-align:center">-</td>
                <td style="text-align:center">-</td>
                <td style="text-align:right">${valorRemunerativo}</td>
                <td style="text-align:right">-</td>
                <td style="text-align:right">-</td>
            </tr>`;
    }).join('');

    // 3. Construimos el HTML del recibo
    htmlCompleto += `
        <div class="recibo-pagina">
            <table style="border:none;">
                <tr>
                    <td style="border:none; width:65%">
                        <h3 style="margin:0;">${datosEmpresa.nombre}</h3>
                        <small>CUIT: ${datosEmpresa.cuit}</small><br>
                        <small>${datosEmpresa.direccion}</small>
                    </td>
                    <td style="border:none; text-align:right; vertical-align:top;">
                        <h2 style="margin:0; color:#444;">RECIBO DE HABERES</h2>
                        Legajo N°: <strong>${emp.legajo || 'S/N'}</strong>
                    </td>
                </tr>
            </table>

            <table style="text-align:center; margin-top:10px;">
                <tr class="bg-gray">
                    <td style="width:50%;">Apellido y Nombre</td>
                    <td style="width:25%;">CUIL</td>
                    <td style="width:25%;">Período Liquidado</td>
                </tr>
                <tr>
                    <td><strong>${emp.nombre}</strong></td>
                    <td>${emp.cuil}</td>
                    <td>${periodoFormateado}</td>
                </tr>
            </table>

            <table style="min-height: 450px; vertical-align: top; margin-top:10px;">
                <thead>
                    <tr class="bg-gray">
                        <th style="width:40%;">Descripción</th>
                        <th style="text-align:center;">Base</th>
                        <th style="text-align:center;">%</th>
                        <th style="text-align:right;">Remunerativo</th>
                        <th style="text-align:right;">Descuentos</th>
                        <th style="text-align:right;">No Remun.</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasConceptos}
                    <tr><td style="border:none; height:auto;"></td><td style="border:none;"></td><td style="border:none;"></td><td style="border:none;"></td><td style="border:none;"></td><td style="border:none;"></td></tr>
                </tbody>
            </table>

            <table style="margin-top:-1px;">
                <tr>
                    <td class="bg-gray" style="text-align:right; width:75%; padding:10px;">NETO A COBRAR</td>
                    <td style="text-align:right; font-size: 14pt; font-weight: bold; width:25%;">$ ${emp.basico}</td>
                </tr>
            </table>

            <div style="margin-top: 30px;">
                <div style="float:left; width: 55%; border:1px solid #ccc; padding:15px; font-size:9pt; border-radius:5px;">
                    <strong>Lugar de pago:</strong> ${datosEmpresa.domicilioPago || datosEmpresa.direccion}<br>
                    <strong>Fecha de pago:</strong> ${datosEmpresa.fechaPago || '-'}<br>
                    <strong>Banco:</strong> ${datosEmpresa.banco}
                </div>
                <div style="float:right; width:220px; border-top:1px solid #000; text-align:center; margin-top:60px; font-size:9pt;">
                    Firma del Empleado
                </div>
                <div style="clear:both"></div>
            </div>
            
            <p style="font-size:7pt; color:#888; margin-top:20px; text-align:center;">
                Original para el empleado - Sistema de Gestión de Sueldos
            </p>
        </div>`;
});

    htmlCompleto += `</body></html>`;
    const win = window.open('', '_blank');
    win.document.write(htmlCompleto);
    win.document.close();
}

function resetearVistaLiquidacion() {
    const btn = document.querySelector('button[onclick="abrirPanelLiquidacion()"]');
    document.getElementById('th-check-header').classList.add('d-none');
    document.querySelectorAll('.check-empleado').forEach(cb => { cb.classList.add('d-none'); cb.checked = false; });
    btn.innerHTML = '<i class="bi bi-calculator me-1"></i> LIQUIDAR SUELDO';
    btn.classList.replace('btn-success', 'btn-warning');
}

function toggleTodosEmpleados(source) {
    document.querySelectorAll('.check-empleado').forEach(cb => cb.checked = source.checked);
}

/* --- GESTIÓN DE GREMIOS --- */
async function cargarGremios() {
    const tabla = document.getElementById('tabla-gremios-cuerpo');
    if (!tabla) return;
    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=gremios&t=${Date.now()}`);
        cacheGremios = await resp.json();
        tabla.innerHTML = cacheGremios.map(g => `<tr><td class="fw-bold text-warning">${g[0]}</td><td>${g[1]}</td><td class="text-end pe-3"><button class="btn btn-sm btn-outline-warning border-0" onclick="prepararEdicionGremio('${g[0]}')"><i class="bi bi-pencil"></i></button></td></tr>`).join('');
    } catch (e) { console.error(e); }
}

/* --- RE-INYECCIÓN DE TUS FUNCIONES DE FICHA Y EDICIÓN (SIN TOCAR) --- */
async function verFichaEmpleado(cuil) {
    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empleados&t=${Date.now()}`);
        const empleados = await resp.json();
        const em = empleados.find(e => e[3].toString() === cuil.toString());
        if (em) {
            document.getElementById('edit-empl-legajo').value = em[0];
            document.getElementById('edit-empl-nombre').value = em[1];
            document.getElementById('edit-empl-id-original').value = em[3]; 
            document.getElementById('edit-empl-bruto').value = em[6]; 
            document.getElementById('edit-empl-dias').value = em[7]; 
            const selectGremio = document.getElementById('edit-empl-gremio');
            if (selectGremio) selectGremio.value = em[5] || "";
            actualizarChecksConceptos(em[5], em[10] ? em[10].split(',') : []);
            new bootstrap.Modal(document.getElementById('modalEditarEmpleado')).show();
        }
    } catch (e) { alert("Error al cargar ficha."); }
}

// ... (El resto de tus listeners de formularios se mantienen igual)