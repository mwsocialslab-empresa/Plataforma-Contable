/* ============================================================
   🔹 SCRIPT.JS: GESTIÓN DE SUELDOS, EMPRESAS Y EMPLEADOS
   ============================================================ */

const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbyTggvQ_IL4elXOv9w53kYWbucG9UbUJ0Kota_ZjD8JgN9SC3lCOqRTHoUBCq_7x8zpVw/exec';
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
    if (target) {
        target.classList.remove('d-none');
    }
    const nav = document.getElementById('menuNav');
    if (nav?.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(nav) || new bootstrap.Collapse(nav);
        bsCollapse.hide();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --- GESTIÓN DE EMPRESAS --- */
async function cargarEmpresas() {
    const tabla = document.getElementById('tabla-empresas');
    if (!tabla) return;
    tabla.innerHTML = '<tr><td colspan="10" class="text-center py-3">Cargando...</td></tr>';

    try {
        const resp = await fetch(`${URL_WEB_APP}?action=leer&t=${Date.now()}`);
        const datos = await resp.json();
        tabla.innerHTML = ''; 
        
        if (!datos || !datos.length) {
            tabla.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-3">No hay empresas.</td></tr>';
            return;
        }

        datos.forEach(emp => {
            tabla.innerHTML += `
                <tr class="border-bottom">
                    <td class="fw-bold text-primary" style="cursor:pointer" onclick="verDetalleEmpresa('${emp[2]}')">${emp[0]}</td>
                    <td>${emp[2]}</td>
                    <td>${emp[1]}</td>
                    <td>${emp[9] || '-'}</td>
                    <td class="text-center">${emp[3] || '-'}</td>
                    <td class="text-center">${emp[4] || '-'}</td>
                    <td class="text-center">${emp[5] || '-'}</td>
                    <td class="text-center">${emp[7] || '-'}</td>
                    <td class="fw-bold">$${emp[8] || '0'}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-warning border-0" onclick="prepararEdicionEmpresa('${emp[2]}')"><i class="bi bi-pencil-square"></i></button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="eliminarEmpresa('${emp[2]}')"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
        });
    } catch (e) { tabla.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Error de conexión.</td></tr>'; }
}

async function verDetalleEmpresa(cuit) {
    cuitEmpresaActiva = cuit;
    try {
        const resp = await fetch(`${URL_WEB_APP}?action=leer&t=${Date.now()}`);
        const datos = await resp.json();
        const emp = datos.find(e => e[2].toString().replace(/\D/g, '') === cuit.replace(/\D/g, ''));

        if (emp) {
            document.getElementById('cabecera-empresa-detalle').innerHTML = `
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h2 class="fw-bold mb-1 text-warning">${emp[0]}</h2>
                        <p class="mb-0 opacity-75">
                            <i class="bi bi-card-text me-2"></i>CUIT: <strong>${emp[2]}</strong> | 
                            <i class="bi bi-geo-alt me-2"></i>${emp[1]}
                        </p>
                    </div>
                    <div class="col-md-4 text-md-end mt-3 mt-md-0">
                        <button class="btn btn-outline-light btn-sm rounded-pill px-3" onclick="mostrarSeccion('empresas')">
                            <i class="bi bi-arrow-left"></i> VOLVER AL LISTADO
                        </button>
                    </div>
                </div>`;
            mostrarSeccion('detalle-empresa');
            cargarEmpleadosEmpresa(cuit);
        }
    } catch (e) { console.error("Error en detalle:", e); }
}

/* --- GESTIÓN DE EMPLEADOS --- */

async function cargarEmpresas() {
    const tabla = document.getElementById('tabla-empresas');
    if (!tabla) return;
    tabla.innerHTML = '<tr><td colspan="10" class="text-center py-3">Cargando empresas...</td></tr>';

    // Función interna para limpiar el formato de fecha
    const formatearFecha = (str) => {
        if (!str || str === '-') return '-';
        // Si contiene la "T", es un formato ISO de Google Sheets
        if (typeof str === 'string' && str.includes('T')) {
            const soloFecha = str.split('T')[0]; // Nos quedamos con YYYY-MM-DD
            const [anio, mes, dia] = soloFecha.split('-');
            return `${dia}/${mes}/${anio}`; // Devolvemos DD/MM/YYYY
        }
        return str;
    };

    try {
        const resp = await fetch(`${URL_WEB_APP}?action=leer&t=${Date.now()}`);
        const datos = await resp.json();
        
        if (datos.error) throw new Error(datos.error);

        tabla.innerHTML = ''; 
        if (!datos.length) {
            tabla.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-3">No hay empresas registradas.</td></tr>';
            return;
        }

        datos.forEach(emp => {
            // Aplicamos el formato a cada columna de fecha antes de insertar el HTML
            const pDepo = formatearFecha(emp[3]);
            const uDepo = formatearFecha(emp[4]);
            const abonado = formatearFecha(emp[5]);
            const fPago = formatearFecha(emp[7]);

            tabla.innerHTML += `
                <tr class="border-bottom">
                    <td class="fw-bold text-primary" style="cursor:pointer" onclick="verDetalleEmpresa('${emp[2]}')">${emp[0]}</td>
                    <td>${emp[2]}</td>
                    <td>${emp[1]}</td>
                    <td>${emp[9] || '-'}</td>
                    <td class="text-center">${pDepo}</td>
                    <td class="text-center">${uDepo}</td>
                    <td class="text-center">${abonado}</td>
                    <td class="text-center">${fPago}</td>
                    <td class="fw-bold">$${emp[8] || '0'}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-warning border-0" onclick="prepararEdicionEmpresa('${emp[2]}')"><i class="bi bi-pencil-square"></i></button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="eliminarEmpresa('${emp[2]}')"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
        });
    } catch (e) { 
        console.error(e);
        tabla.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Error: ${e.message}</td></tr>`; 
    }
}
// --- FUNCIÓN PARA LISTAR EMPLEADOS DE UNA EMPRESA ---
async function cargarEmpleadosEmpresa(cuit) {
    const tabla = document.getElementById('tabla-empleados-cuerpo');
    if(!tabla) return;
    tabla.innerHTML = '<tr><td colspan="5" class="text-center">Cargando empleados...</td></tr>';

    try {
        const resp = await fetch(`${URL_WEB_APP}?tabla=empleados&t=${Date.now()}`);
        const datos = await resp.json();
        
        // Filtramos solo los empleados que pertenecen a este CUIT
        const filtrados = datos.filter(emp => emp[9]?.toString().replace(/\D/g, '') === cuit.toString().replace(/\D/g, ''));
        
        tabla.innerHTML = '';
        if (filtrados.length === 0) {
            tabla.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay empleados registrados para esta empresa.</td></tr>';
            return;
        }

        filtrados.forEach(emp => {
            tabla.innerHTML += `
                <tr>
                    <td class="fw-bold text-muted">#${emp[0]}</td>
                    <td class="fw-bold">${emp[1]}</td>
                    <td>${emp[2]}</td>
                    <td><span class="badge bg-light text-dark border">${emp[4]}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-light border"><i class="bi bi-eye"></i></button>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error("Error al cargar empleados:", e);
        tabla.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar empleados.</td></tr>';
    }
}
/* --- FUNCIÓN CORREGIDA: ABRIR MODAL CON LEGAJO AUTOMÁTICO --- */

async function abrirModalEmpleado() {
    // 1. Verificación de seguridad: ¿Hay una empresa seleccionada?
    if (!cuitEmpresaActiva) {
        alert("Por favor, selecciona una empresa primero.");
        return;
    }

    const formulario = document.getElementById('form-empleado');
    const inputLegajo = document.getElementById('empl-legajo');
    const campoVinculo = document.getElementById('emp-cuit-vinculo');
    
    // 2. Limpiar el formulario y preparar el campo de legajo
    if (formulario) formulario.reset();

    if (inputLegajo) {
        inputLegajo.value = "Cargando..."; // Cambiado a "Cargando" para mayor claridad
        inputLegajo.disabled = true;       // Evita que el usuario escriba mientras carga
    }

    // 3. Seteamos el CUIT de vínculo inmediatamente
    if (campoVinculo) {
        campoVinculo.value = cuitEmpresaActiva;
    }

    // 4. Mostrar el modal de inmediato para mejorar la experiencia (UX)
    const modalElement = document.getElementById('modalEmpleado');
    const bsModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    bsModal.show();

    try {
        // 5. Petición al servidor (Apps Script)
        // Agregamos un timestamp (t=...) para evitar que el navegador use una respuesta vieja (cache)
        const resp = await fetch(`${URL_WEB_APP}?action=getSiguienteLegajo&cuit=${cuitEmpresaActiva}&t=${Date.now()}`);
        const data = await resp.json();
        
        // 6. Validación de la respuesta para evitar el "undefined"
        if (data && data.proximo !== undefined) {
            inputLegajo.value = data.proximo;
        } else {
            console.error("El servidor no devolvió el campo 'proximo':", data);
            inputLegajo.value = "Error";
        }

    } catch (e) {
        console.error("Error crítico al obtener legajo:", e);
        if (inputLegajo) inputLegajo.value = "Error de Red";
    }
}

document.getElementById('form-empleado')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    const body = {
        action: 'crearEmpleado',
        cuitEmpresa: cuitEmpresaActiva, // Usamos la variable global que seteamos al entrar al detalle
        legajo: document.getElementById('empl-legajo').value,
        empleado: document.getElementById('empl-nombre').value,
        cuil: document.getElementById('empl-cuil').value,
        fechaIngreso: document.getElementById('empl-ingreso').value,
        tarea: document.getElementById('empl-tarea').value,
        sueldoBruto: document.getElementById('empl-bruto').value,
        diasTrabajados: document.getElementById('empl-dias').value,
        sueldoBasico: document.getElementById('empl-basico').value
    };

    try {
        const resp = await fetch(URL_WEB_APP, { 
            method: 'POST', 
            body: JSON.stringify(body) 
        });
        const result = await resp.text();
        
        if(result.includes("OK")) {
            alert("✅ Empleado guardado con éxito.");
            bootstrap.Modal.getInstance(document.getElementById('modalEmpleado')).hide();
            e.target.reset();
            // Recargamos la lista de empleados inmediatamente
            cargarEmpleadosEmpresa(cuitEmpresaActiva);
        } else {
            alert("Error al guardar: " + result);
        }
        
    } catch (error) {
        alert("❌ Error de red al intentar guardar.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'GUARDAR EMPLEADO';
    }
});

