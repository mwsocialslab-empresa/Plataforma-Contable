/* ============================================================
   🔹 SCRIPT.JS: MOTOR RECONSTRUIDO v2.3 (SIN GREMIOS)
   ============================================================ */

const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbzHmiroU9gfyiRIG37vSP71cpJK5EkVrTzaAo7pcAjcZwEgYC05CZqy77s4E9Cr2gLrgg/exec';

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
function abrirModalEmpresa() {
    // Limpiamos el formulario para una nueva carga
    document.getElementById('form-empresa').reset();
    
    // Si ya tenés gremios cargados, acá podrías llenar un select de gremios 
    // en el modal de empresa si decidís agregar esa vinculación ahora.
    
    const modal = new bootstrap.Modal(document.getElementById('modalEmpresa'));
    modal.show();
}

async function guardarEmpresa(e) {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;

    const datos = {
        action: 'crearEmpresa',
        empleador: document.getElementById('emp-empleador').value,
        direccion: document.getElementById('emp-direccion').value,
        cuit: document.getElementById('emp-cuit').value
    };

    try {
        const resp = await fetch(URL_WEB_APP, { 
            method: 'POST', 
            body: JSON.stringify(datos) 
        });
        alert("✅ Empresa registrada");
        bootstrap.Modal.getInstance(document.getElementById('modalEmpresa')).hide();
        cargarEmpresas(); // Recarga la tabla de empresas
    } catch (err) {
        alert("Error al registrar empresa");
    } finally {
        btn.disabled = false;
    }
}
/* ============================================================
   👤 GESTIÓN DE EMPLEADOS
   ============================================================ */

async function cargarEmpleadosEmpresa(cuit) {
    const cuerpo = document.getElementById('tabla-empleados-cuerpo');
    if (!cuerpo) return;

    cuerpo.innerHTML = '<tr><td colspan="5" class="text-center">Cargando empleados...</td></tr>';

    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empleados&t=${Date.now()}`);
        cacheEmpleados = await resp.json();

        // Filtrar empleados por el CUIT de la empresa activa (índice 9 en la hoja)
        const filtrados = cacheEmpleados.filter(em => (em[9] || "").toString().trim() === cuit.toString().trim());

        if (filtrados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay empleados registrados en esta empresa.</td></tr>';
            return;
        }

        cuerpo.innerHTML = filtrados.map(em => {
            const nombre = em[1];
            const cuil = em[2];
            const tarea = em[4] || 'Sin Cargo';

            return `
            <tr>
                <td class="text-center d-none col-check">
                    <input type="checkbox" class="form-check-input check-empleado" data-cuil="${cuil}">
                </td>
                <td class="fw-bold">${nombre}</td>
                <td>${cuil}</td>
                <td>
                    <span class="badge bg-light text-dark border">${tarea}</span>
                </td>
                <td class="text-end">
                    <!-- BOTÓN EDITAR (LÁPIZ) -->
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editarEmpleado('${cuil}')" title="Editar Perfil">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    
                    <!-- BOTÓN ELIMINAR (TACHO) -->
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarEmpleado('${cuil}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (e) { 
        console.error("Error al cargar empleados:", e);
        cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al conectar con la base de datos.</td></tr>';
    }
}

