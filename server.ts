import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import Database from "better-sqlite3";
import Stripe from "stripe";
import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

dotenv.config();

async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  try {
    const data = await pdf(buffer);
    return { text: data.text || "", numpages: data.numpages || 1 };
  } catch (error: any) {
    console.error("pdf-parse error:", error);
    return {
      text: "",
      numpages: 1
    };
  }
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const db = new Database("database.sqlite");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS access_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    phone TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    is_beta_user BOOLEAN DEFAULT 0,
    payment_status TEXT DEFAULT 'no_iniciado', -- no_iniciado, pendiente_verificacion, confirmado, rechazado
    access_status TEXT DEFAULT 'bloqueado', -- bloqueado, activo
    plan TEXT DEFAULT 'beta',
    payment_notes TEXT,
    activated_at DATETIME,
    last_login_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_email TEXT,
    action TEXT, -- confirm_payment, reject_payment, block_user, activate_user, add_note
    target_user_email TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS analysis_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    filename TEXT,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Auto-register admins from environment
const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(e => e);
adminEmails.forEach(email => {
  db.prepare("INSERT OR IGNORE INTO users (email, name, payment_status, access_status, plan) VALUES (?, ?, 'confirmado', 'activo', 'admin')").run(email, 'Administrador');
});

async function startServer() {
  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
  });

  // API Routes
