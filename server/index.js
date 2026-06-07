import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import {
  addSubmission,
  deleteSubmission,
  getDb,
  getDrafts,
  getGame,
  getSubmissions,
  setGame,
  upsertDraft
} from "./database.js";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const app = express();
const port = Number(process.env.PORT || 4177);
const adminPassword = process.env.ADMIN_PASSWORD || "medo3345";
const sessions = new Set();

await getDb();

app.use(express.json({ limit: "1mb" }));

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "مش مسموح تدخل هنا من غير تسجيل أدمن." });
  }
  next();
}

app.get("/api/game", (req, res) => {
  res.json(getGame());
});

app.post("/api/submissions", (req, res) => {
  addSubmission(req.body);
  res.json({ ok: true });
});

app.post("/api/drafts", (req, res) => {
  const sessionId = String(req.body?.sessionId || "");
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId مطلوب." });
  }

  upsertDraft(sessionId, req.body);
  res.json({ ok: true });
});

app.post("/api/admin/login", (req, res) => {
  if (req.body?.password !== adminPassword) {
    return res.status(401).json({ error: "الباسورد غلط." });
  }

  const token = crypto.randomBytes(24).toString("hex");
  sessions.add(token);
  res.json({ token });
});

app.get("/api/admin/dashboard", requireAdmin, (req, res) => {
  res.json({
    game: getGame(),
    drafts: getDrafts(),
    submissions: getSubmissions()
  });
});

app.put("/api/admin/game", requireAdmin, (req, res) => {
  if (!req.body?.title || !Array.isArray(req.body?.levels)) {
    return res.status(400).json({ error: "البيانات ناقصة." });
  }

  setGame(req.body);
  res.json({ ok: true, game: getGame() });
});

app.delete("/api/admin/submissions/:id", requireAdmin, (req, res) => {
  deleteSubmission(Number(req.params.id));
  res.json({ ok: true });
});

const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`5aleek fe 7alak is running on http://localhost:${port}`);
});
