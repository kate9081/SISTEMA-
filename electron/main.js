import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Desactivar advertencias de seguridad en consola
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json());

// =========================================================================
// 1. CONFIGURACIÓN DE CONEXIONES A BASES DE DATOS
// =========================================================================

// CONEXIÓN A: ADQUISICIONES (Solo Lectura)
const dbConfigAdquisiciones = {
    user: 'dideco',
    password: 'App_Dideco_25',
    server: '192.168.2.12',
    database: 'Adquisiciones',
    options: { encrypt: false, trustServerCertificate: true }
};

// CONEXIÓN B: SOCIAL (Lectura y Escritura)
const dbConfigSocial = {
    user: 'dideco',              
    password: 'App_Dideco_25',   
    server: '192.168.2.12',    
    database: 'Social',          
    options: { 
        encrypt: false, 
        trustServerCertificate: true,
        instanceName: 'SANPEDRO'
    }
};

// =========================================================================
// MÓDULO 1: MANTENEDOR DE AYUDAS
// =========================================================================

// LEER (GET)
expressApp.get('/api/ayudas', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(dbConfigSocial);
        const result = await pool.request().query("SELECT * FROM Mantenedor_Beneficios ORDER BY Categoria, NombreItem");
        
        const agrupado = {};
        result.recordset.forEach(row => {
            if (!agrupado[row.Categoria]) agrupado[row.Categoria] = [];
            agrupado[row.Categoria].push({ id: row.Id, nombre: row.NombreItem });
        });
        res.json(agrupado);
    } catch (err) {
        console.error("Error conectando a BD Social:", err);
        res.status(500).json({ error: "Error de conexión a BD Social. Verifique permisos." });
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
        await pool.request()
            .input('id', sql.Int, id)
            .query("DELETE FROM Mantenedor_Beneficios WHERE Id = @id");

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});


// =========================================================================
// MÓDULO 2: INVENTARIO
// =========================================================================

