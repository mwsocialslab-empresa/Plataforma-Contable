export default function handler(req, res) {
    // Estas variables las configuraremos en el Panel de Vercel (Variables de Entorno)
    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;

    const { user, pass } = req.body;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        res.status(200).json({ success: true, token: "ACCESO_AUTORIZADO" });
    } else {
        res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }
}