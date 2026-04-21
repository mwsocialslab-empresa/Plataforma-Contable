/* ============================================================
   🔹 SCRIPT.JS: MOTOR RECONSTRUIDO v2.2 (UNIFICADO)
   ============================================================ */

const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbzzeT270WZwO0oKWuupR3zhtJApZIwev4Le4-uU3mvYLLqa7fYXUkjAKUc85paLKwPXXg/exec';

// --- ESTADOS GLOBALES (UNA SOLA DECLARACIÓN) ---
let cacheEmpresas = [];
let cacheEmpleados = [];
let cacheGremios = [];
let cuitEmpresaActiva = null;
let listaParaImprimir = [];
let conceptosTemporalesGremio = []; 
let editandoGremio = false;

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
        await Promise.all([cargarEmpresas(), cargarGremios()]);
        console.log("🚀 Sistema listo");
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
        const resp = await fetch(`${URL_WEB_APP}?action=leer&t=${Date.now()}`);
        cacheEmpresas = await resp.json();
        renderizarTablaEmpresas();
    } catch (e) { console.error(e); }
}

function renderizarTablaEmpresas() {
    const tabla = document.getElementById('tabla-empresas');
    if (!tabla) return;
    tabla.innerHTML = cacheEmpresas.map(emp => `
        <tr>
            <td class="fw-bold text-primary cursor-pointer" onclick="verDetalleEmpresa('${emp[2]}')">${emp[0]}</td>
            <td>${emp[2]}</td>
            <td>${emp[1]}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-warning" onclick="prepararEdicionEmpresa('${emp[2]}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarEmpresa('${emp[2]}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
}

async function verDetalleEmpresa(cuit) {
    cuitEmpresaActiva = cuit;
    const emp = cacheEmpresas.find(e => e[2].toString() === cuit.toString());
    if (!emp) return;
    const cabecera = document.getElementById('cabecera-empresa-detalle');
    if (cabecera) cabecera.innerHTML = `<h2 class="fw-bold mb-0">${emp[0]}</h2><p class="mb-0 opacity-75">CUIT: ${emp[2]}</p>`;
    mostrarSeccion('detalle-empresa');
    cargarEmpleadosEmpresa(cuit);
    cargarDatosMensualesEmpresa(); 
}

/* ============================================================
   👤 GESTIÓN DE EMPLEADOS
   ============================================================ */

async function cargarEmpleadosEmpresa(cuit) {
    const cuerpo = document.getElementById('tabla-empleados-cuerpo');
    if (!cuerpo) return;
    cuerpo.innerHTML = '<tr><td colspan="5" class="text-center">Cargando...</td></tr>';
    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empleados&t=${Date.now()}`);
        cacheEmpleados = await resp.json();
        const filtrados = cacheEmpleados.filter(em => (em[9] || "").toString().trim() === cuit.toString().trim());
        cuerpo.innerHTML = filtrados.map(em => `
            <tr>
                <td class="text-center d-none col-check"><input type="checkbox" class="form-check-input check-empleado" data-cuil="${em[2]}"></td>
                <td class="fw-bold">${em[1]}</td>
                <td>${em[2]}</td>
                <td>${em[4] || 'Sin Cargo'}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarEmpleado('${em[2]}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`).join('');
    } catch (e) { console.error(e); }
}

async function guardarEmpleado(e) {
    e.preventDefault();
    if (!cuitEmpresaActiva) return;
    const btn = e.submitter;
    btn.disabled = true;
    const conceptosRaw = document.getElementById('contenedor-conceptos-gremio')?.getAttribute('data-conceptos-raw') || "";
    const datos = {
        action: 'crearEmpleado',
        legajo: document.getElementById('empl-legajo').value,
        nombre: document.getElementById('empl-nombre').value,
        cuil: document.getElementById('empl-cuil').value,
        ingreso: document.getElementById('empl-ingreso').value,
        tarea: document.getElementById('empl-tarea').value,
        gremio: document.getElementById('empl-gremio').value,
        bruto: document.getElementById('empl-bruto').value,
        cuitEmpresa: cuitEmpresaActiva,
        conceptos: conceptosRaw
    };
    try {
        await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(datos) });
        alert("✅ Empleado guardado");
        bootstrap.Modal.getInstance(document.getElementById('modalEmpleado')).hide();
        setTimeout(() => cargarEmpleadosEmpresa(cuitEmpresaActiva), 1000);
    } catch (err) { alert("Error"); }
    finally { btn.disabled = false; }
}

/* ============================================================
   🏷️ GESTIÓN DE GREMIOS (CORREGIDO)
   ============================================================ */

