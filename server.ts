import express from "express";
import path from "path";
import sqlite3 from "sqlite3";
import { createServer as createViteServer } from "vite";
import { getInitialMomoTransactions, INITIAL_AD_REVENUES, DEFAULT_SETTINGS } from "./src/data/initialData";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize SQLite Database
const dbPath = path.join(process.cwd(), "database.sqlite");
const db = new sqlite3.Database(dbPath);

// Helper promises for DB operations
const dbRun = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbAll = <T>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

const dbGet = <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
};

// Database Initialization
const initDb = async () => {
  await new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // settings
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          usdToRwfRate REAL,
          dailySpendingLimit REAL,
          customCategoryMappings TEXT
        )
      `);

      // transactions
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          rawText TEXT,
          type TEXT,
          amount REAL,
          fee REAL,
          balance REAL,
          counterparty TEXT,
          timestamp TEXT,
          formattedDate TEXT,
          category TEXT,
          isCustom INTEGER DEFAULT 0
        )
      `);

      // ad_revenue
      db.run(`
        CREATE TABLE IF NOT EXISTS ad_revenue (
          date TEXT PRIMARY KEY,
          monetag REAL,
          adsterra REAL,
          profiton REAL,
          serverCosts REAL,
          adCosts REAL,
          checkedAt TEXT
        )
      `);
      resolve();
    });
  });

  // Seed settings
  const existingSettings = await dbGet("SELECT id FROM settings WHERE id = 1");
  if (!existingSettings) {
    await dbRun(
      "INSERT INTO settings (id, usdToRwfRate, dailySpendingLimit, customCategoryMappings) VALUES (1, ?, ?, ?)",
      [
        DEFAULT_SETTINGS.usdToRwfRate,
        DEFAULT_SETTINGS.dailySpendingLimit,
        JSON.stringify(DEFAULT_SETTINGS.customCategoryMappings),
      ]
    );
  }

  // Seed transactions
  const transactionCount = await dbGet<{ count: number }>("SELECT count(*) as count FROM transactions");
  if (transactionCount && transactionCount.count === 0) {
    const defaultTxs = getInitialMomoTransactions();
    for (const tx of defaultTxs) {
      await dbRun(
        `INSERT OR IGNORE INTO transactions (id, rawText, type, amount, fee, balance, counterparty, timestamp, formattedDate, category, isCustom)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tx.id,
          tx.rawText,
          tx.type,
          tx.amount,
          tx.fee,
          tx.balance,
          tx.counterparty,
          tx.timestamp,
          tx.formattedDate,
          tx.category,
          tx.isCustom ? 1 : 0,
        ]
      );
    }
  }

  // Seed ad_revenue
  const adRevenueCount = await dbGet<{ count: number }>("SELECT count(*) as count FROM ad_revenue");
  if (adRevenueCount && adRevenueCount.count === 0) {
    for (const r of INITIAL_AD_REVENUES) {
      await dbRun(
        `INSERT OR IGNORE INTO ad_revenue (date, monetag, adsterra, profiton, serverCosts, adCosts, checkedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          r.date,
          r.monetag,
          r.adsterra,
          r.profiton,
          r.serverCosts,
          r.adCosts,
          r.checkedAt || new Date().toISOString(),
        ]
      );
    }
  }
};

