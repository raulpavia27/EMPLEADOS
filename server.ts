import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("teachers.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfc TEXT,
    curp TEXT,
    nombre_completo TEXT,
    clave_presupuestal TEXT,
    horas_base REAL,
    categoria TEXT,
    centro_trabajo TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const upload = multer({ dest: "uploads/" });

  // API Routes
  app.post("/api/upload-csv", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const results: any[] = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => {
        // Skip rows that don't look like teacher data (e.g. headers or empty rows)
        const rfc = data.RFC || data.rfc || data['RFC'];
        if (!rfc || rfc.includes('RFC') || rfc.includes('PERSONAL')) return;

        const normalizedData = {
          rfc: rfc.trim(),
          curp: (data.CURP || data.curp || data['CURP'] || "").trim(),
          nombre_completo: (data['NOMBRE (31 personsas)'] || data.NOMBRE_COMPLETO || data.nombre_completo || data.NOMBRE || "").trim(),
          clave_presupuestal: (data['CLAVE PRESUPUESTAL ACTUAL'] || data.CLAVE_PRESUPUESTAL || data.clave_presupuestal || "").trim(),
          horas_base: parseFloat(data['HORAS DE BASE'] || data.HORAS_BASE || data.horas_base || "0"),
          categoria: (data['CATEGORÍA'] || data['CATEGORA'] || data.CATEGORIA || data.categoria || "").trim(),
          centro_trabajo: (data.CENTRO || data.CENTRO_TRABAJO || data.centro_trabajo || "").trim()
        };
        
        if (normalizedData.rfc) {
          results.push(normalizedData);
        }
      })
      .on("end", () => {
        const insert = db.prepare(`
          INSERT INTO teachers (rfc, curp, nombre_completo, clave_presupuestal, horas_base, categoria, centro_trabajo)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction((data) => {
          db.prepare("DELETE FROM teachers").run(); // Clear old data as requested "actualizar la base de datos"
          for (const row of data) {
            insert.run(
              row.rfc,
              row.curp,
              row.nombre_completo,
              row.clave_presupuestal,
              row.horas_base,
              row.categoria,
              row.centro_trabajo
            );
          }
        });

        try {
          transaction(results);
          fs.unlinkSync(req.file!.path); // Clean up
          res.json({ message: "Database updated successfully", count: results.length });
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: "Failed to process CSV" });
        }
      });
  });

  app.get("/api/search", (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.json([]);
    }

    const searchTerm = `%${query}%`;
    
    // First, find all matching teachers
    // Then, for each teacher found, we need their total hours across the whole DB
    // We'll group by RFC to identify "the same teacher"
    
    const searchSql = `
      SELECT 
        rfc, curp, nombre_completo, clave_presupuestal, horas_base, categoria, centro_trabajo,
        (SELECT SUM(horas_base) FROM teachers t2 WHERE t2.rfc = teachers.rfc) as horas_totales
      FROM teachers
      WHERE 
        rfc LIKE ? OR 
        curp LIKE ? OR 
        nombre_completo LIKE ? OR 
        clave_presupuestal LIKE ? OR 
        categoria LIKE ? OR 
        centro_trabajo LIKE ?
    `;

    try {
      const results = db.prepare(searchSql).all(
        searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm
      );
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Search failed" });
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
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