function abrirModalGremio() {
    editandoGremio = false;
    document.getElementById('form-gremio').reset();
    document.getElementById('gre-nombre').readOnly = false;
    conceptosTemporalesGremio = [];
    renderizarConceptosTemporales();
    new bootstrap.Modal(document.getElementById('modalGremio')).show();
}

function prepararEdicionGremio(nombreGremio) {
    const gremio = cacheGremios.find(g => g[0] === nombreGremio);
    if (!gremio) return;
    editandoGremio = true;
    document.getElementById('gre-nombre').value = gremio[0];
    document.getElementById('gre-nombre').readOnly = true;
    document.getElementById('gre-actividad').value = gremio[1] || "";
    document.getElementById('gre-categorias').value = gremio[2] || "";
    conceptosTemporalesGremio = [];
    if (gremio[3]) {
        gremio[3].split(',').forEach(f => {
            const [n, t, v] = f.split('|');
            if (n) conceptosTemporalesGremio.push({ nombre: n, tipo: t, valor: v });
        });
    }
    renderizarConceptosTemporales();
    new bootstrap.Modal(document.getElementById('modalGremio')).show();
}

function agregarConceptoLista() {
    const n = document.getElementById('nombre-concepto').value.trim();
    const t = document.getElementById('tipo-concepto').value;
    const v = document.getElementById('porcentaje-concepto').value.trim();
    if (!n || !v) return alert("Completá los datos");
    conceptosTemporalesGremio.push({ nombre: n, tipo: t, valor: v });
    document.getElementById('nombre-concepto').value = "";
    document.getElementById('porcentaje-concepto').value = "";
    renderizarConceptosTemporales();
}

function renderizarConceptosTemporales() {
    const div = document.getElementById('lista-conceptos-dinamicos');
    if (!div) return;
    div.innerHTML = conceptosTemporalesGremio.map((c, i) => `
        <div class="d-flex justify-content-between align-items-center bg-white border rounded p-2 mb-1 w-100 shadow-sm">
            <span class="small"><strong>${c.nombre}</strong> (${c.tipo}) - ${c.valor}%</span>
            <button type="button" class="btn btn-sm text-danger" onclick="conceptosTemporalesGremio.splice(${i},1); renderizarConceptosTemporales();">
                <i class="bi bi-x-circle-fill"></i>
            </button>
        </div>`).join('');
}

async function guardarGremio(e) {
    if(e) e.preventDefault();
    const conceptosString = conceptosTemporalesGremio.map(c => `${c.nombre}|${c.tipo}|${c.valor}`).join(',');
    const datos = {
        action: 'crearGremio',
        nombre: document.getElementById('gre-nombre').value,
        actividad: document.getElementById('gre-actividad').value,
        categorias: document.getElementById('gre-categorias').value,
        conceptos: conceptosString
    };
    const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify(datos) });
    if ((await resp.text()).includes("OK")) {
        alert("✅ Gremio guardado");
        bootstrap.Modal.getInstance(document.getElementById('modalGremio')).hide();
        cargarGremios();
    }
}

