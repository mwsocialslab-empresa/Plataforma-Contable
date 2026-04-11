/* ============================================================
   🔹 SCRIPT.JS: GESTIÓN DE SUELDOS (VERSIÓN RESPETUOSA - REGLA DE ORO)
   ============================================================ */

const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbyBKmyWpBfl8oh6eBP9BJm3fiHHXEsaa7RwaAtux7JQFljqOP9pd8IGLlRwXtLikKI5_w/exec';
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

    // Control del header de checks para liquidación
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
        // Filtramos por el CUIT de la empresa activa
        const filtrados = todos.filter(em => em[9]?.toString().replace(/\D/g, '') === cuit.toString().replace(/\D/g, ''));
        
        cuerpo.innerHTML = '';

        if (filtrados.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay empleados en esta empresa.</td></tr>';
            return;
        }

        filtrados.forEach(em => {
            const tr = document.createElement('tr');
            
            // MAPEO DE DATOS SEGUN TU EXCEL:
            // em[0]=Legajo, em[1]=Nombre, em[3]=CUIL, em[8]=Basico, em[10]=Conceptos (Nombre|Tipo|Valor)
            tr.setAttribute('data-legajo', em[0] || "S/N");
            tr.setAttribute('data-nombre', em[1] || "Sin Nombre");
            tr.setAttribute('data-cuil', em[3] || "");
            tr.setAttribute('data-basico', em[8] || "0");
            tr.setAttribute('data-conceptos', em[10] || ""); // AQUÍ ESTÁ EL PASO 4

            tr.innerHTML = `
                <td class="fw-bold">${em[1]}</td>
                <td>${em[3]}</td>
                <td><span class="badge bg-light text-dark border">${em[4] || 'Sin Cargo'}</span></td>
                <td class="text-end pe-3">
                    <div class="d-flex align-items-center justify-content-end gap-3">
                        <button class="btn btn-sm btn-outline-secondary border-0" onclick="verFichaEmpleado('${em[3]}')"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="eliminarEmpleado('${em[3]}')"><i class="bi bi-trash"></i></button>
                        <input type="checkbox" class="check-empleado d-none" value="${em[3]}">
                    </div>
                </td>`;
            cuerpo.appendChild(tr);
        });
    } catch (e) { 
        console.error("Error al cargar empleados:", e);
        cuerpo.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar datos.</td></tr>';
    }
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
function abrirModalEmpleado() {
    // 1. Limpiamos el formulario
    const form = document.getElementById('form-empleado');
    if (form) form.reset();

    // 2. Cargamos la lista de gremios en el select
    const selectGremio = document.getElementById('empl-gremio');
    if (selectGremio) {
        selectGremio.innerHTML = '<option value="">Seleccione un gremio...</option>';
        cacheGremios.forEach(g => {
            selectGremio.innerHTML += `<option value="${g[0]}">${g[0]}</option>`;
        });
    }

    // 3. Limpiamos el contenedor de conceptos
    const contenedorConceptos = document.getElementById('contenedor-conceptos-gremio');
    if (contenedorConceptos) {
        contenedorConceptos.innerHTML = '<span class="text-muted small italic">Seleccione un gremio para ver sus conceptos...</span>';
    }

    // 4. Mostramos el modal
    const modalEl = document.getElementById('modalEmpleado');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

/* --- ESCUCHADOR DE CAMBIO DE GREMIO (Para cargar conceptos automáticamente) --- */
// Este bloque debe ir suelto al final del archivo para que siempre esté atento
document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'empl-gremio') {
        const gremioSeleccionado = e.target.value;
        actualizarChecksConceptos(gremioSeleccionado);
    }
});