async function guardarEmpleado(e) {
    e.preventDefault();
    if (!cuitEmpresaActiva) return;
    const btn = e.submitter;
    btn.disabled = true;

    // Recolectamos conceptos seleccionados
    const conceptosSeleccionados = [];
    document.querySelectorAll('.check-concepto-emp:checked').forEach(input => {
        conceptosSeleccionados.push(JSON.parse(input.value));
    });

    const datos = {
        action: 'crearEmpleado',
        legajo: document.getElementById('empl-legajo').value,
        nombre: document.getElementById('empl-nombre').value,
        cuil: document.getElementById('empl-cuil').value,
        ingreso: document.getElementById('empl-ingreso').value,
        tarea: document.getElementById('empl-tarea').value,
        bruto: document.getElementById('empl-categoria').value, // Tomamos el valor de la categoría
        cuitEmpresa: cuitEmpresaActiva,
        gremio: document.getElementById('empl-gremio').value,
        conceptos: JSON.stringify(conceptosSeleccionados) // Guardamos su perfil personalizado
    };

    try {
        const resp = await fetch(URL_WEB_APP, { method: 'POST', body: JSON.stringify(datos) });
        alert("✅ Empleado guardado con perfil de gremio");
        bootstrap.Modal.getInstance(document.getElementById('modalEmpleado')).hide();
        cargarEmpleadosEmpresa(cuitEmpresaActiva);
    } catch (err) { alert("Error al guardar"); }
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
            .relleno-lineas { height: 100px; vertical-align: top !important; }
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
            // Inicializamos acumuladores para cada copia
            let totalRemun = brutoValue;
            let totalNoRemun = 0;
            let totalDesc = 0;
            
            // Fila inicial: Sueldo Básico
            let filasHTML = `
                <tr>
                    <td>SUELDO BÁSICO</td>
                    <td class="text-center">30</td>
                    <td class="text-center">-</td>
                    <td class="text-right">$ ${brutoValue.toLocaleString('es-AR')}</td>
                    <td></td>
                    <td></td>
                </tr>`;

            // Procesar conceptos del empleado (almacenados en emp[11])
            try {
                const conceptosEmp = JSON.parse(emp[11] || "[]");
                conceptosEmp.forEach(c => {
                    let valorCalculado = 0;
                    
                    // Cálculo según el MODO
                    if (c.modo === 'porcentaje') {
                        valorCalculado = brutoValue * (parseFloat(c.valor) / 100);
                    } else {
                        valorCalculado = parseFloat(c.valor);
                    }

                    let colRemun = "", colDesc = "", colNoRemun = "";
                    const formatoMonto = `$ ${valorCalculado.toLocaleString('es-AR')}`;

                    // Clasificación según TIPO
                    if (c.tipo === 'REM') {
                        colRemun = formatoMonto;
                        totalRemun += valorCalculado;
                    } else if (c.tipo === 'DESC') {
                        colDesc = formatoMonto;
                        totalDesc += valorCalculado;
                    } else if (c.tipo === 'NO_REM') {
                        colNoRemun = formatoMonto;
                        totalNoRemun += valorCalculado;
                    }

                    // Definir qué mostrar en la columna "%" o "Base"
                    const visualBase = c.modo === 'porcentaje' ? '-' : c.valor;
                    const visualVar = c.modo === 'porcentaje' ? c.valor + '%' : (c.modo === 'monto' ? '$' : 'u');

                    filasHTML += `
                        <tr>
                            <td>${c.nombre}</td>
                            <td class="text-center">${visualBase}</td>
                            <td class="text-center">${visualVar}</td>
                            <td class="text-right">${colRemun}</td>
                            <td class="text-right">${colDesc}</td>
                            <td class="text-right">${colNoRemun}</td>
                        </tr>`;
                });
            } catch (e) { console.error("Error en conceptos:", e); }

            let totalNeto = (totalRemun + totalNoRemun) - totalDesc;

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

                <table style="margin-top:5px;">
                    <tr class="bg-gray"><td>Nombre y Apellido</td><td>Fecha Ingreso</td><td>CUIL</td><td>Caja de Ahorro</td><td>Sueldo Básico</td></tr>
                    <tr class="text-center"><td>${emp[1]}</td><td>${emp[3]}</td><td>${emp[2]}</td><td>${banco}</td><td>$ ${brutoValue.toLocaleString('es-AR')}</td></tr>
                </table>

                <table>
                    <tr class="bg-gray"><td>Fecha Depósito</td><td>Banco</td><td>Período Liquidado</td><td>Calificación</td></tr>
                    <tr class="text-center"><td>${fechaPago}</td><td>${banco}</td><td>${periodo}</td><td>${emp[4] || 'Administración'}</td></tr>
                </table>

                <table class="tabla-conceptos" style="margin-top:5px;">
                    <tr class="bg-gray">
                        <td style="width: 40%;">Conceptos</td><td style="width: 8%;">Base</td><td style="width: 8%;">% / Unid</td>
                        <td style="width: 14%;">Remun.</td><td style="width: 14%;">Desc.</td><td style="width: 16%;">No Remun.</td>
                    </tr>
                    ${filasHTML}
                    <tr class="relleno-lineas border-bottom"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                </table>

                <table>
                    <tr>
                        <td rowspan="3" style="width:56%; border:none; font-size:7pt; vertical-align:top; padding-top:5px;">
                            <strong>PERÍODO:</strong> ${periodo}
                        </td>
                        <td class="bg-gray" style="width:24%;">Total Remun.</td>
                        <td class="text-right" style="width:20%;">$ ${totalRemun.toLocaleString('es-AR')}</td>
                    </tr>
                    <tr>
                        <td class="bg-gray">Total No Remun.</td>
                        <td class="text-right">$ ${totalNoRemun.toLocaleString('es-AR')}</td>
                    </tr>
                    <tr>
                        <td class="bg-gray">Total Retenc.</td>
                        <td class="text-right">$ ${totalDesc.toLocaleString('es-AR')}</td>
                    </tr>
                    <tr>
                        <td style="border:none;"></td>
                        <td class="bg-gray" style="font-size:10pt;">TOTAL NETO</td>
                        <td class="text-right" style="font-size:10pt; font-weight:bold; background:#eee;">$ ${totalNeto.toLocaleString('es-AR')}</td>
                    </tr>
                </table>

                <table style="margin-top:10px; border:none;">
                    <tr>
                        <td style="width: 60%; border:none;">
                            <div style="font-weight:bold; font-size:8pt;">SON: ${totalNeto.toLocaleString('es-AR')} PESOS</div>
                            <div class="texto-legal">Art. 12 Ley 17.250: Declaro bajo juramento que los aportes y contribuciones con destino a los organismos de la Seguridad Social correspondientes a los períodos liquidados fueron depositados.</div>
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
function actualizarPlaceholderValor() {
    const modo = document.getElementById('con-modo').value;
    const input = document.getElementById('con-valor');
    const label = document.getElementById('label-con-valor');
    
    if (!input || !label) return; // Seguridad por si no cargó el DOM

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
// --- AGREGAR CONCEPTO SIMPLE ---
function agregarConceptoSimple() {
    const nombre = document.getElementById('con-nombre').value;
    const tipo = document.getElementById('con-tipo').value;
    const modo = document.getElementById('con-modo').value; // porcentaje, monto, unidad
    const valor = document.getElementById('con-valor').value;

    if (!nombre || !valor) return alert("Completá los datos");

    conceptosTemporales.push({
        nombre: nombre.toUpperCase(),
        tipo: tipo,
        modo: modo,
        valor: parseFloat(valor),
        esCombinado: false,
        indicesBase: [] 
    });

    document.getElementById('con-nombre').value = "";
    document.getElementById('con-valor').value = "";
    renderizarConceptosTemporales();
}

// --- CREAR EL CONCEPTO COMBINADO ---
function crearConceptoCombinado() {
    const nombre = document.getElementById('comb-nombre').value;
    const tipo = document.getElementById('comb-tipo').value;
    const modo = document.getElementById('comb-modo').value;
    const valor = document.getElementById('comb-valor').value;
    
    const seleccionados = [];
    conceptosTemporales.forEach((_, index) => {
        const check = document.getElementById(`base-${index}`);
        if (check && check.checked) seleccionados.push(index);
    });

    if (!nombre || !valor || seleccionados.length === 0) {
        return alert("Poné nombre, valor y tildá al menos un concepto base.");
    }

    conceptosTemporales.push({
        nombre: nombre.toUpperCase() + " (COMB)",
        tipo: tipo,
        modo: modo,
        valor: parseFloat(valor),
        esCombinado: true,
        indicesBase: seleccionados
    });

    document.getElementById('comb-nombre').value = "";
    document.getElementById('comb-valor').value = "";
    renderizarConceptosTemporales();
}

// --- RENDERIZAR TODO ---
function renderizarConceptosTemporales() {
    const lista = document.getElementById('lista-conceptos-gremio');
    const base = document.getElementById('lista-conceptos-base');
    if (!lista || !base) return;

    lista.innerHTML = conceptosTemporales.map((c, index) => {
        // Determinamos el símbolo visual
        const simbolo = c.modo === 'porcentaje' ? '%' : (c.modo === 'monto' ? '$' : 'u');
        const valorVisual = c.modo === 'monto' ? `${simbolo}${c.valor}` : `${c.valor}${simbolo}`;

        return `
        <div class="col-md-4">
            <div class="p-2 border rounded ${c.esCombinado ? 'bg-warning-subtle' : 'bg-white'} shadow-sm position-relative">
                <button type="button" class="btn-close position-absolute top-0 end-0 m-1" style="font-size: 0.5rem;" onclick="eliminarConceptoTemporal(${index})"></button>
                <div class="fw-bold small text-uppercase">${c.nombre}</div>
                <div class="text-muted" style="font-size: 0.6rem;">${c.tipo}: ${valorVisual}</div>
            </div>
        </div>`;
    }).join('');

    base.innerHTML = conceptosTemporales.map((c, index) => `
        <div class="form-check form-check-inline border rounded px-2 bg-white shadow-xs">
            <input class="form-check-input" type="checkbox" id="base-${index}">
            <label class="form-check-label small fw-bold" for="base-${index}">${c.nombre}</label>
        </div>
    `).join('');
    
    if (conceptosTemporales.length === 0) base.innerHTML = '<span class="text-muted small">No hay conceptos básicos.</span>';
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
    // 1. Cargamos los datos básicos en los inputs del modal
    // Usamos decodeURIComponent por si el nombre tiene espacios o tildes
    document.getElementById('gre-nombre').value = decodeURIComponent(nombre);
    document.getElementById('gre-actividad').value = decodeURIComponent(actividad);

    // 2. Limpiamos y cargamos las categorías y conceptos
    try {
        categoriasTemporales = JSON.parse(decodeURIComponent(catsJson));
        conceptosTemporales = JSON.parse(decodeURIComponent(consJson));
    } catch (e) {
        console.error("Error al parsear datos del gremio:", e);
        categoriasTemporales = [];
        conceptosTemporales = [];
    }

    // 3. Refrescamos las listas visuales y los checkboxes del Paso 5
    renderizarCategoriasTemporales();
    renderizarConceptosTemporales(); // Esta ya actualiza los checkboxes de combinación

    // 4. Abrimos el modal manualmente
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
// Variable para guardar los IDs de los conceptos base seleccionados
let conceptosBaseSeleccionados = [];

// Función para actualizar los checkboxes en el modal
function actualizarCheckboxesBase() {
    const contenedor = document.getElementById('lista-conceptos-base');
    if (!contenedor) return;

    // Si no hay nada, mostramos el mensaje de ayuda
    if (conceptosTemporales.length === 0) {
        contenedor.innerHTML = '<span class="text-muted small italic">Agregá primero un concepto básico para poder combinarlo.</span>';
        return;
    }

    // Si hay conceptos, dibujamos los checkboxes
    contenedor.innerHTML = conceptosTemporales.map((c, index) => `
        <div class="form-check form-check-inline bg-white border rounded px-2 py-1 shadow-sm" style="cursor: pointer;">
            <input class="form-check-input" type="checkbox" value="${index}" id="base-${index}">
            <label class="form-check-label small fw-bold" for="base-${index}" style="cursor: pointer;">
                ${c.nombre}
            </label>
        </div>
    `).join('');
}

// Modificamos la función de agregar concepto
// Cambiamos el nombre de agregarConceptoSimple a agregarConceptoTemporal
function agregarConceptoTemporal() { 
    const nombre = document.getElementById('con-nombre').value;
    const tipo = document.getElementById('con-tipo').value;
    const modo = document.getElementById('con-modo').value; 
    const valor = document.getElementById('con-valor').value;

    if (!nombre || !valor) return alert("Completá los datos");

    conceptosTemporales.push({
        nombre: nombre.toUpperCase(),
        tipo: tipo,
        modo: modo,
        valor: parseFloat(valor),
        esCombinado: false,
        indicesBase: [] 
    });

    document.getElementById('con-nombre').value = "";
    document.getElementById('con-valor').value = "";
    renderizarConceptosTemporales();
}
async function prepararModalEmpleado() {
    const selectGremio = document.getElementById('empl-gremio');
    if (!selectGremio) return;

    selectGremio.innerHTML = '<option value="">Cargando gremios...</option>';

    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=gremios&t=${Date.now()}`);
        const gremios = await resp.json();

        // El primer campo es el nombre, el segundo la actividad, el tercero categorías JSON y el cuarto conceptos JSON
        selectGremio.innerHTML = '<option value="">-- Seleccione un Gremio --</option>' + 
            gremios.map(g => `
                <option value="${g[0]}" 
                        data-cats="${encodeURIComponent(g[2])}" 
                        data-cons="${encodeURIComponent(g[3])}">
                    ${g[0].toUpperCase()}
                </option>`).join('');

    } catch (e) {
        console.error("Error cargando gremios:", e);
        selectGremio.innerHTML = '<option value="">Error al cargar gremios</option>';
    }
}
// Dentro de tu script.js, cuando renderices las opciones en el empleado:
function actualizarOpcionesGremioEmpleado() {
    const selectGremio = document.getElementById('empl-gremio');
    const optionSeleccionada = selectGremio.options[selectGremio.selectedIndex];
    const contenedor = document.getElementById('configuracion-gremio-empleado');

    if (!optionSeleccionada || !optionSeleccionada.value) {
        contenedor.innerHTML = '<p class="text-muted small italic mb-0">Seleccione un gremio para ver los cargos y conceptos.</p>';
        return;
    }

    try {
        // Recuperamos las categorías y conceptos del gremio
        const categorias = JSON.parse(decodeURIComponent(optionSeleccionada.dataset.cats));
        const conceptos = JSON.parse(decodeURIComponent(optionSeleccionada.dataset.cons));

        let html = `
            <div class="row g-2 mb-3">
                <div class="col-md-12">
                    <label class="xs-label mb-1 text-primary">Cargo / Categoría del Gremio</label>
                    <select id="empl-categoria" class="form-select form-select-sm fw-bold border-primary bg-light">
                        <option value="">-- Seleccionar Cargo --</option>
                        ${categorias.map(c => `<option value="${c.valor}">${c.nombre} ($${parseFloat(c.valor).toLocaleString('es-AR')})</option>`).join('')}
                    </select>
                </div>
            </div>

            <label class="xs-label mb-2 text-success">Conceptos de Liquidación (Tildá los que correspondan)</label>
            <div class="row g-2">
                ${conceptos.map((c, i) => {
                    // Lógica para determinar el símbolo visual según el modo
                    const simbolo = c.modo === 'porcentaje' ? '%' : (c.modo === 'monto' ? '$' : 'u');
                    const valorFormateado = c.modo === 'monto' ? `${simbolo}${c.valor}` : `${c.valor}${simbolo}`;
                    
                    return `
                    <div class="col-md-6">
                        <div class="form-check border rounded p-2 bg-white small shadow-xs h-100">
                            <input class="form-check-input check-concepto-emp" type="checkbox" 
                                   value='${JSON.stringify(c)}' 
                                   id="cep-${i}" checked>
                            <label class="form-check-label fw-bold d-block" for="cep-${i}">
                                ${c.nombre} 
                                <br><small class="text-muted">${c.tipo} (${valorFormateado}) ${c.esCombinado ? '✨' : ''}</small>
                            </label>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;

        contenedor.innerHTML = html;

    } catch (e) {
        console.error("Error al procesar datos del gremio:", e);
        contenedor.innerHTML = '<div class="alert alert-danger small">Error al cargar la configuración del gremio.</div>';
    }
}
// Agregá esto a tu script.js
function abrirModalEmpleado() {
    // Resetear el formulario para que esté limpio
    const form = document.getElementById('form-empleado');
    if (form) form.reset();
    
    // Limpiar el contenedor de conceptos dinámicos
    const contenedor = document.getElementById('configuracion-gremio-empleado');
    if (contenedor) contenedor.innerHTML = "";

    // Cargar los gremios en el select antes de mostrar el modal
    prepararModalEmpleado(); 

    const modal = new bootstrap.Modal(document.getElementById('modalEmpleado'));
    modal.show();
}
async function prepararEdicionEmpleado(cuil) {
    // 1. Buscamos los datos del empleado en el caché
    const emp = cacheEmpleados.find(e => e[2].toString() === cuil.toString());
    if (!emp) return;

    // 2. Abrimos el modal y cargamos los gremios primero
    await prepararModalEmpleado(); 

    // 3. Llenamos los datos básicos
    document.getElementById('empl-legajo').value = emp[0];
    document.getElementById('empl-nombre').value = emp[1];
    document.getElementById('empl-cuil').value = emp[2];
    document.getElementById('empl-ingreso').value = emp[3];
    document.getElementById('empl-tarea').value = emp[4];
    
    // 4. Seleccionamos su gremio y disparamos el cambio para ver conceptos
    const selectGremio = document.getElementById('empl-gremio');
    selectGremio.value = emp[10]; // Asumiendo que el gremio está en la columna 10
    
    actualizarOpcionesGremioEmpleado(); // Esto dibuja los checks

    // 5. Marcamos los checks según lo que el empleado ya tenía grabado
    try {
        const conceptosGuardados = JSON.parse(emp[11]); // Asumiendo columna 11
        conceptosGuardados.forEach(cGuardado => {
            // Buscamos el check que coincida con el nombre del concepto y lo marcamos
            document.querySelectorAll('.check-concepto-emp').forEach(check => {
                const cCheck = JSON.parse(check.value);
                if (cCheck.nombre === cGuardado.nombre) {
                    check.checked = true;
                }
            });
        });
    } catch (e) { console.warn("El empleado no tenía conceptos previos o formato inválido"); }

    new bootstrap.Modal(document.getElementById('modalEmpleado')).show();
}
async function editarEmpleado(cuil) {
    // 1. Buscamos el empleado en el cache que ya cargamos
    // em[2] es el CUIL según tu función de carga
    const empleado = cacheEmpleados.find(em => em[2].toString().trim() === cuil.toString().trim());
    
    if (!empleado) {
        alert("No se encontró el empleado localmente.");
        return;
    }

    // 2. Abrir el modal y cargar gremios
    await prepararModalEmpleado();

    // 3. Llenar los campos básicos (según los índices de tu hoja)
    document.getElementById('empl-legajo').value = empleado[0] || "";
    document.getElementById('empl-nombre').value = empleado[1] || "";
    document.getElementById('empl-cuil').value = empleado[2] || "";
    document.getElementById('empl-ingreso').value = empleado[3] || "";
    document.getElementById('empl-tarea').value = empleado[4] || "";

    // 4. Seleccionar el gremio (asumiendo que está en el índice 10 según el Apps Script)
    const selectGremio = document.getElementById('empl-gremio');
    if (empleado[10]) {
        selectGremio.value = empleado[10];
        // Disparar manualmente el cambio para que cargue categorías y conceptos
        actualizarOpcionesGremioEmpleado();
        
        // 5. Esperar un momento a que se cree el HTML de categorías para asignar la correcta
        setTimeout(() => {
            const selectCat = document.getElementById('empl-categoria');
            if (selectCat && empleado[5]) { // Índice 5 es el básico/categoría
                selectCat.value = empleado[5];
            }
        }, 150);
    }

    // 6. Mostrar el modal (usando Bootstrap)
    const modalElement = document.getElementById('modalEmpleado');
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modal.show();
}
async function eliminarEmpleado(cuil) {
    if (!confirm(`¿Estás seguro de eliminar al empleado con CUIL ${cuil}?`)) return;

    try {
        const datos = {
            action: 'eliminarEmpleado', // Asegúrate que tu doPost tenga este caso
            cuil: cuil
        };

        const resp = await fetch(URL_WEB_APP, {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        const texto = await resp.text();
        if (texto === "OK") {
            alert("Empleado eliminado");
            // Recargar la tabla (usamos la variable global del CUIT de la empresa actual)
            cargarEmpleadosEmpresa(cuitEmpresaActiva); 
        } else {
            alert("Error: " + texto);
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión al eliminar.");
    }
}