// LEER INVENTARIO (Con lógica de importación automática)
expressApp.get('/api/inventario', async (req, res) => {
    let poolSocial, poolAdq;
    try {
        // 1. Conectamos a TU base de datos (Social)
        poolSocial = await sql.connect(dbConfigSocial);
        
        // 2. Verificamos si ya tienes datos copiados
        const check = await poolSocial.request().query("SELECT COUNT(*) as total FROM Inventario_Interno");
        
        // 3. SI ESTÁ VACÍA -> IMPORTAMOS DE ADQUISICIONES
        if (check.recordset[0].total === 0) {
            console.log("--> [INVENTARIO] Tabla Social vacía. Ejecutando TU consulta en Adquisiciones...");
            
            poolAdq = await sql.connect(dbConfigAdquisiciones);
            
            const queryOriginal = `
                SELECT
                    DS.[Codigo_Producto], DS.[Obs_Linea], DS.[Codigo_Departamento],
                    DS.[Cantidad], DS.[Precio_Compra], DS.[Numero_Orden_Compra],
                    OCS.[Fecha_Subida]
                FROM [Adquisiciones].[dbo].[Detalle_Salida] AS DS
                INNER JOIN [Adquisiciones].[dbo].[Ordenes_Compras_Subidas_Spoke] AS OCS
                    ON DS.[Numero_Orden_Compra] = OCS.[Numero_Orden_Compra]
                WHERE DS.[Codigo_Departamento] IN (24) AND DS.[Codigo_Seccion] IN (0);
            `;
            
            const adqResult = await poolAdq.request().query(queryOriginal);
            console.log(`--> Se encontraron ${adqResult.recordset.length} registros. Copiando a Social...`);

            const transaction = new sql.Transaction(poolSocial);
            await transaction.begin();
            try {
                for (const item of adqResult.recordset) {
                    await transaction.request()
                        .input('cod', sql.NVarChar, String(item.Codigo_Producto))
                        .input('nom', sql.NVarChar, String(item.Obs_Linea))
                        .input('cat', sql.NVarChar, String(item.Codigo_Departamento))
                        .input('cant', sql.Int, parseInt(item.Cantidad || 0))
                        .input('precio', sql.Int, parseInt(item.Precio_Compra || 0))
                        .input('oc', sql.NVarChar, String(item.Numero_Orden_Compra))
                        .input('fecha', sql.DateTime, item.Fecha_Subida)
                        // Por defecto Estado_Manual es 'AUTO'
                        .query(`INSERT INTO Inventario_Interno (Codigo_Producto, Nombre, Categoria, Cantidad, Precio, Orden_Compra, Fecha_Subida, Estado_Manual) 
                                VALUES (@cod, @nom, @cat, @cant, @precio, @oc, @fecha, 'AUTO')`);
                }
                await transaction.commit();
                console.log("--> Copia finalizada.");
            } catch (txError) {
                await transaction.rollback();
                throw txError;
            }
        }

        // 4. LEER DATOS (AQUÍ ESTABA EL ERROR: FALTABA MAPEAR EL ESTADO)
        const finalResult = await poolSocial.request().query("SELECT * FROM Inventario_Interno ORDER BY Nombre");
        
        const items = finalResult.recordset.map(row => ({
            id: row.Id,
            code: row.Codigo_Producto,
            name: row.Nombre,
            category: row.Categoria,
            quantity: row.Cantidad,
            price: row.Precio,
            oc_limpia: row.Orden_Compra,
            purchaseDate: row.Fecha_Subida,
            manualStatus: row.Estado_Manual // <--- ESTA LÍNEA ES LA CLAVE PARA QUE FUNCIONE EL SELECTOR
        }));

        res.json({ success: true, data: items });

    } catch (err) {
        console.error("Error Inventario:", err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (poolSocial) poolSocial.close();
        if (poolAdq) poolAdq.close();
    }
});

// AGREGAR PRODUCTO (POST)
expressApp.post('/api/inventario/agregar', async (req, res) => {
    let pool;
    try {
        const { code, description, department, stock, price, oc, status } = req.body;
        
        pool = await sql.connect(dbConfigSocial);
        
        await pool.request()
            .input('cod', sql.NVarChar, code || 'MANUAL')
            .input('nom', sql.NVarChar, description) 
            .input('cat', sql.NVarChar, department || '24')
            .input('cant', sql.Int, parseInt(stock) || 0)
            .input('precio', sql.Int, parseInt(price) || 0)
            .input('oc', sql.NVarChar, oc || 'S/N')
            .input('st', sql.NVarChar, status || 'AUTO')
            .input('fecha', sql.DateTime, new Date())
            
            .query(`INSERT INTO Inventario_Interno (Codigo_Producto, Nombre, Categoria, Cantidad, Precio, Orden_Compra, Estado_Manual, Fecha_Subida) 
                    VALUES (@cod, @nom, @cat, @cant, @precio, @oc, @st, @fecha)`);

        res.json({ success: true });
    } catch (err) { 
        console.error("Error al agregar:", err);
        res.status(500).json({ error: err.message }); 
    } finally { 
        if (pool) pool.close(); 
    }
});

// EDITAR (PUT)
expressApp.put('/api/inventario/editar', async (req, res) => {
    let pool;
    try {
        const { id, nombre, cantidad, precio, oc, status } = req.body; 
        pool = await sql.connect(dbConfigSocial);
        await pool.request()
            .input('id', sql.Int, id)
            .input('nom', sql.NVarChar, nombre)
            .input('cant', sql.Int, cantidad)
            .input('precio', sql.Int, precio)
            .input('oc', sql.NVarChar, oc)
            .input('st', sql.NVarChar, status) 
            .query("UPDATE Inventario_Interno SET Nombre = @nom, Cantidad = @cant, Precio = @precio, Orden_Compra = @oc, Estado_Manual = @st WHERE Id = @id");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// ELIMINAR PRODUCTO (DELETE)
expressApp.delete('/api/inventario/borrar/:id', async (req, res) => {
    let pool;
    try {
        const { id } = req.params;
        pool = await sql.connect(dbConfigSocial);
        await pool.request().input('id', sql.Int, id).query("DELETE FROM Inventario_Interno WHERE Id = @id");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});


// =========================================================================
// MÓDULO 3: DASHBOARD
// =========================================================================
expressApp.get('/api/dashboard/metricas', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(dbConfigSocial);
        
        // Lógica: Es crítico si se forzó a 'CRITICO' O si está en 'AUTO' y tiene 5 o menos.
        // (Si prefieres stock de 0 a 9, cambia el 5 por un 9 aquí abajo)
        const whereClause = "(Estado_Manual = 'CRITICO') OR (Estado_Manual = 'AUTO' AND Cantidad <= 5)";

        const criticosQuery = await pool.request().query(`
            SELECT Id as id, Codigo_Producto as code, Nombre as name, Cantidad as stock 
            FROM Inventario_Interno 
            WHERE ${whereClause} 
            ORDER BY Cantidad ASC
        `);

        const totalesQuery = await pool.request().query(`
            SELECT 
                COUNT(*) as totalProductos,
                SUM(CASE WHEN ${whereClause} THEN 1 ELSE 0 END) as totalCriticos
            FROM Inventario_Interno
        `);

        res.json({
            success: true,
            criticos: criticosQuery.recordset,
            resumen: totalesQuery.recordset[0]
        });

    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// =========================================================================
// MÓDULO 4: REGISTRO DE ENTREGAS (Guarda en Historial_Entregas)
// =========================================================================

expressApp.post('/api/entregas/agregar', async (req, res) => {
    let pool;
    const transaction = new sql.Transaction();
    try {
        const record = req.body;
        pool = await sql.connect(dbConfigSocial);
        transaction.connection = pool;
        
        await transaction.begin(); // Iniciamos transacción segura

        // 1. Insertar Cabecera
        const requestHead = new sql.Request(transaction);
        await requestHead
            .input('folio', sql.NVarChar, record.folio)
            .input('fecha', sql.Date, record.date)
            .input('rutBen', sql.NVarChar, record.beneficiaryRut)
            .input('nomBen', sql.NVarChar, record.beneficiaryName)
            .input('rutProf', sql.NVarChar, record.professionalId)
            .input('nomProf', sql.NVarChar, record.professionalName)
            .input('retira', sql.NVarChar, record.receiverName)
            .input('obs', sql.NVarChar, record.observations)
            .input('tipo', sql.NVarChar, record.aidType)
            .input('total', sql.Int, record.value)
            .query(`INSERT INTO Historial_Entregas 
                    (Folio, Fecha_Entrega, Rut_Beneficiario, Nombre_Beneficiario, Rut_Profesional, Nombre_Profesional, Quien_Retira, Observaciones, Tipo_Ayuda_Principal, Total_Estimado)
                    VALUES 
                    (@folio, @fecha, @rutBen, @nomBen, @rutProf, @nomProf, @retira, @obs, @tipo, @total)`);

        // 2. Insertar Detalle (Productos)
        for (const item of record.items) {
            const requestItem = new sql.Request(transaction);
            await requestItem
                .input('folio', sql.NVarChar, record.folio)
                .input('cat', sql.NVarChar, record.categoryId || 'General')
                .input('prod', sql.NVarChar, item.name)
                .input('cant', sql.Int, item.quantity)
                .input('val', sql.Int, item.value)
                .input('det', sql.NVarChar, item.detail || '')
                .query(`INSERT INTO Historial_Entregas_Detalle 
                        (Folio_Entrega, Categoria, Producto, Cantidad, Valor_Unitario, Detalle)
                        VALUES 
                        (@folio, @cat, @prod, @cant, @val, @det)`);
        }

        await transaction.commit();
        res.json({ success: true });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("Error guardando entrega:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (pool) pool.close();
    }
});

// =========================================================================
// MÓDULO 5: BENEFICIARIOS (CRUD Completo)
// =========================================================================

// LEER
expressApp.get('/api/beneficiarios', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(dbConfigSocial);
        const result = await pool.request().query("SELECT * FROM Beneficiarios ORDER BY Fecha_Registro DESC");
        // Mapeamos SQL -> Frontend
        const items = result.recordset.map(row => ({
            id: row.Id, rut: row.Rut, firstName: row.Nombres, lastName: row.Apellidos,
            address: row.Direccion, phone: row.Telefono, email: row.Email
        }));
        res.json({ success: true, data: items });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// AGREGAR
expressApp.post('/api/beneficiarios/agregar', async (req, res) => {
    let pool;
    try {
        const { rut, firstName, lastName, address, phone, email } = req.body;
        pool = await sql.connect(dbConfigSocial);
        await pool.request()
            .input('rut', sql.NVarChar, rut).input('nom', sql.NVarChar, firstName).input('ape', sql.NVarChar, lastName)
            .input('dir', sql.NVarChar, address || '').input('tel', sql.NVarChar, phone || '').input('mail', sql.NVarChar, email || '')
            .query("INSERT INTO Beneficiarios (Rut, Nombres, Apellidos, Direccion, Telefono, Email) VALUES (@rut, @nom, @ape, @dir, @tel, @mail)");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// ELIMINAR
expressApp.delete('/api/beneficiarios/borrar/:rut', async (req, res) => {
    let pool;
    try {
        const { rut } = req.params;
        pool = await sql.connect(dbConfigSocial);
        await pool.request().input('rut', sql.NVarChar, rut).query("DELETE FROM Beneficiarios WHERE Rut = @rut");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// EDITAR
expressApp.put('/api/beneficiarios/editar', async (req, res) => {
    let pool;
    try {
        const { rut, firstName, lastName, address, phone, email } = req.body;
        pool = await sql.connect(dbConfigSocial);
        await pool.request()
            .input('rut', sql.NVarChar, rut).input('nom', sql.NVarChar, firstName).input('ape', sql.NVarChar, lastName)
            .input('dir', sql.NVarChar, address).input('tel', sql.NVarChar, phone).input('mail', sql.NVarChar, email)
            .query("UPDATE Beneficiarios SET Nombres = @nom, Apellidos = @ape, Direccion = @dir, Telefono = @tel, Email = @mail WHERE Rut = @rut");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// =========================================================================
// MÓDULO 6: USUARIOS Y LOGIN (Autenticación por USUARIO)
// =========================================================================

expressApp.post('/api/login', async (req, res) => {
    let pool;
    try {
        // AHORA RECIBIMOS 'username' EN LUGAR DE 'email'
        const { username, password } = req.body;
        
        console.log("=== INTENTO DE LOGIN ===");
        console.log("Usuario recibido:", username);
        console.log("Password recibida:", password);

        pool = await sql.connect(dbConfigSocial);
        
        // CAMBIAMOS LA CONSULTA SQL PARA BUSCAR POR LA COLUMNA 'Usuario'
        const result = await pool.request()
            .input('user', sql.NVarChar, username)
            .input('pass', sql.NVarChar, password)
            .query(`SELECT * FROM Usuarios_Sistema WHERE Usuario = @user AND Password = @pass AND Activo = 1`);

        console.log("Coincidencias encontradas:", result.recordset.length);

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            
            // REGISTRO AUDITORIA
            await pool.request()
                .input('usr', sql.NVarChar, user.Usuario || user.Email) // Guardamos el usuario
                .input('mod', sql.NVarChar, 'LOGIN')
                .input('acc', sql.NVarChar, 'INGRESO')
                .input('det', sql.NVarChar, 'Ingreso exitoso al sistema')
                .query("INSERT INTO Auditoria_Log (Usuario, Modulo, Accion, Detalle) VALUES (@usr, @mod, @acc, @det)");

            res.json({ 
                success: true, 
                user: {
                    id: user.Id,
                    rut: user.Rut,
                    firstName: user.Nombre,
                    lastName: user.Apellido,
                    email: user.Email,
                    username: user.Usuario, // Devolvemos el usuario también
                    role: user.Rol,
                    permissions: {
                        create: user.Permiso_Crear,
                        read: user.Permiso_Leer,
                        update: user.Permiso_Editar,
                        delete: user.Permiso_Borrar
                    }
                }
            });
        } else {
            res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos" });
        }
    } catch (err) { 
        console.error("Error Login:", err);
        res.status(500).json({ error: err.message }); 
    } finally { 
        if (pool) pool.close(); 
    }
});

// =========================================================================
// MÓDULO 7: PROFESIONALES (CRUD)
// =========================================================================

expressApp.get('/api/profesionales', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(dbConfigSocial);
        const result = await pool.request().query("SELECT * FROM Profesionales WHERE Activo = 1");
        res.json({ success: true, data: result.recordset });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

expressApp.post('/api/profesionales/agregar', async (req, res) => {
    let pool;
    try {
        const { rut, nombre, cargo } = req.body;
        pool = await sql.connect(dbConfigSocial);
        await pool.request()
            .input('rut', sql.NVarChar, rut).input('nom', sql.NVarChar, nombre).input('car', sql.NVarChar, cargo)
            .query("INSERT INTO Profesionales (Rut, Nombre, Cargo) VALUES (@rut, @nom, @car)");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

expressApp.delete('/api/profesionales/borrar/:id', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(dbConfigSocial);
        // Borrado lógico (solo lo desactivamos para no romper historial)
        await pool.request().input('id', sql.Int, req.params.id)
            .query("UPDATE Profesionales SET Activo = 0 WHERE Id = @id");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// =========================================================================
// MÓDULO 8: AUDITORÍA (Endpoint para registrar acciones desde el Frontend)
// =========================================================================

expressApp.post('/api/auditoria', async (req, res) => {
    let pool;
    try {
        const { usuario, modulo, accion, detalle } = req.body;
        pool = await sql.connect(dbConfigSocial);
        await pool.request()
            .input('usr', sql.NVarChar, usuario).input('mod', sql.NVarChar, modulo)
            .input('acc', sql.NVarChar, accion).input('det', sql.NVarChar, detalle)
            .query("INSERT INTO Auditoria_Log (Usuario, Modulo, Accion, Detalle) VALUES (@usr, @mod, @acc, @det)");
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// =========================================================================
// MÓDULO 9: GESTIÓN DE USUARIOS DEL SISTEMA (CRUD SQL)
// =========================================================================

// LEER USUARIOS (GET)
expressApp.get('/api/usuarios', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(dbConfigSocial);
        // Traemos solo los activos para no llenar la lista de borrados
        const result = await pool.request().query("SELECT * FROM Usuarios_Sistema WHERE Activo = 1");
        
        // Mapeamos las columnas de SQL al formato que usa tu Frontend
        const users = result.recordset.map(row => ({
            id: row.Id,
            rut: row.Rut,
            username: row.Usuario,
            firstName: row.Nombre,
            lastName: row.Apellido,
            email: row.Email,
            password: row.Password, // Nota: En producción esto no se debería enviar, pero para gestión simple está bien
            role: row.Rol,
            status: row.Activo ? 'Active' : 'Inactive',
            permissions: {
                create: row.Permiso_Crear,
                read: row.Permiso_Leer,
                update: row.Permiso_Editar,
                delete: row.Permiso_Borrar
            }
        }));
        res.json({ success: true, data: users });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// CREAR USUARIO (POST)
expressApp.post('/api/usuarios/agregar', async (req, res) => {
    let pool;
    try {
        const u = req.body;
        pool = await sql.connect(dbConfigSocial);
        
        await pool.request()
            .input('rut', sql.NVarChar, u.rut)
            .input('user', sql.NVarChar, u.username)
            .input('nom', sql.NVarChar, u.firstName)
            .input('ape', sql.NVarChar, u.lastName)
            .input('mail', sql.NVarChar, u.email)
            .input('pass', sql.NVarChar, u.password)
            .input('rol', sql.NVarChar, u.role || 'USER')
            .input('pCrear', sql.Bit, u.permissions?.create ? 1 : 0)
            .input('pLeer', sql.Bit, u.permissions?.read ? 1 : 0)
            .input('pEdit', sql.Bit, u.permissions?.update ? 1 : 0)
            .input('pBorrar', sql.Bit, u.permissions?.delete ? 1 : 0)
            .query(`INSERT INTO Usuarios_Sistema 
                   (Rut, Usuario, Nombre, Apellido, Email, Password, Rol, Permiso_Crear, Permiso_Leer, Permiso_Editar, Permiso_Borrar, Activo)
                   VALUES 
                   (@rut, @user, @nom, @ape, @mail, @pass, @rol, @pCrear, @pLeer, @pEdit, @pBorrar, 1)`);
        
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// EDITAR USUARIO (PUT)
expressApp.put('/api/usuarios/editar', async (req, res) => {
    let pool;
    try {
        const u = req.body;
        pool = await sql.connect(dbConfigSocial);
        
        // Usamos el ID numérico para actualizar
        await pool.request()
            .input('id', sql.Int, u.id)
            .input('rut', sql.NVarChar, u.rut)
            .input('user', sql.NVarChar, u.username)
            .input('nom', sql.NVarChar, u.firstName)
            .input('ape', sql.NVarChar, u.lastName)
            .input('mail', sql.NVarChar, u.email)
            .input('pass', sql.NVarChar, u.password)
            .input('rol', sql.NVarChar, u.role)
            .input('pCrear', sql.Bit, u.permissions?.create ? 1 : 0)
            .input('pLeer', sql.Bit, u.permissions?.read ? 1 : 0)
            .input('pEdit', sql.Bit, u.permissions?.update ? 1 : 0)
            .input('pBorrar', sql.Bit, u.permissions?.delete ? 1 : 0)
            .query(`UPDATE Usuarios_Sistema SET 
                   Rut=@rut, Usuario=@user, Nombre=@nom, Apellido=@ape, Email=@mail, Password=@pass, Rol=@rol,
                   Permiso_Crear=@pCrear, Permiso_Leer=@pLeer, Permiso_Editar=@pEdit, Permiso_Borrar=@pBorrar
                   WHERE Id = @id`);
        
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});

// ELIMINAR USUARIO (DELETE Lógico)
expressApp.delete('/api/usuarios/borrar/:id', async (req, res) => {
    let pool;
    try {
        const { id } = req.params;
        pool = await sql.connect(dbConfigSocial);
        // No borramos la fila, solo ponemos Activo = 0 para mantener historial
        await pool.request().input('id', sql.Int, id)
            .query("UPDATE Usuarios_Sistema SET Activo = 0 WHERE Id = @id");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); } finally { if (pool) pool.close(); }
});


// =========================================================================
// INICIO DEL SERVIDOR
// =========================================================================

const SERVER_PORT = 3001;
expressApp.listen(SERVER_PORT, () => console.log(`SERVIDOR LISTO en puerto ${SERVER_PORT}`));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, 
    height: 800,
    webPreferences: { 
        nodeIntegration: true, 
        contextIsolation: false, 
        webSecurity: false, 
        allowRunningInsecureContent: true 
    },
  });
  
  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;
  if (isDev) mainWindow.loadURL('http://localhost:5173'); 
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') app.quit(); 
});

ipcMain.handle('send-email', async (event, { to, subject, text }) => {
  const transporter = nodemailer.createTransport({ 
      service: 'gmail', 
      auth: { user: 'informatica@munisanpedro.cl', pass: 'yywg jhdy pkvp ytus' } 
  });
  try { 
      await transporter.sendMail({ from: 'DIDECO <informatica@munisanpedro.cl>', to, subject, text }); 
      return { success: true }; 
  } catch (error) { 
      return { success: false, error: error.message }; 
  }
});