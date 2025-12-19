import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import fs from 'fs'; // Módulo para leer/escribir archivos reales

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json()); // NECESARIO para recibir datos

// Configuración SQL (Adquisiciones)
const dbConfig = {
    user: 'dideco',
    password: 'App_Dideco_25',
    server: '192.168.2.12',
    database: 'Adquisiciones',
    options: { encrypt: false, trustServerCertificate: true }
};

// =========================================================================
// 1. BASE DE DATOS MAESTRA DE AYUDAS (ARCHIVO JSON PERSISTENTE)
// =========================================================================

// Ruta del archivo físico en el PC del usuario (AppData)
const DB_PATH = path.join(app.getPath('userData'), 'dideco_ayudas_db.json');

// DATOS REALES DE INICIO (Se usan solo si el archivo no existe)
const DATOS_SEMILLA = {
    "Aporte Economico": [
        { id: 101, nombre: "Ahorro para la vivienda" },
        { id: 102, nombre: "Entrega y/o transporte de agua potable" },
        { id: 103, nombre: "Gas (vales, recarga, cilindros)" },
        { id: 104, nombre: "Pago de Servicios Básicos" },
        { id: 105, nombre: "Exención de pago servicio de aseo" },
        { id: 106, nombre: "Pago de Arriendo" },
        { id: 107, nombre: "Prestaciones y tratamientos de salud" },
        { id: 108, nombre: "Retiro de medicamentos" },
        { id: 109, nombre: "Otros" }
    ],
    "Fúnebres": [
        { id: 201, nombre: "Servicios Fúnebres" },
        { id: 202, nombre: "Entrega de Urna" },
        { id: 203, nombre: "Derecho a terreno en Cementerio Municipal" },
        { id: 204, nombre: "Servicio Sepultación" },
        { id: 205, nombre: "Derecho a Sepultación" },
        { id: 206, nombre: "Otros Funerales" }
    ],
    "Articulos de uso personal": [
        { id: 301, nombre: "Pañales, sabanillas, insumos de cuidados" },
        { id: 302, nombre: "Ajuar" },
        { id: 303, nombre: "Sabanillas" },
        { id: 304, nombre: "Utiles de Aseo" },
        { id: 305, nombre: "Vestuario" },
        { id: 306, nombre: "Otros articulos de aseo" }
    ],
    "Pasajes y Traslados": [
        { id: 401, nombre: "Entrega de pasajes" },
        { id: 402, nombre: "Traslados y Fletes" },
        { id: 403, nombre: "Reembolso de pasajes" },
        { id: 404, nombre: "Otros pasajes y traslado" }
    ],
    "Salud": [
        { id: 501, nombre: "Entrega de medicamento y similares" },
        { id: 502, nombre: "Atención Médica / Odontológicos" },
        { id: 503, nombre: "Traslados por Emergencias de Salud" },
        { id: 504, nombre: "Otros Salud" }
    ],
    "Servicios Básicos": [
        { id: 601, nombre: "Entrega de Agua Potable" },
        { id: 602, nombre: "Entrega de Paneles Solares o Baterias" },
        { id: 603, nombre: "Entrega de Gas, Leña, otros" },
        { id: 604, nombre: "Otros Servicios Básicos" }
    ],
    "Otros": [
        { id: 701, nombre: "Regalos de navidad a niños y niñas" },
        { id: 702, nombre: "Otro beneficio en especie o servicio municipal" }
    ]
};

// INICIALIZACIÓN: Crear archivo si no existe
if (!fs.existsSync(DB_PATH)) {
    console.log("--> Inicializando Base de Datos Maestra en:", DB_PATH);
    fs.writeFileSync(DB_PATH, JSON.stringify(DATOS_SEMILLA, null, 2));
} else {
    console.log("--> Base de Datos cargada desde:", DB_PATH);
}

// --- API PÚBLICA PARA TODO EL PROYECTO ---

