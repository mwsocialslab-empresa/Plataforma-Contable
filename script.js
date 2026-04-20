/* ============================================================
   🔹 SCRIPT.JS: GESTIÓN DE SUELDOS (VERSIÓN RESPETUOSA - REGLA DE ORO)
   ============================================================ */

const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbztKd6K8DRL3C0L_5_wEqjAC98bSIfQNh8ldGWt0cQwoIobNeSVaiGSYrlRCbmm4i58eg/exec';
let editandoCuit = null;
let cuitEmpresaActiva = null;
let cacheEmpresas = []; 
let cacheEmpleados = []; 
let cacheGremios = [];
const ALICUOTAS_LEY = {
    "Jubilación": 11,
    "Ley 19032": 3,
    "Obra Social": 3,
    "Cuota Sindical": 2 // Este puede variar según el gremio
};

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
        
        // 1. Obtenemos la respuesta como texto primero para ver qué hay adentro
        const textoRespuesta = await resp.text();

        // 2. Si el texto empieza con "Error", lo mostramos para saber qué falta en Google
        if (textoRespuesta.startsWith("Error") || textoRespuesta.startsWith("ERROR")) {
            console.error("Detalle del error en Google Apps Script:", textoRespuesta);
            alert("Google dice: " + textoRespuesta);
            return;
        }

        // 3. Si no hay error, intentamos convertir a JSON
        cacheEmpresas = JSON.parse(textoRespuesta);
        renderizarTablaEmpresas();

    } catch (e) { 
        console.error("Error de conexión o de formato:", e); 
    }
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
                    // 1. Si es nulo, vacío o tiene caracteres de "vacío" del Excel, devolvemos nada
                    if (!fechaStr || fechaStr === '-' || fechaStr === '0') return '';

                    // 2. Convertimos a string por si Google nos manda un objeto Date
                    let str = fechaStr.toString();

                    // 3. Si viene con formato ISO (ej: 2024-04-14T00:00:00Z), nos quedamos con la parte de la fecha
                    let fechaLimpia = str.includes('T') ? str.split('T')[0] : str;

                    // 4. Si el input es de tipo "month" (YYYY-MM), recortamos a 7 caracteres
                    if (esMes && fechaLimpia.length > 7) {
                        return fechaLimpia.substring(0, 7);
                    }
                    
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
    }

    cuerpo.innerHTML = '<tr><td colspan="4" class="text-center">Cargando empleados...</td></tr>';

    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empleados&t=${Date.now()}`);
        const todos = await resp.json();
        
        // REGLA DE ORO: Guardamos en cache para la liquidación
        cacheEmpleados = todos; 

        // Filtramos: em[9] es el CUIT de la empresa empleadora
        const filtrados = todos.filter(em => {
            if (!em[9]) return false;
            return em[9].toString().replace(/\D/g, '') === cuit.toString().replace(/\D/g, '');
        });
        
        cuerpo.innerHTML = '';

        if (filtrados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay empleados en esta empresa.</td></tr>';
            return;
        }

        filtrados.forEach(em => {
            const tr = document.createElement('tr');
            
            // CORRECCIÓN DE ÍNDICES SEGÚN TU CONSOLA:
            // em[1] = Nombre | em[2] = CUIL real
            const nombre = em[1] || "Sin Nombre";
            const cuilReal = em[2] ? em[2].toString().trim() : "S/C";
            const cargo = em[4] || 'Sin Cargo';

            tr.setAttribute('data-cuil', cuilReal);

            tr.innerHTML = `
                <td class="fw-bold">${nombre}</td>
                <td>${cuilReal}</td>
                <td><span class="badge bg-light text-dark border">${cargo}</span></td>
                <td class="text-end pe-3">
                    <div class="d-flex align-items-center justify-content-end gap-3">
                        <button class="btn btn-sm btn-outline-secondary border-0" onclick="verFichaEmpleado('${cuilReal}')"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="eliminarEmpleado('${cuilReal}')"><i class="bi bi-trash"></i></button>
                        
                        <input type="checkbox" 
                               class="form-check-input check-empleado d-none" 
                               data-cuil="${cuilReal}" 
                               value="${cuilReal}">
                    </div>
                </td>`;
            cuerpo.appendChild(tr);
        });
    } catch (e) { 
        console.error("Error al cargar empleados:", e);
        cuerpo.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar datos.</td></tr>';
    }
}

function procesarEliminarEmpleado(ss, cuil) {
  const sheetEmp = ss.getSheetByName(NOMBRE_HOJA_EMPLEADOS);
  if (!sheetEmp) return textResponse("ERROR_HOJA_NO_EXISTE");
  
  const rowsEmp = sheetEmp.getDataRange().getValues();
  // Limpiamos el CUIL que viene del buscador
  const cuilBusca = cuil.toString().replace(/\D/g, '').trim();
  
  for (let i = 1; i < rowsEmp.length; i++) {
    // Limpiamos también el CUIL que está en la celda del Excel antes de comparar
    const cuilCelda = rowsEmp[i][2].toString().replace(/\D/g, '').trim(); 
    
    if (cuilCelda === cuilBusca) {
      sheetEmp.deleteRow(i + 1);
      return textResponse("OK"); // Importante que devuelva OK para que el JS sepa que terminó
    }
  }
  return textResponse("ERROR_NO_ENCONTRADO: Busqué " + cuilBusca);
}
/* --- LIQUIDACIÓN E IMPRESIÓN --- */
function abrirPanelLiquidacion() {
    const seleccionados = [];
    
    // Capturamos los checks marcados
    const checks = document.querySelectorAll('.check-empleado:checked');
    
    if (checks.length === 0) {
        alert("Por favor, seleccioná al menos un empleado de la lista.");
        return;
    }

    checks.forEach(cb => {
        const cuilBusca = cb.getAttribute('data-cuil').toString().replace(/\D/g, '');
        const emp = cacheEmpleados.find(e => e[2].toString().replace(/\D/g, '') === cuilBusca);
        if (emp) seleccionados.push(emp);
    });

    const contenedor = document.getElementById('contenedor-conceptos');
    const cabecera = document.getElementById('cabecera-recibo');
    contenedor.innerHTML = "";
    cabecera.innerHTML = `<h6 class="mb-0 fw-bold text-center text-uppercase p-2">Previsualización de ${seleccionados.length} Recibo(s)</h6>`;

    seleccionados.forEach((emp) => {
        const bruto = parseFloat(emp[6]) || 0;
        let conceptos = [];
        try { conceptos = emp[10] ? JSON.parse(emp[10]) : []; } catch (e) { conceptos = []; }

        let totalHaberes = bruto;
        let totalDescuentos = 0;

        let filasConceptos = `
            <tr class="table-dark"><td colspan="4" class="fw-bold small">EMPLEADO: ${emp[1]}</td></tr>
            <tr>
                <td>SUELDO BÁSICO</td>
                <td class="text-center">-</td>
                <td class="text-end">${bruto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td class="text-end">0,00</td>
            </tr>`;

        conceptos.forEach(c => {
            const valorCalculado = bruto * (parseFloat(c.valor) / 100);
            // Normalizamos el tipo: 'R', 'Remunerativo' o 'Haberes'
            const esHaber = c.tipo.startsWith('R') || c.tipo.toLowerCase().includes('remunerativo') || c.tipo.toLowerCase().includes('haber');
            
            if (esHaber) {
                totalHaberes += valorCalculado;
                filasConceptos += `<tr><td>${c.nombre}</td><td class="text-center">${c.valor}%</td><td class="text-end">${valorCalculado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td><td class="text-end">0,00</td></tr>`;
            } else {
                totalDescuentos += valorCalculado;
                filasConceptos += `<tr><td>${c.nombre}</td><td class="text-center">${c.valor}%</td><td class="text-end">0,00</td><td class="text-end">${valorCalculado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td></tr>`;
            }
        });

        const neto = totalHaberes - totalDescuentos;
        filasConceptos += `
            <tr class="fw-bold border-top">
                <td colspan="2" class="text-end small">TOTALES:</td>
                <td class="text-end text-success">${totalHaberes.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td class="text-end text-danger">${totalDescuentos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            </tr>
            <tr class="bg-warning text-dark fw-bold">
                <td colspan="3" class="text-end">NETO A COBRAR:</td>
                <td class="text-end">$ ${neto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            </tr>
            <tr style="height: 20px;"><td colspan="4"></td></tr>`;

        contenedor.innerHTML += filasConceptos;
    });

    new bootstrap.Modal(document.getElementById('modalLiquidacion')).show();
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

function calcularLineaConcepto(nombre, basico, diasTrabajados) {
    const nombreNorm = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let remunerativo = 0;
    let descuento = 0;
    let porcentaje = "-";

    // Lógica para Remunerativos
    if (nombreNorm.includes("basico") || nombreNorm.includes("sueldo")) {
        // Cálculo proporcional a días trabajados
        remunerativo = (basico / 30) * diasTrabajados;
    } 
    
    // Lógica para Deducciones (si el nombre coincide con las alícuotas de ley)
    // Se calcula sobre el total remunerativo (en este caso simplificado sobre el básico proporcional)
    const subtotalRemun = (basico / 30) * diasTrabajados;
    
    if (ALICUOTAS_LEY[nombre]) {
        porcentaje = `${ALICUOTAS_LEY[nombre]}%`;
        descuento = subtotalRemun * (ALICUOTAS_LEY[nombre] / 100);
    }

    return {
        nombre,
        remunerativo: remunerativo > 0 ? remunerativo.toFixed(2) : "-",
        descuento: descuento > 0 ? descuento.toFixed(2) : "-",
        porcentaje
    };
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
        
        tabla.innerHTML = cacheGremios.map(g => {
            // Limpiamos los conceptos para mostrar solo los nombres en la tabla
            const conceptosLimpios = g[3] 
                ? g[3].split(',').map(c => c.split('|')[0]).join(', ') 
                : '-';

            return `<tr>
                <td class="fw-bold text-warning">${g[0]}</td>
                <td>${g[1]}</td>
                <td><small class="text-white-50">${conceptosLimpios}</small></td>
                <td class="text-end pe-3">
                    <button class="btn btn-sm btn-outline-warning border-0" onclick="prepararEdicionGremio('${g[0]}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
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

function actualizarChecksConceptos(gremioElegido) {
    const contenedor = document.getElementById('contenedor-conceptos-gremio');
    if (!contenedor) return;
    
    // Buscamos el gremio en el cache que ya tenés cargado
    const gFound = cacheGremios.find(g => g[0] === gremioElegido);
    
    if (gFound && gFound[3]) { 
        // gFound[3] tiene el string: "Sueldo|R|0,Jubilacion|D|11..."
        const conceptosRaw = gFound[3].split(',');
        
        contenedor.innerHTML = conceptosRaw.map(c => {
            const [nombre, tipo, valor] = c.split('|');
            // Guardamos el valor completo (con |) en el 'value' del check para no perder la info
            return `
                <div class="form-check form-check-inline bg-white border rounded px-3 py-1 mb-2 shadow-sm">
                    <input class="form-check-input check-concepto-fijo" type="checkbox" 
                           value="${c.trim()}" id="chk-${nombre}" checked>
                    <label class="form-check-label small fw-bold" for="chk-${nombre}">
                        ${nombre} <span class="badge ${tipo === 'R' ? 'bg-success' : 'bg-danger'} pb-0" style="font-size:0.6rem">${tipo}</span>
                    </label>
                </div>`;
        }).join('');
    } else {
        contenedor.innerHTML = `<span class="text-muted small italic">Este gremio no tiene conceptos definidos.</span>`;
    }
}
let conceptosTemporalesGremio = [];

function agregarConceptoALista() {
    const nombre = document.getElementById('nuevo-concepto-nombre').value;
    const tipo = document.getElementById('nuevo-concepto-tipo').value;
    const valor = document.getElementById('nuevo-concepto-valor').value;

    if (!nombre) return alert("Poné un nombre al concepto");

    const nuevo = { nombre, tipo, valor: valor || 0 };
    conceptosTemporalesGremio.push(nuevo);
    renderizarConceptosTemporales();
    
    // Limpiar inputs
    document.getElementById('nuevo-concepto-nombre').value = '';
    document.getElementById('nuevo-concepto-valor').value = '';
}

function renderizarConceptosTemporales() {
    const div = document.getElementById('lista-conceptos-dinamicos');
    div.innerHTML = conceptosTemporalesGremio.map((c, index) => `
        <span class="badge ${c.tipo === 'R' ? 'bg-success' : 'bg-danger'} me-1 mb-1">
            ${c.nombre} (${c.valor}${c.tipo === 'D' ? '%' : ''}) 
            <i class="bi bi-x-circle cursor-pointer" onclick="conceptosTemporalesGremio.splice(${index}, 1); renderizarConceptosTemporales();"></i>
        </span>
    `).join('');
}/* ============================================================
   🔹 GESTIÓN DE ENVÍO DE GREMIOS (NUEVO)
   ============================================================ */

document.getElementById('form-gremio').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Validar que haya al menos un concepto
    if (conceptosTemporalesGremio.length === 0) {
        alert("Por favor, agrega al menos un concepto (Sueldo, Jubilación, etc.)");
        return;
    }

    // 2. Convertimos el array de objetos a un texto formateado para el Excel
    // Formato: Nombre|Tipo|Valor (Ej: Jubilacion|D|11,Sueldo Basico|R|0)
    const conceptosCodificados = conceptosTemporalesGremio
        .map(c => `${c.nombre}|${c.tipo}|${c.valor}`)
        .join(',');

    const datos = {
        action: 'crearGremio',
        nombre: document.getElementById('gre-nombre').value,
        actividad: document.getElementById('gre-actividad').value,
        categorias: document.getElementById('gre-categorias').value,
        conceptos: conceptosCodificados
    };

    try {
        // Mostramos un mensaje de carga básico
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = "GUARDANDO...";
        btn.disabled = true;

        const resp = await fetch(URL_WEB_APP, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        
        const res = await resp.text();
        
        if (res.includes("OK")) {
            alert("Gremio guardado correctamente en la base de datos.");
            
            // Cerrar modal
            const modalEl = document.getElementById('modalGremio');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            // Limpiar todo
            e.target.reset();
            conceptosTemporalesGremio = []; 
            renderizarConceptosTemporales();
            
            // Refrescar la tabla de gremios para ver el nuevo
            if (typeof cargarGremios === "function") cargarGremios();
        } else {
            alert("Hubo un problema: " + res);
        }
        
        btn.innerText = originalText;
        btn.disabled = false;

    } catch (error) {
        console.error("Error:", error);
        alert("Error de conexión al guardar el gremio.");
    }
});
function abrirModalGremio() {
    // Resetear el formulario
    document.getElementById('form-gremio').reset();
    document.getElementById('tituloModalGremio').innerText = "NUEVO GREMIO";
    
    // REGLA DE ORO: Limpiar siempre la lista temporal al abrir
    conceptosTemporalesGremio = [];
    renderizarConceptosTemporales();
    
    const modal = new bootstrap.Modal(document.getElementById('modalGremio'));
    modal.show();
}
/* ============================================================
   🔹 GESTIÓN DE ENVÍO DE EMPLEADOS (NUEVO)
   ============================================================ */

document.getElementById('form-empleado')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Capturamos los conceptos marcados (con su formato Nombre|Tipo|Valor)
    const conceptosMarcados = Array.from(document.querySelectorAll('.check-concepto-fijo:checked'))
        .map(cb => cb.value)
        .join(',');

    // 2. Armamos el objeto con todos los campos del modal de empleado
    const datos = {
        action: 'crearEmpleado',
        legajo: document.getElementById('empl-legajo').value,
        nombre: document.getElementById('empl-nombre').value,
        cuil: document.getElementById('empl-cuil').value,
        ingreso: document.getElementById('empl-ingreso').value,
        gremio: document.getElementById('empl-gremio').value,
        tarea: document.getElementById('empl-tarea').value,
        bruto: document.getElementById('empl-bruto').value,
        dias: document.getElementById('empl-dias').value,
        basico: document.getElementById('empl-basico').value,
        conceptos: conceptosMarcados, // Aquí pasamos la nueva estructura
        cuitEmpresa: cuitEmpresaActiva // Variable global que ya tenés
    };

    try {
        const btn = e.target.querySelector('button[type="submit"]');
        btn.innerText = "GUARDANDO...";
        btn.disabled = true;

        const resp = await fetch(URL_WEB_APP, {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        const res = await resp.text();

        if (res.includes("OK")) {
            alert("✅ Empleado guardado correctamente.");
            bootstrap.Modal.getInstance(document.getElementById('modalEmpleado')).hide();
            e.target.reset();
            cargarEmpleadosEmpresa(cuitEmpresaActiva); // Refresca la tabla
        } else {
            alert("Error: " + res);
        }
        
        btn.innerText = "GUARDAR EMPLEADO";
        btn.disabled = false;

    } catch (error) {
        console.error("Error:", error);
        alert("Error de conexión al guardar el empleado.");
    }
});
function calcularLineaConceptoEstructurada(conceptoStr, basico, diasTrabajados) {
    // conceptoStr viene como "Jubilacion|D|11" o "Sueldo|R|0"
    const [nombre, tipo, valor] = conceptoStr.split('|');
    const alicuota = parseFloat(valor) || 0;
    
    let remunerativo = 0;
    let descuento = 0;
    let porcentaje = alicuota > 0 ? `${alicuota}%` : "-";

    // Proporcional del básico según días trabajados
    const basicoProporcional = (basico / 30) * diasTrabajados;

    if (tipo === 'R') {
        // Si es remunerativo y tiene porcentaje (ej: Presentismo 8.33%)
        if (alicuota > 0) {
            remunerativo = basicoProporcional * (alicuota / 100);
        } else {
            // Si es el Sueldo Básico (valor 0 o vacío)
            remunerativo = basicoProporcional;
        }
    } else if (tipo === 'D') {
        // Si es deducción (Jubilación, Obra Social, etc.)
        // Se calcula sobre el TOTAL Remunerativo (aquí simplificado sobre el proporcional)
        descuento = basicoProporcional * (alicuota / 100);
    }

    return {
        nombre,
        tipo,
        remunerativo: remunerativo > 0 ? remunerativo.toFixed(2) : "-",
        descuento: descuento > 0 ? descuento.toFixed(2) : "-",
        porcentaje
    };
}
// Ejemplo de cómo iterar los conceptos dentro de la generación del recibo
function generarFilasConceptos(empleadoSeleccionado) {
    const conceptosRaw = empleadoSeleccionado.conceptos.split(','); // "Sueldo|R|0,Jubilacion|D|11"
    const basico = parseFloat(empleadoSeleccionado.basico);
    const dias = parseInt(empleadoSeleccionado.dias) || 30;

    let htmlFilas = "";
    let totalRemu = 0;
    let totalDesc = 0;

    conceptosRaw.forEach(cStr => {
        const res = calcularLineaConceptoEstructurada(cStr, basico, dias);
        
        if (res.remunerativo !== "-") totalRemu += parseFloat(res.remunerativo);
        if (res.descuento !== "-") totalDesc += parseFloat(res.descuento);

        htmlFilas += `
            <tr>
                <td>${res.nombre}</td>
                <td class="text-center">${res.porcentaje}</td>
                <td class="text-end">${res.remunerativo}</td>
                <td class="text-end">${res.descuento}</td>
            </tr>`;
    });

    const neto = totalRemu - totalDesc;
    // Aquí retornarías las filas y los totales para armar el PDF
    return { htmlFilas, totalRemu, totalDesc, neto };
}
/* --- SOLUCIÓN ERROR CONSOLA --- */
function prepararEdicionGremio(nombreGremio) {
    const gremio = cacheGremios.find(g => g[0] === nombreGremio);
    if (!gremio) return;

    document.getElementById('tituloModalGremio').innerText = "EDITAR GREMIO";
    document.getElementById('gre-nombre').value = gremio[0];
    document.getElementById('gre-actividad').value = gremio[1] || "";
    document.getElementById('gre-categorias').value = gremio[2] || "";

    // Cargar los conceptos que ya tenía guardados para poder editarlos
    conceptosTemporalesGremio = [];
    if (gremio[3]) {
        const partes = gremio[3].split(',');
        partes.forEach(p => {
            const [nombre, tipo, valor] = p.split('|');
            conceptosTemporalesGremio.push({ nombre, tipo, valor });
        });
    }
    
    renderizarConceptosTemporales();
    new bootstrap.Modal(document.getElementById('modalGremio')).show();
}
/* --- FUNCIÓN PARA ABRIR MODAL DE EMPLEADO --- */
/* --- FUNCIÓN PARA ABRIR MODAL DE EMPLEADO --- */
async function abrirModalEmpleado() {
    const selectGremio = document.getElementById('empl-gremio');
    if (!selectGremio) return;

    // REGLA DE ORO: Si el cache está vacío, los buscamos antes de abrir
    if (cacheGremios.length === 0) {
        const resp = await fetch(`${URL_WEB_APP}?tabla=gremios&t=${Date.now()}`);
        cacheGremios = await resp.json();
    }

    selectGremio.innerHTML = '<option value="">Seleccione un gremio...</option>';
    cacheGremios.forEach(g => {
        let opt = document.createElement('option');
        opt.value = g[0];
        opt.textContent = g[0];
        selectGremio.appendChild(opt);
    });

    new bootstrap.Modal(document.getElementById('modalEmpleado')).show();
}

/* --- ESCUCHADOR DE CAMBIO DE GREMIO (Para cargar conceptos automáticamente) --- */
// Este bloque debe ir suelto al final del archivo para que siempre esté atento
document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'empl-gremio') {
        const gremioSeleccionado = e.target.value;
        actualizarChecksConceptos(gremioSeleccionado);
    }
});
function agregarConceptoLista() {
    const nombre = document.getElementById('nombre-concepto').value;
    const tipo = document.getElementById('tipo-concepto').value;
    const porcentaje = document.getElementById('porcentaje-concepto').value;

    if (!nombre || !porcentaje) {
        alert("Por favor, completá el nombre y el porcentaje");
        return;
    }

    // Aquí lo agregás a tu array o a la lista visual
    const nuevoConcepto = {
        nombre: nombre,
        tipo: tipo,
        valor: porcentaje // Guardamos el número (ej: 11)
    };

    console.log("Concepto agregado:", nuevoConcepto);

    // Limpiar campos para el siguiente
    document.getElementById('nombre-concepto').value = '';
    document.getElementById('porcentaje-concepto').value = '';
}
async function guardarCambiosEmpresa() {
    const datos = {
        action: 'editar', // Especificamos la acción
        empleador: document.getElementById('m-nombre').value,
        cuit: document.getElementById('m-cuit').value,
        banco: document.getElementById('m-banco').value,
        base: document.getElementById('m-base').value,
        direccion: document.getElementById('m-dir').value,
        periodo: document.getElementById('m-p-depo').value,
        fechaUltimoDepo: document.getElementById('m-f-depo').value,
        periodoAbonado: document.getElementById('m-p-abo').value,
        fechaPago: document.getElementById('m-f-pago').value,
        domicilio: document.getElementById('m-domicilio').value
    };

    try {
        const resp = await fetch(URL_WEB_APP, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        const res = await resp.text();
        if (res.includes("OK")) {
            alert("✅ Empresa actualizada");
            cargarEmpresas();
        }
    } catch (e) { console.error(e); }
}
function habilitarSeleccionLiquidacion() {
    // 1. Mostramos la columna del encabezado (el check "Todos")
    const th = document.getElementById('th-check-header');
    if (th) th.classList.remove('d-none');

    // 2. Mostramos todos los checks de los empleados
    const checks = document.querySelectorAll('.check-empleado');
    checks.forEach(cb => cb.classList.remove('d-none'));

    // 3. Cambiamos el botón de "Liquidar" para que ahora diga "Confirmar"
    const btn = document.querySelector('button[onclick="habilitarSeleccionLiquidacion()"]') 
             || document.querySelector('button[onclick="abrirPanelLiquidacion()"]');
    
    if (btn) {
        btn.innerHTML = '<i class="bi bi-check2-all me-1"></i> CONFIRMAR SELECCIÓN';
        btn.classList.replace('btn-warning', 'btn-success');
        btn.setAttribute('onclick', 'abrirPanelLiquidacion()');
    }
}
/* --- FUNCIONES FALTANTES PARA EMPRESAS --- */

function prepararEdicionEmpresa(cuit) {
    // Buscamos los datos en el cache que ya tenemos
    const emp = cacheEmpresas.find(e => e[2].toString().replace(/\D/g, '') === cuit.toString().replace(/\D/g, ''));
    if (emp) {
        // Usamos la misma función que ya tenés para ver el detalle, 
        // ya que esa función llena los inputs y permite editar
        verDetalleEmpresa(cuit);
    }
}

async function eliminarEmpresa(cuit) {
    if (!confirm(`¿Estás seguro de eliminar la empresa CUIT: ${cuit}? Se borrarán sus datos.`)) return;

    try {
        const resp = await fetch(URL_WEB_APP, {
            method: 'POST',
            body: JSON.stringify({ action: 'eliminar', cuit: cuit })
        });
        const res = await resp.text();
        if (res.includes("OK")) {
            alert("✅ Empresa eliminada");
            cargarEmpresas(); // Recargamos la lista
        } else {
            alert("Error al eliminar: " + res);
        }
    } catch (e) { console.error("Error:", e); }
}
// Aseguramos que la variable sea global
window.listaParaImprimir = [];

function abrirPanelLiquidacion() {
    const seleccionados = [];
    const checks = document.querySelectorAll('.check-empleado:checked');
    
    if (checks.length === 0) {
        alert("Por favor, seleccioná al menos un empleado.");
        return;
    }

    checks.forEach(cb => {
        const cuil = cb.getAttribute('data-cuil').toString().replace(/\D/g, '').trim();
        const emp = cacheEmpleados.find(e => e[2].toString().replace(/\D/g, '').trim() === cuil);
        if (emp) seleccionados.push(emp);
    });

    // Guardamos en la variable global
    window.listaParaImprimir = seleccionados;

    const contenedor = document.getElementById('contenedor-conceptos');
    const cabecera = document.getElementById('cabecera-recibo');
    
    cabecera.innerHTML = `<h5 class="text-center text-primary fw-bold p-2">RESUMEN</h5>`;
    contenedor.innerHTML = `
        <div class="p-3 text-white">
            <p class="bg-dark p-2 text-center">Vas a imprimir <strong>${seleccionados.length}</strong> recibo(s).</p>
            <ul class="list-group">
                ${seleccionados.map(emp => `<li class="list-group-item bg-dark text-white border-secondary small">${emp[1]}</li>`).join('')}
            </ul>
        </div>`;

    new bootstrap.Modal(document.getElementById('modalLiquidacion')).show();
}

function imprimirRecibo() {
    const seleccionados = window.listaParaImprimir;
    
    if (!seleccionados || seleccionados.length === 0) {
        alert("No hay datos para mostrar.");
        return;
    }

    const ventana = window.open('', '_blank');
    if (!ventana) {
        alert("El navegador bloqueó la ventana emergente. Por favor, permití los pop-ups.");
        return;
    }
    
    let contenidoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Recibos de Sueldo - MW SOCIALS</title>
        <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background-color: #fff; color: #333; }
            .recibo { 
                border: 2px solid #000; 
                padding: 25px; 
                margin-bottom: 40px; 
                page-break-after: always; 
                box-shadow: none;
            }
            .header { border-bottom: 2px solid #000; display: flex; justify-content: space-between; padding-bottom: 10px; margin-bottom: 15px; }
            .empresa-info { font-size: 14px; }
            .recibo-titulo { text-align: right; text-transform: uppercase; }
            .datos-empleado { background: #f9f9f9; padding: 10px; border: 1px solid #ccc; margin-bottom: 15px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { background: #eee; border: 1px solid #000; padding: 10px; text-align: left; text-transform: uppercase; }
            td { border: 1px solid #000; padding: 10px; }
            .text-end { text-align: right; }
            .neto-box { 
                background: #000; 
                color: #fff; 
                padding: 15px; 
                margin-top: 20px; 
                display: flex; 
                justify-content: space-between; 
                font-size: 18px; 
                font-weight: bold; 
            }
            .firmas { display: flex; justify-content: space-between; margin-top: 70px; }
            .firma-linea { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 12px; font-weight: bold; }
        </style>
    </head>
    <body>`;

    seleccionados.forEach(emp => {
        const bruto = parseFloat(emp[6]) || 0;
        let conceptos = [];
        try { conceptos = emp[10] ? JSON.parse(emp[10]) : []; } catch(e) { console.error("Error JSON:", e); }

        let tHaberes = bruto;
        let tDescuentos = 0;
        let filas = `<tr><td>01</td><td>SUELDO BÁSICO MENS.</td><td class="text-end">${bruto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td><td class="text-end">0,00</td></tr>`;

        conceptos.forEach(c => {
            const perc = parseFloat(c.valor) || 0;
            const val = bruto * (perc / 100);
            const tipo = (c.tipo || "").toLowerCase();
            
            // Verificamos si es Remunerativo o No Remunerativo
            if (tipo.includes('r') || tipo.includes('haber')) {
                tHaberes += val;
                filas += `<tr><td>-</td><td>${c.nombre}</td><td class="text-end">${val.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td><td class="text-end">0,00</td></tr>`;
            } else {
                tDescuentos += val;
                filas += `<tr><td>-</td><td>${c.nombre}</td><td class="text-end">0,00</td><td class="text-end">${val.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td></tr>`;
            }
        });

        contenidoHtml += `
        <div class="recibo">
            <div class="header">
                <div class="empresa-info">
                    <strong style="font-size: 20px;">MW SOCIALS</strong><br>
                    <span>Liquidación de Haberes</span>
                </div>
                <div class="recibo-titulo">
                    <strong>Recibo de Ley 20.744</strong><br>
                    <span>Periodo: Junio 2026</span>
                </div>
            </div>
            
            <div class="datos-empleado">
                <span><strong>EMPLEADO:</strong> ${emp[1]}</span>
                <span><strong>CUIL:</strong> ${emp[2]}</span>
                <span><strong>CARGO:</strong> ${emp[4] || 'Administrativo'}</span>
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="10%">Cód</th>
                        <th width="50%">Concepto / Descripción</th>
                        <th width="20%" class="text-end">Haberes</th>
                        <th width="20%" class="text-end">Descuentos</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>

            <div class="neto-box">
                <span>TOTAL NETO A COBRAR:</span>
                <span>$ ${(tHaberes - tDescuentos).toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
            </div>

            <div class="firmas">
                <div class="firma-linea">FIRMA EMPLEADOR</div>
                <div class="firma-linea">FIRMA EMPLEADO</div>
            </div>
        </div>`;
    });

    contenidoHtml += `
        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                }, 300);
            };
        </script>
    </body>
    </html>`;

    ventana.document.open();
    ventana.document.write(contenidoHtml);
    ventana.document.close();
}
async function eliminarEmpleado(cuil) {
    if (!confirm(`¿Estás seguro de eliminar al empleado con CUIL: ${cuil}?`)) return;

    try {
        const resp = await fetch(URL_WEB_APP, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'eliminarEmpleado', // Asegurate que en Apps Script se llame igual
                cuil: cuil 
            })
        });
        const res = await resp.text();
        if (res.includes("OK")) {
            alert("✅ Empleado eliminado");
            // Recargamos la tabla usando el CUIT que está en el input de la empresa
            const cuitActual = document.getElementById('emp-cuit')?.value;
            if(cuitActual) cargarEmpleadosEmpresa(cuitActual);
        } else {
            alert("Error al eliminar: " + res);
        }
    } catch (e) { console.error("Error:", e); }
}