app.post("/api/access-request", (req, res) => {
  const rawEmail = req.body?.email;
  const email = String(rawEmail || "").trim().toLowerCase();
  const name = String(req.body?.name || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const reason = String(req.body?.reason || "").trim();

  console.log("POST /api/access-request body:", { email, name, phone, reason });

  if (!email || !name) {
    return res.status(400).json({
      success: false,
      message: "Email y nombre son obligatorios."
    });
  }

  try {
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (email, name, payment_status, access_status)
        VALUES (?, ?, 'no_iniciado', 'bloqueado')
        ON CONFLICT(email) DO UPDATE SET
          name = excluded.name
      `).run(email, name);

      db.prepare(`
        INSERT INTO access_requests (email, name, phone, reason, status)
        VALUES (?, ?, ?, ?, 'pending')
        ON CONFLICT(email) DO UPDATE SET
          name = excluded.name,
          phone = excluded.phone,
          reason = excluded.reason,
          status = 'pending',
          created_at = CURRENT_TIMESTAMP
      `).run(email, name, phone, reason);
    });

    tx();

    const user = db.prepare(`
      SELECT email, name, payment_status, access_status, created_at
      FROM users
      WHERE email = ?
    `).get(email);

    const requestRow = db.prepare(`
      SELECT email, name, phone, reason, status, created_at
      FROM access_requests
      WHERE email = ?
    `).get(email);

    console.log("Usuario guardado:", user);
    console.log("Solicitud guardada:", requestRow);

    return res.json({
      success: true,
      message: "Solicitud enviada correctamente.",
      user,
      request: requestRow
    });
  } catch (error: any) {
    console.error("Error in /api/access-request:", error);
    return res.status(500).json({
      success: false,
      message: "Error al procesar la solicitud.",
      details: error.message
    });
  }
});

  app.post("/api/access-request/confirm-payment", (req, res) => {

  const rawEmail = req.body?.email;
  const email = String(rawEmail || "").trim().toLowerCase();

  try {

    db.prepare(`
      UPDATE access_requests
      SET status = 'paid_pending_verification'
      WHERE email = ?
    `).run(email);

    db.prepare(`
      UPDATE users
      SET payment_status = 'pendiente_verificacion'
      WHERE email = ?
    `).run(email);

    res.json({
      success: true,
      message: "Estado actualizado a pendiente de verificación."
    });

  } catch (error) {
      res.status(500).json({ success: false, message: "Error al actualizar el estado." });
    }
  });

  app.post("/api/verify-access", (req, res) => {
    const rawEmail = req.body?.email;
const email = String(rawEmail || "").trim().toLowerCase();

const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (user) {
      // Update last login
      db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE email = ?").run(email);

      if (user.access_status === 'activo') {
        if (user.expires_at) {
          const now = new Date();
          const expiresAt = new Date(user.expires_at);
          if (now > expiresAt) {
            db.prepare("UPDATE users SET access_status = 'bloqueado' WHERE email = ?").run(email);
            return res.json({ authorized: false, message: "Tu acceso beta ha expirado." });
          }
        }
        return res.json({ authorized: true, user });
      } else {
        return res.json({ authorized: false, message: "Tu cuenta está pendiente de activación o bloqueada.", payment_status: user.payment_status });
      }
    } else {
      res.json({ authorized: false });
    }
  });

  app.post(
  "/api/analyze-pdf",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Upload error:", err);
        return res.status(400).json({
          error: "Error al subir el archivo",
          details: err.message,
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      console.log("Processing /api/analyze-pdf");

      if (!req.file) {
        return res.status(400).json({
          error: "No se ha subido ningún archivo.",
        });
      }

      const buffer = req.file.buffer;

      let data;

try {
  data = await pdf(buffer);
} catch (err) {
  console.warn("pdf-parse warning:", err);
  data = { text: "", numpages: 1 };
}

      const text = (data.text || "").trim();

      console.log("PDF pages:", data.numpages);
      console.log("Extracted text length:", text.length);

      const base64 = buffer.toString("base64");

      res.json({
        text,
        base64,
        mimeType: req.file.mimetype,
        numPages: data.numpages,
      });
    } catch (error: any) {
      console.error("PDF processing error:", error);

      res.status(500).json({
        error: "Error al procesar el PDF",
        details: error.message,
      });
    }
  }
);

  // Admin Middleware
  const isAdmin = (req: any, res: any, next: any) => {
    const adminEmail = req.headers["x-admin-email"];
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
    
    if (adminEmail && adminEmails.includes(adminEmail.toLowerCase())) {
      req.adminEmail = adminEmail;
      next();
    } else {
      res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }
  };

  app.get("/api/admin/stats", isAdmin, (req, res) => {
    try {
      const stats = {
        total: db.prepare("SELECT COUNT(*) as count FROM users").get() as any,
        pending: db.prepare("SELECT COUNT(*) as count FROM users WHERE payment_status = 'pendiente_verificacion'").get() as any,
        new_requests: db.prepare("SELECT COUNT(*) as count FROM users WHERE payment_status = 'no_iniciado'").get() as any,
        active: db.prepare("SELECT COUNT(*) as count FROM users WHERE access_status = 'activo'").get() as any,
        blocked: db.prepare("SELECT COUNT(*) as count FROM users WHERE access_status = 'bloqueado'").get() as any,
        recent: db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 10").all()
      };
      res.json({
        total: stats.total.count,
        pending: stats.pending.count,
        new_requests: stats.new_requests.count,
        active: stats.active.count,
        blocked: stats.blocked.count,
        recent: stats.recent
      });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener estadísticas" });
    }
  });

app.get("/api/admin/users", isAdmin, (req, res) => {
  const { search, payment_status, access_status } = req.query;

  try {
    let query = `
      SELECT
        u.id,
        u.email,
        COALESCE(u.name, ar.name) AS name,
        u.payment_status,
        u.access_status,
        u.plan,
        u.payment_notes,
        u.activated_at,
        u.last_login_at,
        u.expires_at,
        u.created_at,
        ar.phone,
        ar.reason,
        ar.status AS request_status,
        ar.created_at AS request_created_at
      FROM users u
      LEFT JOIN access_requests ar
        ON u.email = ar.email
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (u.email LIKE ? OR u.name LIKE ? OR ar.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (payment_status) {
      query += ` AND u.payment_status = ?`;
      params.push(payment_status);
    }

    if (access_status) {
      query += ` AND u.access_status = ?`;
      params.push(access_status);
    }

    query += ` ORDER BY COALESCE(ar.created_at, u.created_at) DESC`;

    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (error) {
    console.error("Error en /api/admin/users:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

  app.get("/api/admin/user/:email", isAdmin, (req, res) => {
    const { email } = req.params;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      const logs = db.prepare("SELECT * FROM audit_log WHERE target_user_email = ? ORDER BY timestamp DESC").all(email);
      const requests = db.prepare("SELECT * FROM access_requests WHERE email = ?").all(email);
      res.json({ user, logs, requests });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener detalle de usuario" });
    }
  });

  app.post("/api/admin/user/action", isAdmin, (req: any, res) => {
    const rawEmail = req.body?.email;
const email = String(rawEmail || "").trim().toLowerCase();

const { action, details } = req.body;
    const adminEmail = req.adminEmail;

    try {
      db.transaction(() => {
        let updateQuery = "";
        const params: any[] = [];

        if (action === "confirm_payment") {
          updateQuery = "UPDATE users SET payment_status = 'confirmado', access_status = 'activo', activated_at = CURRENT_TIMESTAMP, expires_at = datetime('now', '+30 days') WHERE email = ?";
          params.push(email);
        } else if (action === "reject_payment") {
          updateQuery = "UPDATE users SET payment_status = 'rechazado', access_status = 'bloqueado' WHERE email = ?";
          params.push(email);
        } else if (action === "block_user") {
          updateQuery = "UPDATE users SET access_status = 'bloqueado' WHERE email = ?";
          params.push(email);
        } else if (action === "activate_user") {
          updateQuery = "UPDATE users SET access_status = 'activo', activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP), expires_at = COALESCE(expires_at, datetime('now', '+30 days')) WHERE email = ?";
          params.push(email);
        }

        if (updateQuery) {
          db.prepare(updateQuery).run(...params);
          db.prepare("INSERT INTO audit_log (admin_email, action, target_user_email, details) VALUES (?, ?, ?, ?)").run(
            adminEmail, action, email, JSON.stringify(details || {})
          );
        }
      })();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al procesar acción" });
    }
  });

  app.post("/api/admin/user/note", isAdmin, (req: any, res) => {
    const { email, note } = req.body;
    const adminEmail = req.adminEmail;
    try {
      db.prepare("UPDATE users SET payment_notes = ? WHERE email = ?").run(note, email);
      db.prepare("INSERT INTO audit_log (admin_email, action, target_user_email, details) VALUES (?, 'add_note', ?, ?)").run(
        adminEmail, email, JSON.stringify({ note })
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al añadir nota" });
    }
  });

  app.get("/api/admin/requests", isAdmin, (req, res) => {
    try {
      const requests = db.prepare("SELECT * FROM access_requests ORDER BY created_at DESC").all();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener solicitudes" });
    }
  });

  app.post("/api/admin/approve", (req, res) => {
    const { email } = req.body;
    try {
      const request = db.prepare("SELECT * FROM access_requests WHERE email = ?").get() as any;
      if (request) {
        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        db.prepare(`
          INSERT OR REPLACE INTO users (email, name, is_beta_user, plan, start_date, end_date) 
          VALUES (?, ?, 1, 'beta', ?, ?)
        `).run(email, request.name, startDate, endDate);
        
        db.prepare("DELETE FROM access_requests WHERE email = ?").run(email);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Solicitud no encontrada" });
      }
    } catch (error) {
      res.status(500).json({ error: "Error al aprobar" });
    }
  });

  app.post("/api/admin/reject", (req, res) => {
    const { email } = req.body;
    try {
      db.prepare("DELETE FROM access_requests WHERE email = ?").run(email);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al rechazar" });
    }
  });

  app.post("/api/delete-account", (req, res) => {
    const rawEmail = req.body?.email;
const email = String(rawEmail || "").trim().toLowerCase();
    try {
      db.prepare("DELETE FROM users WHERE email = ?").run(email);
      db.prepare("DELETE FROM access_requests WHERE email = ?").run(email);
      db.prepare("DELETE FROM analysis_history WHERE user_email = ?").run(email);
      res.json({ success: true, message: "Datos eliminados correctamente." });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error al eliminar los datos." });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

    const { email } = req.body;
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/dashboard`,
        customer_email: email,
      });
      res.json({ id: session.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/verify-payment", async (req, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "Missing session_id" });

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      if (session.payment_status === "paid") {
        const email = session.customer_email;
        if (email) {
          console.log(`Payment confirmed for ${email}. Updating/Creating user.`);
          // Use INSERT OR REPLACE to ensure user exists and is updated
          db.prepare(`
            INSERT INTO users (email, payment_status, access_status, activated_at, expires_at, plan)
            VALUES (?, 'confirmado', 'activo', CURRENT_TIMESTAMP, datetime('now', '+30 days'), 'standard')
            ON CONFLICT(email) DO UPDATE SET
              payment_status = 'confirmado',
              access_status = 'activo',
              activated_at = CURRENT_TIMESTAMP,
              expires_at = datetime('now', '+30 days')
          `).run(email);
        }
        res.json({ paid: true });
      } else {
        res.json({ paid: false });
      }
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  // API 404 Logger (for routes starting with /api)
  app.use("/api/*", (req, res) => {
    console.log(`API 404 - Not Found: ${req.originalUrl}`);
    res.status(404).json({ error: "API route not found", url: req.originalUrl });
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error Handler:", err);
    res.status(500).json({ error: "Error interno del servidor", details: err.message });
  });

    app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

await startServer().catch(err => {
  console.error("Failed to start server:", err);
});