// 1. OBTENER TODAS LAS AYUDAS (Cualquier módulo puede llamar a esta URL)
expressApp.get(['/api/ayudas', '/api/ayudas/listado'], (req, res) => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.json(DATOS_SEMILLA);
    }
});

// 2. AGREGAR UNA NUEVA AYUDA (Para el Mantenedor)
expressApp.post('/api/ayudas/agregar', (req, res) => {
    try {
        const { categoria, nombreItem } = req.body;
        if (!categoria || !nombreItem) return res.status(400).json({ error: "Datos faltantes" });

        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

        if (!data[categoria]) data[categoria] = [];
        
        const nuevoItem = {
            id: Date.now(), // ID único real basado en tiempo
            nombre: nombreItem
        };

        data[categoria].push(nuevoItem);
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); // Guardado físico
        
        console.log(`--> Nuevo Item Guardado: ${nombreItem} en ${categoria}`);
        res.json({ success: true, item: nuevoItem });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. GUARDAR CAMBIOS MASIVOS (Editar/Eliminar)
expressApp.post('/api/ayudas/guardar', (req, res) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// =========================================================================
// 2. INVENTARIO SQL (SOLUCIÓN 283 REGISTROS)
// =========================================================================
expressApp.get('/api/sincronizar', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const { year, oc } = req.query;
        
        let whereConditions = ["DS.[Codigo_Departamento] IN (4, 24)"];
        const hasOC = oc && oc.trim() !== '';

        if (!hasOC) {
             if (year && year !== 'all') {
                const yearNum = parseInt(year);
                if (!isNaN(yearNum)) whereConditions.push(`DS.[Ano_Proceso] = ${yearNum}`);
             }
        }
        if (hasOC) {
            const cleanOC = oc.replace(/['";]/g, '').trim(); 
            whereConditions.push(`(CAST(DS.[Numero_Orden_Compra] AS VARCHAR) LIKE '%${cleanOC}%' OR OCS.[Numero_Orden_Compra_Chile_Compras] LIKE '%${cleanOC}%')`);
        }
        const whereClause = "WHERE " + whereConditions.join(" AND ");
        
        // SELECT DISTINCT elimina duplicados -> 283 filas exactas
        const query = `
            SELECT DISTINCT
                DS.[Codigo_Producto], DS.[Ano_Proceso], DS.[Obs_Linea],
                DS.[Codigo_Direccion], DS.[Codigo_Departamento], DS.[Codigo_Seccion],
                DS.[Precio_Compra], DS.[Numero_Orden_Compra], DS.[Cantidad],
                OCS.[Numero_Orden_Compra_Chile_Compras], OCS.[Fecha_Subida]
            FROM [Adquisiciones].[dbo].[Detalle_Salida] AS DS
            INNER JOIN [Adquisiciones].[dbo].[Ordenes_Compras_Subidas_Spoke] AS OCS
                ON DS.[Numero_Orden_Compra] = OCS.[Numero_Orden_Compra]
            ${whereClause}
        `;

        const result = await pool.request().query(query);
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

        res.json({ success: true, data: items });

    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    } finally {
        if (pool) pool.close();
    }
});

// Configuración Servidor
const SERVER_PORT = 3001;
expressApp.listen(SERVER_PORT, () => console.log(`API MAESTRA lista en puerto ${SERVER_PORT}`));

// Configuración Ventana Electron
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false, allowRunningInsecureContent: true },
  });
  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;
  if (isDev) mainWindow.loadURL('http://localhost:5173'); else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
ipcMain.handle('send-email', async (event, { to, subject, text }) => {
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: 'informatica@munisanpedro.cl', pass: 'yywg jhdy pkvp ytus' } });
  try { await transporter.sendMail({ from: 'DIDECO <informatica@munisanpedro.cl>', to, subject, text }); return { success: true }; } catch (error) { return { success: false, error: error.message }; }
});