// Initialize DB and start server setup
async function startServer() {
  await initDb();
  console.log("SQLite tables initialized and seeded successfully.");

  // APIS BEFORE VITE MIDDLEWARE

  // --- SETTINGS APIS ---
  app.get("/api/settings", async (req, res) => {
    try {
      const row = await dbGet<any>("SELECT * FROM settings WHERE id = 1");
      if (row) {
        res.json({
          usdToRwfRate: row.usdToRwfRate,
          dailySpendingLimit: row.dailySpendingLimit,
          customCategoryMappings: JSON.parse(row.customCategoryMappings || "{}"),
        });
      } else {
        res.json(DEFAULT_SETTINGS);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { usdToRwfRate, dailySpendingLimit, customCategoryMappings } = req.body;
      await dbRun(
        `INSERT OR REPLACE INTO settings (id, usdToRwfRate, dailySpendingLimit, customCategoryMappings)
         VALUES (1, ?, ?, ?)`,
        [usdToRwfRate, dailySpendingLimit, JSON.stringify(customCategoryMappings)]
      );
      res.json({ status: "success", msg: "Settings saved to SQLite" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- TRANSACTIONS APIS ---
  app.get("/api/transactions", async (req, res) => {
    try {
      const rows = await dbAll<any>("SELECT * FROM transactions ORDER BY timestamp DESC");
      // Map database numeric booleans back to true booleans for web app
      const transactions = rows.map((r) => ({
        ...r,
        isCustom: r.isCustom === 1,
      }));
      res.json(transactions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/transactions/bulk", async (req, res) => {
    try {
      const items = Array.isArray(req.body) ? req.body : [req.body];
      for (const tx of items) {
        await dbRun(
          `INSERT OR REPLACE INTO transactions (id, rawText, type, amount, fee, balance, counterparty, timestamp, formattedDate, category, isCustom)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tx.id,
            tx.rawText,
            tx.type,
            tx.amount,
            tx.fee,
            tx.balance,
            tx.counterparty,
            tx.timestamp,
            tx.formattedDate,
            tx.category,
            tx.isCustom ? 1 : 0,
          ]
        );
      }
      res.json({ status: "success", count: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const tx = req.body;
      await dbRun(
        `INSERT OR REPLACE INTO transactions (id, rawText, type, amount, fee, balance, counterparty, timestamp, formattedDate, category, isCustom)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tx.id,
          tx.rawText,
          tx.type,
          tx.amount,
          tx.fee,
          tx.balance,
          tx.counterparty,
          tx.timestamp,
          tx.formattedDate,
          tx.category,
          tx.isCustom ? 1 : 0,
        ]
      );
      res.json({ status: "success", transaction: tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/transactions/update-category", async (req, res) => {
    try {
      const { id, category } = req.body;
      await dbRun("UPDATE transactions SET category = ? WHERE id = ?", [category, id]);
      res.json({ status: "success" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      await dbRun("DELETE FROM transactions WHERE id = ?", [req.params.id]);
      res.json({ status: "success" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- AD REVENUE APIS ---
  app.get("/api/ad-revenue", async (req, res) => {
    try {
      const rows = await dbAll<any>("SELECT * FROM ad_revenue ORDER BY date DESC");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ad-revenue", async (req, res) => {
    try {
      const rec = req.body;
      await dbRun(
        `INSERT OR REPLACE INTO ad_revenue (date, monetag, adsterra, profiton, serverCosts, adCosts, checkedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          rec.date,
          rec.monetag,
          rec.adsterra,
          rec.profiton,
          rec.serverCosts,
          rec.adCosts,
          rec.checkedAt || new Date().toISOString(),
        ]
      );
      res.json({ status: "success", record: rec });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/ad-revenue/:date", async (req, res) => {
    try {
      await dbRun("DELETE FROM ad_revenue WHERE date = ?", [req.params.date]);
      res.json({ status: "success" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- DATABASE RESET API ---
  app.post("/api/reset", async (req, res) => {
    try {
      await dbRun("DELETE FROM transactions");
      await dbRun("DELETE FROM ad_revenue");
      await dbRun("DELETE FROM settings");

      // Re-seed directly
      await dbRun(
        "INSERT INTO settings (id, usdToRwfRate, dailySpendingLimit, customCategoryMappings) VALUES (1, ?, ?, ?)",
        [
          DEFAULT_SETTINGS.usdToRwfRate,
          DEFAULT_SETTINGS.dailySpendingLimit,
          JSON.stringify(DEFAULT_SETTINGS.customCategoryMappings),
        ]
      );

      const defaultTxs = getInitialMomoTransactions();
      for (const tx of defaultTxs) {
        await dbRun(
          `INSERT OR IGNORE INTO transactions (id, rawText, type, amount, fee, balance, counterparty, timestamp, formattedDate, category, isCustom)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tx.id,
            tx.rawText,
            tx.type,
            tx.amount,
            tx.fee,
            tx.balance,
            tx.counterparty,
            tx.timestamp,
            tx.formattedDate,
            tx.category,
            0,
          ]
        );
      }

      for (const r of INITIAL_AD_REVENUES) {
        await dbRun(
          `INSERT OR IGNORE INTO ad_revenue (date, monetag, adsterra, profiton, serverCosts, adCosts, checkedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            r.date,
            r.monetag,
            r.adsterra,
            r.profiton,
            r.serverCosts,
            r.adCosts,
            r.checkedAt || new Date().toISOString(),
          ]
        );
      }

      res.json({ status: "success", msg: "Data re-seeded to SQLite demo state." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Integrate Vite Dev Server Middleware or Serve Built Production SPA Assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error("Failed to start server:", e);
});
