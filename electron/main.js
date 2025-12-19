import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json());

// =========================================================================
// 1. CONFIGURACIÓN DE CONEXIONES (USANDO TUS CREDENCIALES)
// =========================================================================

// CONEXIÓN A: ADQUISICIONES (Inventario - Solo Lectura)
const dbConfigAdquisiciones = {
    user: 'dideco',              // Tu usuario
    password: 'App_Dideco_25',   // Tu contraseña
    server: '192.168.2.12',
    database: 'Adquisiciones',
    options: { encrypt: false, trustServerCertificate: true }
};

// CONEXIÓN B: SOCIAL (Mantenedor Ayudas - Lectura/Escritura)
// Usamos LAS MISMAS credenciales, pero apuntando a la base de datos 'Social'
const dbConfigSocial = {
    user: 'dideco',              // Usamos el mismo usuario
    password: 'App_Dideco_25',   // Usamos la misma contraseña
    server: '192.168.2.12',    
    database: 'Social',          // <--- Aquí cambiamos la base de datos destino
    options: { 
        encrypt: false, 
        trustServerCertificate: true,
        instanceName: 'SANPEDRO' // Necesario para tu servidor específico
    }
};

// =========================================================================
// MÓDULO 1: MANTENEDOR DE AYUDAS (Usa BD 'Social')
// =========================================================================

// LEER (GET)
expressApp.get('/api/ayudas', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(dbConfigSocial);
        // Consulta a tu tabla nueva
        const result = await pool.request().query("SELECT * FROM Mantenedor_Beneficios ORDER BY Categoria, NombreItem");
        
        // Ordenar datos para el Frontend
        const agrupado = {};
        result.recordset.forEach(row => {
            if (!agrupado[row.Categoria]) agrupado[row.Categoria] = [];
            agrupado[row.Categoria].push({ id: row.Id, nombre: row.NombreItem });
        });
        res.json(agrupado);
    } catch (err) {
        console.error("Error conectando a BD Social:", err);
        // Si falla aquí, es posible que el usuario 'dideco' no tenga permisos en la BD 'Social'
        res.status(500).json({ error: "No se pudo conectar a la base de datos Social con el usuario 'dideco'" });
    } finally {
        if (pool) pool.close();
    }
});

// AGREGAR (POST)
expressApp.post('/api/ayudas/agregar', async (req, res) => {
    let pool;
    try {
        const { categoria, nombreItem } = req.body;
        pool = await sql.connect(dbConfigSocial);
        await pool.request()
            .input('cat', sql.NVarChar, categoria)
            .input('nom', sql.NVarChar, nombreItem)
            .query("INSERT INTO Mantenedor_Beneficios (Categoria, NombreItem) VALUES (@cat, @nom)");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// EDITAR (PUT)
expressApp.put('/api/ayudas/editar', async (req, res) => {
    let pool;
    try {
        const { id, nombreItem } = req.body;
        pool = await sql.connect(dbConfigSocial);
        await pool.request()
            .input('id', sql.Int, id)
            .input('nom', sql.NVarChar, nombreItem)
            .query("UPDATE Mantenedor_Beneficios SET NombreItem = @nom WHERE Id = @id");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// ELIMINAR (DELETE)
expressApp.delete('/api/ayudas/borrar/:id', async (req, res) => {
    let pool;
    try {
        const { id } = req.params;
        pool = await sql.connect(dbConfigSocial);
        await pool.request().input('id', sql.Int, id).query("DELETE FROM Mantenedor_Beneficios WHERE Id = @id");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});


// =========================================================================
// MÓDULO 2: INVENTARIO (Usa BD 'Adquisiciones' + Tu Consulta Específica)
// =========================================================================
expressApp.get('/api/sincronizar', async (req, res) => {
    let pool;
    try {
        console.log("--> Consultando Adquisiciones...");
        pool = await sql.connect(dbConfigAdquisiciones);
        const request = pool.request();
        
        const { year, oc } = req.query;

        // TUS FILTROS (Depto 24 y Sección 0)
        let whereConditions = [
            "DS.[Codigo_Departamento] IN (24)",
            "DS.[Codigo_Seccion] IN (0)"
        ];

        const hasOC = oc && oc.trim() !== '';
        if (hasOC) {
            const cleanOC = oc.replace(/['";]/g, '').trim(); 
            whereConditions.push(`(CAST(DS.[Numero_Orden_Compra] AS VARCHAR) LIKE '%${cleanOC}%' OR OCS.[Numero_Orden_Compra_Chile_Compras] LIKE '%${cleanOC}%')`);
        } else if (year && year !== 'all') {
            const yearNum = parseInt(year);
            if (!isNaN(yearNum)) whereConditions.push(`DS.[Ano_Proceso] = ${yearNum}`);
        }

        const whereClause = "WHERE " + whereConditions.join(" AND ");

        // TU CONSULTA EXACTA
        const query = `
            SELECT
                DS.[Codigo_Producto],
                DS.[Ano_Proceso],
                DS.[Obs_Linea],
                DS.[Codigo_Direccion],
                DS.[Codigo_Departamento],
                DS.[Codigo_Seccion],
                DS.[Precio_Compra],
                DS.[Numero_Orden_Compra],
                DS.[Cantidad],
                OCS.[Numero_Orden_Compra_Chile_Compras],
                OCS.[Fecha_Subida]
            FROM [Adquisiciones].[dbo].[Detalle_Salida] AS DS
            INNER JOIN [Adquisiciones].[dbo].[Ordenes_Compras_Subidas_Spoke] AS OCS
                ON DS.[Numero_Orden_Compra] = OCS.[Numero_Orden_Compra]
            ${whereClause}
        `;

        const result = await request.query(query);
        
        const items = result.recordset.map(row => ({
            id: crypto.randomUUID(),
            code: String(row.Codigo_Producto || ''),
            name: row.Obs_Linea || 'Sin Descripción',
            category: String(row.Codigo_Departamento),
            quantity: parseInt(row.Cantidad || 0),
            price: parseInt(row.Precio_Compra || 0),
            criticalStock: 5,
            oc_limpia: String(row.Numero_Orden_Compra || ''), 
            purchaseDate: row.Fecha_Subida
        }));

        console.log(`--> Registros encontrados: ${items.length}`);
        res.json({ success: true, data: items });

    } catch (err) {
        console.error("Error SQL Adquisiciones:", err);
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    } finally {
        if (pool) pool.close();
    }
});

// SERVER INIT
const SERVER_PORT = 3001;
expressApp.listen(SERVER_PORT, () => console.log(`SERVIDOR LISTO en puerto ${SERVER_PORT}`));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({ width: 1280, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false } });
  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;
  if (isDev) mainWindow.loadURL('http://localhost:5173'); else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}
app.whenReady().then(createWindow);
ipcMain.handle('send-email', async (event, { to, subject, text }) => {
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: 'informatica@munisanpedro.cl', pass: 'yywg jhdy pkvp ytus' } });
  try { await transporter.sendMail({ from: 'DIDECO <informatica@munisanpedro.cl>', to, subject, text }); return { success: true }; } catch (error) { return { success: false, error: error.message }; }
});