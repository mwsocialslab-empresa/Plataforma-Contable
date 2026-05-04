/* ============================================================
   🔹 SCRIPT.JS: MOTOR RECONSTRUIDO v2.3 (SIN GREMIOS)
   ============================================================ */

const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycby42YflS0XOQjYh_Z12M-4mksOxHZInft2WKV1Xzd90ae41eBqpvXgcScH_njqY2o3orQ/exec';

// --- ESTADOS GLOBALES ---
let cacheEmpresas = [];
let cacheEmpleados = [];
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
        console.log("");
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
    
    const datos = {
        action: 'crearEmpleado',
        legajo: document.getElementById('empl-legajo').value,
        nombre: document.getElementById('empl-nombre').value,
        cuil: document.getElementById('empl-cuil').value,
        ingreso: document.getElementById('empl-ingreso').value,
        tarea: document.getElementById('empl-tarea').value,
        bruto: document.getElementById('empl-bruto').value,
        cuitEmpresa: cuitEmpresaActiva,
        conceptos: "" // Se envía vacío por ahora al no haber gremios
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
   🖨️ LIQUIDACIONES E IMPRESIÓN
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

function abrirPanelLiquidacion() {
    const checks = document.querySelectorAll('.check-empleado:checked');
    if (checks.length === 0) return alert("Por favor, seleccioná al menos un empleado.");

    listaParaImprimir = [];
    const modalBody = document.querySelector('#modalLiquidacion .modal-body');
    let filasEmpleados = '';
    
    checks.forEach(cb => {
        const cuil = cb.getAttribute('data-cuil').toString();
        const emp = cacheEmpleados.find(e => e[2].toString() === cuil);
        
        if (emp) {
            listaParaImprimir.push(emp);
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

    const resumenHTML = `
        <div class="mt-3">
            ${filasEmpleados}
            <div class="alert alert-secondary mt-3 text-center py-2">
                <strong>Cantidad de empleados a liquidar: ${listaParaImprimir.length}</strong>
            </div>
        </div>
    `;

    if (modalBody) modalBody.innerHTML = resumenHTML;

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
    const banco = document.getElementById('emp-banco')?.value || empActiva[9] || "";
    const fechaPago = document.getElementById('emp-fechaPago')?.value || "";

    let contenidoHTML = `
    <html>
    <head>
        <style>
            body { background: #525659; margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .no-print { padding: 15px; text-align: center; background: #333; position: sticky; top: 0; z-index: 100; }
            .btn-print { padding: 10px 20px; cursor: pointer; font-weight: bold; background: white; border: none; border-radius: 4px; }
            .a4-container { background: white; width: 210mm; min-height: 144mm; padding: 10mm 15mm; margin: 10px auto; box-sizing: border-box; position: relative; border-bottom: 1px dashed #666; }
            .a4-container:nth-of-type(even) { page-break-after: always; border-bottom: none; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: -1px; }
            th, td { border: 1px solid black; padding: 2px 4px; font-size: 8pt; height: 16px; overflow: hidden; }
            .bg-gray { background: #eeeeee; font-weight: bold; text-align: center; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .tabla-conceptos td { border-top: none; border-bottom: none; vertical-align: middle; }
            .border-bottom { border-bottom: 1px solid black !important; }
            .relleno-lineas { height: 140px; vertical-align: top !important; }
            .texto-legal { font-size: 7pt; margin-top: 5px; text-align: justify; }
            @media print { body { background: white; } .no-print { display: none; } .a4-container { margin: 0; box-shadow: none; } }
        </style>
    </head>
    <body>
        <div class="no-print"><button class="btn-print" onclick="window.print()">🖨️ CONFIRMAR IMPRESIÓN</button></div>`;

    listaParaImprimir.forEach(emp => {
        const brutoValue = parseFloat(emp[6] || 0);
        const tiposCopia = ["ORIGINAL PARA EL EMPLEADOR", "DUPLICADO PARA EL EMPLEADO"];

        tiposCopia.forEach(tipo => {
            let totalRemun = brutoValue;
            let totalNoRemun = 0;
            let totalDesc = 0;
            let totalNeto = totalRemun - totalDesc;

            contenidoHTML += `
            <div class="a4-container">
                <table>
                    <tr>
                        <td style="width: 60%; border:none;">
                            <h3 style="margin:0">${empActiva[0]}</h3>
                            <div style="font-size:8pt;">${domicilioPago}</div>
                            <div style="font-size:8pt;">CUIT: ${empActiva[2]}</div>
                        </td>
                        <td style="width: 40%; border:none; text-align:right;">
                            <h4 style="margin:0">${tipo}</h4>
                            <div style="font-size:9pt; font-weight:bold;">Legajo N°: ${emp[0]}</div>
                        </td>
                    </tr>
                </table>

                <table>
                    <tr class="bg-gray"><td>Nombre y Apellido</td><td>Fecha Ingreso</td><td>CUIL</td><td>Caja de Ahorro</td><td>Sueldo Básico</td></tr>
                    <tr class="text-center"><td>${emp[1]}</td><td>${emp[3]}</td><td>${emp[2]}</td><td>${banco}</td><td>$ ${brutoValue.toLocaleString('es-AR')}</td></tr>
                </table>

                <table>
                    <tr class="bg-gray"><td>Fecha Depósito</td><td>Banco</td><td>Último Depósito</td><td>Calificación</td></tr>
                    <tr class="text-center"><td>${fechaPago}</td><td>${banco}</td><td>${fechaPago}</td><td>${emp[4] || 'Administración'}</td></tr>
                </table>

                <table class="tabla-conceptos">
                    <tr class="bg-gray">
                        <td style="width: 40%;">Conceptos</td><td style="width: 8%;">Base</td><td style="width: 8%;">%</td>
                        <td style="width: 14%;">Remun.</td><td style="width: 14%;">Desc.</td><td style="width: 16%;">No Remun.</td>
                    </tr>
                    <tr>
                        <td>Sueldo Básico</td><td class="text-center">30</td><td class="text-center">-</td>
                        <td class="text-right">$ ${brutoValue.toLocaleString('es-AR')}</td><td></td><td></td>
                    </tr>
                    <tr class="relleno-lineas border-bottom"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                </table>

                <table>
                    <tr>
                        <td rowspan="2" style="width:56%; border:none;"></td>
                        <td class="bg-gray" style="width:24%;">Total Bruto</td>
                        <td class="text-right" style="width:20%; font-weight:bold;">$ ${totalRemun.toLocaleString('es-AR')}</td>
                    </tr>
                    <tr>
                        <td class="bg-gray">TOTAL NETO</td>
                        <td class="text-right" style="font-size:10pt; font-weight:bold; background:#eee;">$ ${totalNeto.toLocaleString('es-AR')}</td>
                    </tr>
                </table>

                <table style="margin-top:5px; border:none;">
                    <tr>
                        <td style="width: 60%; border:none;">
                            <div style="font-weight:bold; font-size:8pt;">SON: ${totalNeto.toLocaleString('es-AR')} PESOS</div>
                            <div class="texto-legal">Recibí conforme el importe de esta liquidación.</div>
                        </td>
                        <td style="width: 40%; border:none; text-align:center; vertical-align:bottom;">
                            <div style="border-top: 1px solid black; margin-top:40px; font-size:8pt;">Firma del Empleado</div>
                        </td>
                    </tr>
                </table>
            </div>`;
        });
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
/* ============================================================
   🏷️ NUEVA GESTIÓN DE GREMIOS (PASOS 1, 2 y 3)
   ============================================================ */

// Para guardar categorías antes de enviar el form

function agregarCategoriaGremio() {
    const nombre = document.getElementById('cat-nombre').value.trim();
    const valor = document.getElementById('cat-valor').value;
    const tipo = document.getElementById('cat-tipo').value;

    if (!nombre || !valor) return alert("Completá nombre y valor de la categoría");

    categoriasTemporales.push({ nombre, valor, tipo });

    // Limpiamos solo los inputs de categoría
    document.getElementById('cat-nombre').value = "";
    document.getElementById('cat-valor').value = "";
    
    renderizarCategoriasTemporales();
}

function agregarConceptoGremio() {
    const n = document.getElementById('con-nombre').value;
    const t = document.getElementById('con-tipo').value;
    const p = document.getElementById('con-porcentaje').value;
    if(!n || !p) return alert("Completá el concepto");

    conceptosTemporales.push({ nombre: n, tipo: t, porcentaje: p });
    
    // Limpiamos solo los campos de abajo
    document.getElementById('con-nombre').value = "";
    document.getElementById('con-porcentaje').value = "";
    renderizarConceptosTemporales();
}
function renderizarCategoriasTemporales() {
    document.getElementById('lista-categorias-gremio').innerHTML = categoriasTemporales.map((c, i) => `
        <div class="col-md-4">
            <div class="p-2 border rounded bg-white shadow-sm position-relative border-start border-4 border-primary">
                <div class="fw-bold small">${c.nombre}</div>
                <div class="text-muted" style="font-size:0.75rem">${c.tipo}: $${c.valor}</div>
                <i class="bi bi-x-circle text-danger position-absolute top-0 end-0 m-1 cursor-pointer" onclick="categoriasTemporales.splice(${i},1);renderizarCategoriasTemporales()"></i>
            </div>
        </div>
    `).join('');
}
function eliminarCategoriaTemporal(index) {
    categoriasTemporales.splice(index, 1);
    renderizarCategoriasTemporales();
}

function eliminarCategoriaTemporal(index) {
    categoriasTemporales.splice(index, 1);
    renderizarCategoriasTemporales();
}

// Modificamos el guardarGremio para que envíe el objeto completo
async function guardarGremio(e) {
    e.preventDefault();

    const nombreGremio = document.getElementById('gre-nombre').value.trim();
    if (!nombreGremio) return alert("Por favor, poné un nombre al gremio");
    if (categoriasTemporales.length === 0) return alert("Debes agregar al menos una categoría");
    if (conceptosTemporales.length === 0) return alert("Debes agregar al menos un concepto");

    const btn = e.submitter;
    btn.disabled = true;
    btn.innerHTML = "GUARDANDO...";

    // Agrupamos todo en un solo objeto
    const datos = {
        action: 'crearGremio',
        nombre: nombreGremio,
        actividad: document.getElementById('gre-actividad').value.trim(),
        categorias: JSON.stringify(categoriasTemporales),
        conceptos: JSON.stringify(conceptosTemporales)
    };

    try {
        // ELIMINAMOS mode: 'no-cors' para poder recibir respuesta
        // Usamos URLSearchParams para que Apps Script lo reciba en e.parameter
        const resp = await fetch(URL_WEB_APP, { 
            method: 'POST',
            body: JSON.stringify(datos)
        });

        // Si el script de Google devuelve texto
        const result = await resp.text();
        
        alert("✅ ¡Gremio guardado con éxito!");
        
        // Limpieza
        document.getElementById('form-gremio').reset();
        categoriasTemporales = [];
        conceptosTemporales = [];
        renderizarCategoriasTemporales();
        renderizarConceptosTemporales();
        
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalGremio'));
        if (modalInstance) modalInstance.hide();

    } catch (err) {
        console.error("Error:", err);
        // A veces Google da error de CORS aunque guarde igual. 
        // Si no ves el error en la tabla de Google Sheets, revisá el Apps Script.
        alert("Hubo un problema al conectar, pero verificá si se guardó en la planilla.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "GUARDAR GREMIO COMPLETO";
    }
}

// Vincular el submit del form
document.addEventListener("DOMContentLoaded", () => {
    const formGremio = document.getElementById('form-gremio');
    if (formGremio) formGremio.onsubmit = guardarGremio;
});
/* ============================================================
   🏷️ GESTIÓN DE CONCEPTOS (PASO 4)
   ============================================================ */

 // Array para los conceptos (Jubilación, Presentismo, etc.)
function agregarCategoriaGremio() {
    const n = document.getElementById('cat-nombre').value;
    const v = document.getElementById('cat-valor').value;
    const t = document.getElementById('cat-tipo').value;
    if(!n || !v) return alert("Completá la categoría");

    categoriasTemporales.push({ nombre: n, valor: v, tipo: t });
    
    // Limpiamos solo los campos de arriba
    document.getElementById('cat-nombre').value = "";
    document.getElementById('cat-valor').value = "";
    renderizarCategoriasTemporales();
}

function renderizarConceptosTemporales() {
    document.getElementById('lista-conceptos-gremio').innerHTML = conceptosTemporales.map((c, i) => `
        <div class="col-md-4">
            <div class="p-2 border rounded bg-white shadow-sm position-relative border-start border-4 ${c.tipo === 'DESC' ? 'border-danger' : 'border-success'}">
                <div class="fw-bold small">${c.nombre}</div>
                <div class="text-muted" style="font-size:0.75rem">${c.tipo}: ${c.porcentaje}%</div>
                <i class="bi bi-x-circle text-danger position-absolute top-0 end-0 m-1 cursor-pointer" onclick="conceptosTemporales.splice(${i},1);renderizarConceptosTemporales()"></i>
            </div>
        </div>
    `).join('');
}

function eliminarConceptoTemporal(index) {
    conceptosTemporales.splice(index, 1);
    renderizarConceptosTemporales();
}

function abrirModalGremio() {
    // Reset de los arrays para empezar de cero
    categoriasTemporales = [];
    conceptosTemporales = [];
    
    // Reset del formulario visual
    document.getElementById('form-gremio').reset();
    
    // Limpiar las listas visuales
    renderizarCategoriasTemporales();
    renderizarConceptosTemporales();
    
    // Mostrar modal
    new bootstrap.Modal(document.getElementById('modalGremio')).show();
}




/* ============================================================
   RE-ACTUALIZACIÓN DE GUARDAR GREMIO (PARA INCLUIR TODO)
   ============================================================ */

/* ============================================================
   🏷️ GESTIÓN DE GREMIOS (CORREGIDO)
   ============================================================ */

/* ============================================================
   🏷️ GESTIÓN DE GREMIOS: GUARDADO Y VISUALIZACIÓN
   ============================================================ */

async function guardarGremio(e) {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    btn.innerHTML = "GUARDANDO...";

    const datos = {
        action: 'crearGremio',
        nombre: document.getElementById('gre-nombre').value,
        actividad: document.getElementById('gre-actividad').value,
        categorias: JSON.stringify(categoriasTemporales),
        conceptos: JSON.stringify(conceptosTemporales)
    };

    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify(datos) });
        const result = await resp.text();
        
        if (result.includes("OK")) {
            alert("✅ Gremio guardado correctamente");
            bootstrap.Modal.getInstance(document.getElementById('modalGremio')).hide();
            
            // RESET Y RECARGA
            document.getElementById('form-gremio').reset();
            categoriasTemporales = [];
            conceptosTemporales = [];
            renderizarCategoriasTemporales();
            renderizarConceptosTemporales();
            
            // ESTA ES LA FUNCIÓN QUE ACTUALIZA LA VISTA
            await cargarGremios(); 
        }
    } catch (err) {
        console.error(err);
        alert("Error al conectar con el servidor");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "GUARDAR GREMIO COMPLETO";
    }
}

async function cargarGremios() {
    const cuerpoTabla = document.getElementById('tabla-gremios-cuerpo');
    if (!cuerpoTabla) return;

    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=gremios&t=${Date.now()}`);
        const gremios = await resp.json();

        cuerpoTabla.innerHTML = gremios.map(g => `
            <tr>
                <td class="fw-bold text-uppercase">${g[0]}</td>
                <td>${g[1]}</td>
                <td><span class="badge bg-secondary">Configurado</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-warning me-2" onclick="prepararEdicionGremio('${g[0]}', '${g[1]}', '${encodeURIComponent(g[2])}', '${encodeURIComponent(g[3])}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarGremio('${g[0]}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (e) { console.error(e); }
}
// --- FUNCIÓN PARA BORRAR ---
async function eliminarGremio(nombre) {
    if (!confirm(`¿Estás seguro de eliminar el gremio ${nombre}?`)) return;

    try {
        const resp = await fetch(URL_WEB_APP, {
            method: 'POST',
            body: JSON.stringify({ action: 'eliminarGremio', nombre: nombre })
        });
        const result = await resp.text();
        if (result === "OK") {
            alert("🗑️ Gremio eliminado");
            cargarGremios(); // Recarga la tabla
        }
    } catch (e) { alert("Error al eliminar"); }
}

// --- FUNCIÓN PARA EDITAR (Carga los datos en el modal) ---
function prepararEdicionGremio(nombre, actividad, catsJson, consJson) {
    // 1. Llenamos los campos básicos
    document.getElementById('gre-nombre').value = nombre;
    document.getElementById('gre-actividad').value = actividad;

    // 2. Parseamos y cargamos las listas temporales
    try {
        categoriasTemporales = JSON.parse(decodeURIComponent(catsJson));
        conceptosTemporales = JSON.parse(decodeURIComponent(consJson));
        renderizarCategoriasTemporales();
        renderizarConceptosTemporales();
    } catch (e) {
        categoriasTemporales = [];
        conceptosTemporales = [];
    }

    // 3. Abrimos el modal
    const modal = new bootstrap.Modal(document.getElementById('modalGremio'));
    modal.show();
}
// Asegúrate de llamar a cargarGremios cuando inicie el sistema
document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("sueldos_auth") === "true") {
        cargarGremios();
    }
});

// IMPORTANTE: Vinculación del evento (Ponelo al final de tu archivo o en el init)
document.addEventListener("DOMContentLoaded", () => {
    const formGremio = document.getElementById('form-gremio');
    if (formGremio) {
        formGremio.onsubmit = guardarGremio;
    }
});