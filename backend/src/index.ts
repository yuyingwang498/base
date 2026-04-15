import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import tableRoutes from "./routes/tableRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import sseRoutes from "./routes/sseRoutes.js";
import { mockTable } from "./mockData.js";
import { connectDB, loadTable, getTable } from "./services/dbStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors());
app.use(express.json());

// ── Request logging middleware ──
function gmt8() {
  return new Date(Date.now() + 8 * 3600_000).toISOString().replace("T", " ").slice(0, 23);
}
app.use("/api", (req, res, next) => {
  // Skip SSE and health check from verbose logging
  if (req.path.includes("/events") || req.path === "/health") return next();

  const start = Date.now();
  const clientId = req.headers["x-client-id"] || "-";
  const method = req.method;
  const path = req.originalUrl;

  // Log request body for mutations
  if (method !== "GET") {
    const bodySnippet = JSON.stringify(req.body).slice(0, 500);
    console.log(`[${gmt8()}] → ${method} ${path} client=${clientId} body=${bodySnippet}`);
  }

  // Capture response
  const origJson = res.json.bind(res);
  res.json = (body: any) => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const respSnippet = JSON.stringify(body).slice(0, 300);
    const level = status >= 400 ? "⚠️" : "✓";
    console.log(`[${gmt8()}] ${level} ${method} ${path} → ${status} (${ms}ms) client=${clientId} resp=${respSnippet}`);
    return origJson(body);
  };

  next();
});

app.use("/api/tables", tableRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/sync", sseRoutes);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Serve frontend static files in production
const publicDir = path.resolve(__dirname, "../../frontend/dist");
app.use(express.static(publicDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

async function start() {
  // Connect to PostgreSQL
  await connectDB();
  console.log("Connected to PostgreSQL");

  // Seed mock data only if the table doesn't exist yet
  const existing = await getTable(mockTable.id);
  if (!existing) {
    await loadTable(mockTable);
    console.log("Mock data seeded (first run)");
  } else {
    console.log("Table already exists, skipping seed");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Filter running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
