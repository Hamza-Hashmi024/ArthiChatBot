const pool = require("../config/db");
const { fetchSchemaAndSamples } = require("../services/schemaFetcher");
const { generateSQL } = require("../services/gemini");
const { extractFirstLine, isSafeSelect, enforceLimitIfNeeded } = require("../utils/sql");

let cached = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getCachedSchema(force = false) {
  if (cached && !force && (Date.now() - cached.ts) < CACHE_TTL) return cached;
  const data = await fetchSchemaAndSamples(3); // 3 sample rows per table
  cached = { ...data, ts: Date.now() };
  return cached;
}

// ------------------ CONTROLLERS ------------------

// POST /api/chat
exports.chatWithDB = async (req, res) => {
  try {
    const { question, refreshSchema } = req.body || {};
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const { schema, samples } = await getCachedSchema(!!refreshSchema);

    // 1) Generate SQL using Gemini
    const raw = await generateSQL(question, schema, samples);
    if (!raw) return res.status(500).json({ error: "No response from LLM" });

    if (raw.trim() === "OUT_OF_SCOPE") {
      return res.status(400).json({
        question,
        message: "Sorry, this question is not related to the database schema."
      });
    }

    // 2) Clean + validate SQL
   let sql = extractFirstLine(raw);
sql = sql.replace(/```sql/gi, "").replace(/```/g, "").trim();

const allowedTables = Object.keys(schema).map(t => t.toLowerCase());
const safe = isSafeSelect(sql, allowedTables);

if (!safe.ok) {
  return res.status(400).json({
    question,
    generated: sql,
    error: `Blocked unsafe SQL: ${safe.reason}`
  });
}

    // 3) Enforce LIMIT
    sql = enforceLimitIfNeeded(sql);

    // 4) Execute
    const [rows] = await pool.query(sql);

    return res.json({
      question,
      query: sql,
      rows,
      rowCount: Array.isArray(rows) ? rows.length : 0
    });

  } catch (err) {
    console.error("/api/chat error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// GET /api/chat/schema
exports.getSchema = async (req, res) => {
  const { schema, samples } = await getCachedSchema();
  return res.json({ schema, samples }); // ⚠️ debug only, avoid in prod
};