import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";

const dbPath = path.join(process.cwd(), "data", "game.sqlite");
const dataDir = path.dirname(dbPath);

const defaultGame = {
  title: "5aleek fe 7alak",
  welcomeText: "في لعبة صغيرة معمولالك مخصوص... جاهزة؟",
  endingMessage:
    "بصراحة أنا مبسوط إنك وصلتي للنهاية 💛\nاللعبة دي معمولالك عشان تضحكي وتتبسطي،\nأنا دايمًا عايز أشوفك مبسوطة ورايقة كدا، حتى لو الدنيا حوالينا مش أحسن حاجة\n\nوجودك لوحده بيغير مودي، فـ تخيلي بقى لما تكوني إنتي كمان مبسوطة\nفخليكي دايمًا زي ما انتي... خفيفة ولطيفة وبتنوري أي مكان تدخليه ✨\n\nولو اللعبة عجبتك، يبقى أنا كدا نجحت في أهم ليفل 😄",
  levels: [
    {
      id: "level-1",
      label: "Level 1",
      type: "multi-answer",
      title: "أكتر أربع كلمات بتقوليهم",
      prompt: "اي اكتر اربع كلمات انتي بتقوليهم؟",
      helper: "اكتبي الأربع إجابات عشان تفتحي اللي بعده.",
      minLength: 1,
      answers: ["خليك ف حالك", "ونت مالك انت", "بملح", "بجض"]
    },
    {
      id: "level-2",
      label: "Level 2",
      type: "textarea",
      title: "حاجة بتفرحك",
      prompt: "اي اكتر حاجة ممكن تكون بتفرحك وقت مبتحصل ف يومك او حياتك؟",
      helper: "اكتبي براحتك، مفيش إجابة غلط.",
      minLength: 8,
      answers: []
    },
    {
      id: "level-3",
      label: "Level 3",
      type: "dual-textarea",
      title: "ضحك وزعل",
      prompt: "اكتر حاجة بتبسطك لما بنتكلم وهنهزر فيها؟",
      promptTwo: "واكتر حاجة بتدايقك لما بنتكلم فيها؟",
      helper: "اتنين بوكس، واحد للحلو وواحد للحاجة اللي بتضايقك.",
      minLength: 6,
      answers: []
    },
    {
      id: "final",
      label: "Final Level",
      type: "final-textarea",
      title: "اكتبي حاجة نفسك تقوليها",
      prompt: "اكتبي حاجة نفسك تقوليها وتعبري عنها بس عمرك مفكرتي تحكيها",
      helper: "لازم توصلي لـ 60 حرف على الأقل عشان النهاية تفتح.",
      minLength: 60,
      answers: []
    }
  ]
};

let SQL;
let db;

export async function getDb() {
  if (db) return db;

  SQL = await initSqlJs();
  fs.mkdirSync(dataDir, { recursive: true });
  const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
  `);

  const existing = db.exec("SELECT value FROM content WHERE key = 'game'");
  if (!existing.length) {
    setGame(defaultGame);
  }

  return db;
}

export function saveDb() {
  const bytes = db.export();
  fs.writeFileSync(dbPath, Buffer.from(bytes));
}

export function getGame() {
  const row = db.exec("SELECT value FROM content WHERE key = 'game' LIMIT 1");
  return JSON.parse(row[0].values[0][0]);
}

export function setGame(game) {
  db.run("INSERT OR REPLACE INTO content (key, value) VALUES (?, ?)", [
    "game",
    JSON.stringify(game)
  ]);
  saveDb();
}

export function addSubmission(payload) {
  db.run("INSERT INTO submissions (created_at, payload) VALUES (?, ?)", [
    new Date().toISOString(),
    JSON.stringify(payload)
  ]);
  saveDb();
}

export function getSubmissions() {
  const result = db.exec("SELECT id, created_at, payload FROM submissions ORDER BY id DESC");
  if (!result.length) return [];
  return result[0].values.map(([id, createdAt, payload]) => ({
    id,
    createdAt,
    payload: JSON.parse(payload)
  }));
}

export function deleteSubmission(id) {
  db.run("DELETE FROM submissions WHERE id = ?", [id]);
  saveDb();
}
