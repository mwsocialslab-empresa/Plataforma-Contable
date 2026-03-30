/* ==========================================
   🔹 CONFIGURACIÓN Y ESTADO
   ========================================== */
let empresas = [];
let empleados = [];
let gremios = [];

/* ==========================================
   🔹 NAVEGACIÓN
   ========================================== */
function mostrarSeccion(id) {
    // Ocultamos todas
    document.querySelectorAll('.seccion-app').forEach(sec => sec.classList.add('d-none'));
    
    // Mostramos la pedida
    const target = document.getElementById('sec-' + id);
    if (target) target.classList.remove('d-none');

    // Estética del Nav: Cerrar collapse en móviles
    const nav = document.getElementById('menuNav');
    if (nav?.classList.contains('show')) bootstrap.Collapse.getInstance(nav).hide();

    // Reset Scroll
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Funciones de apertura de modales (Placeholders para cuando hagamos los formularios)
function abrirModalEmpresa() { console.log("Abrir modal Empresa"); }
function abrirModalGremio() { console.log("Abrir modal Gremio"); }
function abrirModalEmpleado() { console.log("Abrir modal Empleado"); }

document.addEventListener("DOMContentLoaded", () => {
    mostrarSeccion('inicio');
});