import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("production.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS production_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    representante TEXT,
    prod_liquida REAL,
    utilizacao REAL,
    unidades REAL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/data", (req, res) => {
    try {
      const data = db.prepare("SELECT * FROM production_data").all();
      const lastUpdate = db.prepare("SELECT value FROM metadata WHERE key = 'last_update'").get();
      const fileModified = db.prepare("SELECT value FROM metadata WHERE key = 'file_modified'").get();
      
      res.json({ 
        data, 
        lastUpdate: lastUpdate?.value,
        fileModified: fileModified?.value
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar dados" });
    }
  });

  app.delete("/api/data", (req, res) => {
    console.log("DELETE /api/data request received");
    try {
      db.prepare("DELETE FROM production_data").run();
      db.prepare("DELETE FROM metadata WHERE key IN ('last_update', 'file_modified')").run();
      console.log("Data cleared successfully");
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ error: "Erro ao limpar dados" });
    }
  });

  app.post("/api/upload", (req, res) => {
    const { data, fileModified } = req.body;
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const insert = db.prepare(`
      INSERT INTO production_data (representante, prod_liquida, utilizacao, unidades)
      VALUES (?, ?, ?, ?)
    `);

    const deleteOld = db.prepare("DELETE FROM production_data");
    const updateMetadata = db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)");

    const transaction = db.transaction((rows) => {
      deleteOld.run();
      for (const row of rows) {
        insert.run(
          row["Representantes"] || "",
          parseFloat(row["Prod. liquida sist."]) || 0,
          parseFloat(row["Utilização"]) || 0,
          parseFloat(row["Unidades"]) || 0
        );
      }
      updateMetadata.run('last_update', new Date().toISOString());
      updateMetadata.run('file_modified', fileModified);
    });

    try {
      transaction(data);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao salvar dados" });
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
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