/* --- GESTIÓN DE FORMULARIO EMPRESA --- */

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
    } catch (err) { console.error("Error al cargar edición:", err); }
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
        const resText = await resp.text();
        
        if (resText.includes("OK")) {
            bootstrap.Modal.getInstance(document.getElementById('modalEmpresa')).hide();
            e.target.reset();
            editandoCuit = null;
            cargarEmpresas();
        } else { alert("Error del servidor: " + resText); }
    } catch (error) { alert("Error de red."); } finally { 
        btn.disabled = false; 
        btn.innerText = "GUARDAR CAMBIOS";
    }
});

async function eliminarEmpresa(cuit) {
    if (confirm(`¿Estás seguro de eliminar esta empresa y sus registros?`)) {
        try {
            await fetch(URL_WEB_APP, { 
                method: 'POST', 
                body: JSON.stringify({ action: 'eliminar', cuit }) 
            });
            setTimeout(cargarEmpresas, 1000);
        } catch (e) { alert("Error al eliminar."); }
    }
}

function abrirModalEmpresa() {
    editandoCuit = null;
    const form = document.getElementById('form-empresa');
    if(form) form.reset();
    document.getElementById('tituloModalEmpresa').innerText = "REGISTRAR NUEVA EMPRESA";
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEmpresa')).show();
}