async function cargarGremios() {
    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=gremios&t=${Date.now()}`);
        cacheGremios = await resp.json();
        renderizarTablaGremios();
        actualizarSelectGremios();
    } catch (e) { console.error(e); }
}

function renderizarTablaGremios() {
    const cuerpo = document.getElementById('tabla-gremios-cuerpo');
    if (!cuerpo) return;
    cuerpo.innerHTML = cacheGremios.map(g => `
        <tr>
            <td class="fw-bold text-warning">${g[0]}</td>
            <td>${g[1]}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-warning" onclick="prepararEdicionGremio('${g[0]}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarGremio('${g[0]}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
}

function actualizarSelectGremios() {
    const select = document.getElementById('empl-gremio');
    if (!select) return;
    select.innerHTML = '<option value="" selected disabled>Seleccione...</option>' + 
        cacheGremios.map(g => `<option value="${g[0]}">${g[0]}</option>`).join('');
}

/* ============================================================
   🖨️ LIQUIDACIONES E IMPRESIÓN (SIN LÍNEAS)
   ============================================================ */

function habilitarSeleccionLiquidacion() {
    document.getElementById('th-check-header')?.classList.remove('d-none');
    document.querySelectorAll('.col-check').forEach(td => td.classList.remove('d-none'));
    const btn = document.getElementById('btn-habilitar-liq');
    btn.innerHTML = 'CONFIRMAR SELECCIÓN';
    btn.classList.replace('btn-warning', 'btn-success');
    btn.setAttribute('onclick', 'abrirPanelLiquidacion()');
}

function resetearVistaLiquidacion() {
    document.getElementById('th-check-header')?.classList.add('d-none');
    document.querySelectorAll('.col-check').forEach(td => td.classList.add('d-none'));
}

/* ============================================================
   📋 PANEL DE LIQUIDACIÓN (CORREGIDO)
   ============================================================ */

function abrirPanelLiquidacion() {
    const checks = document.querySelectorAll('.check-empleado:checked');
    if (checks.length === 0) return alert("Por favor, seleccioná al menos un empleado.");

    listaParaImprimir = [];
    const contenedorLista = document.getElementById('lista-liquidacion-empleados'); // Asegurate que este ID exista en tu modal
    
    // Si no tenés ese ID en el HTML, podés usar un selector general del cuerpo del modal
    const modalBody = document.querySelector('#modalLiquidacion .modal-body');

    let filasEmpleados = '';
    
    checks.forEach(cb => {
        const cuil = cb.getAttribute('data-cuil').toString();
        const emp = cacheEmpleados.find(e => e[2].toString() === cuil);
        
        if (emp) {
            listaParaImprimir.push(emp);
            // Creamos una fila simple para mostrar en el modal
            filasEmpleados += `
                <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                    <div>
                        <span class="fw-bold text-uppercase">${emp[1]}</span>
                        <br><small class="text-muted">CUIL: ${emp[2]}</small>
                    </div>
                    <span class="badge bg-info text-dark">Listo</span>
                </div>`;
        }
    });

    // Agregamos el resumen al final de la lista
    const resumenHTML = `
        <div class="mt-3">
            ${filasEmpleados}
            <div class="alert alert-secondary mt-3 text-center py-2">
                <strong>Cantidad de empleados a liquidar: ${listaParaImprimir.length}</strong>
            </div>
        </div>
    `;

    // Inyectamos el contenido en el modal
    if (modalBody) {
        modalBody.innerHTML = resumenHTML;
    }

    // Finalmente mostramos el modal
    const modalElem = document.getElementById('modalLiquidacion');
    if (modalElem) {
        let modalInstance = bootstrap.Modal.getInstance(modalElem) || new bootstrap.Modal(modalElem);
        modalInstance.show();
    }
}

function imprimirRecibo() {
    if (listaParaImprimir.length === 0) return alert("No hay empleados seleccionados");

    const ventana = window.open('', '_blank');
    const empActiva = cacheEmpresas.find(e => e[2].toString() === cuitEmpresaActiva.toString());
    const periodo = document.getElementById('emp-periodo')?.value || "";
    const domicilioPago = document.getElementById('emp-domicilio')?.value || empActiva[6] || "";

    let contenidoHTML = `
    <html>
    <head>
        <style>
            body { background: #525659; margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .no-print { padding: 15px; text-align: center; background: #333; position: sticky; top: 0; z-index: 100; }
            .btn-print { padding: 10px 20px; cursor: pointer; font-weight: bold; background: white; border: none; border-radius: 4px; }
            
            .a4-container { background: white; width: 210mm; min-height: 297mm; padding: 15mm; margin: 20px auto; box-sizing: border-box; page-break-after: always; }
            
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid black; padding: 3px 5px; font-size: 9pt; height: 20px; }
            
            .bg-gray { background: #eeeeee; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }

            /* ESTA PARTE CIERRA LAS LÍNEAS VERTICALES */
            .tabla-conceptos { border-bottom: none; }
            .tabla-conceptos td { 
                border-top: none; 
                border-bottom: none; 
                vertical-align: middle;
            }
            
            /* Fila final para cerrar el cuadro */
            .border-bottom { border-bottom: 1px solid black !important; }
            
            /* Contenedor para que las líneas sigan hasta abajo si hay pocos conceptos */
            .relleno-lineas { height: 300px; vertical-align: top !important; }

            @media print { body { background: white; } .no-print { display: none; } .a4-container { margin: 0; box-shadow: none; } }
        </style>
    </head>
    <body>
        <div class="no-print"><button class="btn-print" onclick="window.print()">🖨️ CONFIRMAR IMPRESIÓN</button></div>`;

    listaParaImprimir.forEach(emp => {
        const brutoValue = parseFloat(emp[6] || 0);
        const conceptosRaw = emp[10] || "";
        
        let filasHTML = `
            <tr>
                <td style="width: 45%;">Sueldo Básico</td>
                <td class="text-center" style="width: 8%;">30</td>
                <td class="text-center" style="width: 8%;">-</td>
                <td class="text-right" style="width: 13%;">$ ${brutoValue.toLocaleString('es-AR')}</td>
                <td style="width: 13%;"></td>
                <td style="width: 13%;"></td>
            </tr>`;

        if (conceptosRaw) {
            conceptosRaw.split(',').forEach(cStr => {
                const [n, t, v] = cStr.split('|');
                if (!n) return;
                filasHTML += `
                    <tr>
                        <td>${n}</td>
                        <td class="text-center"></td>
                        <td class="text-center"></td>
                        <td class="text-right">${(t==='REM'||t==='Remunerativo') ? '$ '+v : ''}</td>
                        <td class="text-right">${(t==='DESC'||t==='APORTE'||t==='Descuento') ? '$ '+v : ''}</td>
                        <td class="text-right">${(t==='NO_REM'||t==='No Remunerativo') ? '$ '+v : ''}</td>
                    </tr>`;
            });
        }

        // Fila de relleno que estira las líneas verticales sin separar los conceptos de arriba
        filasHTML += `<tr class="relleno-lineas border-bottom"><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;

        contenidoHTML += `
        <div class="a4-container">
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <div>
                    <h3 style="margin:0">${empActiva[0]}</h3>
                    <small>CUIT: ${empActiva[2]}<br>${domicilioPago}</small>
                </div>
                <div class="text-right">
                    <h3 style="margin:0">Recibo de Haberes</h3>
                    <small>Legajo N°: ${emp[0]}<br>Original / Duplicado</small>
                </div>
            </div>

            <table style="margin-bottom: -1px;">
                <tr class="bg-gray text-center">
                    <td>Nombre y Apellido</td><td>Fecha de Ingreso</td><td>CUIL</td><td>Sueldo Básico</td>
                </tr>
                <tr class="text-center">
                    <td>${emp[1]}</td><td>${emp[3]}</td><td>${emp[2]}</td><td>$ ${brutoValue.toLocaleString('es-AR')}</td>
                </tr>
            </table>

            <table class="tabla-conceptos">
                <tr class="bg-gray text-center" style="border-bottom: 1px solid black;">
                    <td style="width: 45%;">Descripción de Conceptos</td>
                    <td style="width: 8%;">Base</td>
                    <td style="width: 8%;">%</td>
                    <td style="width: 13%;">Remunerativo</td>
                    <td style="width: 13%;">Descuentos</td>
                    <td style="width: 13%;">No Remun.</td>
                </tr>
                ${filasHTML}
            </table>

            <table style="margin-top: -1px;">
                <tr class="bg-gray text-center">
                    <td>TOTAL BRUTO</td><td>TOTAL REMUNERATIVO</td><td>TOTAL NO REMUNERATIVO</td><td>TOTAL DESCUENTOS</td>
                </tr>
                <tr class="text-right">
                    <td>$ ${brutoValue.toLocaleString('es-AR')}</td>
                    <td>$ ${brutoValue.toLocaleString('es-AR')}</td>
                    <td>$ 0,00</td>
                    <td>$ 0,00</td>
                </tr>
                <tr>
                    <td colspan="3" class="text-right bg-gray">NETO A COBRAR</td>
                    <td class="text-right" style="font-size:12pt; font-weight:bold;">$ ${brutoValue.toLocaleString('es-AR')}</td>
                </tr>
            </table>

            <div style="display:flex; justify-content:space-around; margin-top:80px;">
                <div style="border-top:1px solid black; width:220px; text-align:center; padding-top:5px;">Firma Empleador</div>
                <div style="border-top:1px solid black; width:220px; text-align:center; padding-top:5px;">Firma Empleado</div>
            </div>
        </div>`;
    });

    contenidoHTML += `</body></html>`;
    ventana.document.write(contenidoHTML);
    ventana.document.close();
}

/* ============================================================
   🏢 DATOS MENSUALES
   ============================================================ */
async function cargarDatosMensualesEmpresa() {
    const emp = cacheEmpresas.find(e => e[2].toString() === cuitEmpresaActiva.toString());
    const contenedor = document.getElementById('contenedor-inputs-mensuales');
    if (!emp || !contenedor) return;
    contenedor.innerHTML = `
        <div class="col-md-3"><label class="small fw-bold">PERIODO</label><input type="text" id="emp-periodo" class="form-control form-control-sm bg-dark text-white" value="${emp[3] || ''}"></div>
        <div class="col-md-3"><label class="small fw-bold">DOMICILIO</label><input type="text" id="emp-domicilio" class="form-control form-control-sm bg-dark text-white" value="${emp[6] || ''}"></div>
        <div class="col-md-3"><label class="small fw-bold">BANCO</label><input type="text" id="emp-banco" class="form-control form-control-sm bg-dark text-white" value="${emp[9] || ''}"></div>
        <div class="col-md-3"><label class="small fw-bold">FECHA PAGO</label><input type="date" id="emp-fechaPago" class="form-control form-control-sm bg-dark text-white" value="${emp[7] || ''}"></div>`;
}

function toggleTodosEmpleados(source) {
    document.querySelectorAll('.check-empleado').forEach(cb => cb.checked = source.checked);
}