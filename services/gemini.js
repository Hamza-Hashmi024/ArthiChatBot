const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in .env");
}

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = client.getGenerativeModel({ model: "gemini-1.5-flash" }); // adjust model if needed

function buildSchemaText(schema, samples) {
  // schema: { table: [cols] }, samples: { table: [rows] }
  let text = "";
  for (const [t, cols] of Object.entries(schema)) {
    text += `TABLE ${t} (${cols.join(", ")})\n`;
    const s = samples && samples[t];
    if (s && s.length) {
      text += `SAMPLE_ROWS ${t}:\n`;
      s.forEach((row, i) => {
        const rowText = Object.entries(row).map(([k,v]) => `${k}=${String(v)}`).join(", ");
        text += `  ${i+1}. ${rowText}\n`;
      });
    }
    text += "\n";
  }
  return text;
}

function buildPrompt(question, schema, samples) {
  const schemaText = buildSchemaText(schema, samples);

  return `
You are a strict MySQL SQL assistant. Use ONLY the schema and sample rows provided below.

${schemaText}

RULES:
- Return ONLY one valid MySQL SELECT statement and nothing else (no explanation, no code fences).
- If the question cannot be answered using ONLY this schema, reply exactly: OUT_OF_SCOPE
- DO NOT output INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE/GRANT/REVOKE/SHOW/DESCRIBE/USE/WITH.
- For non-aggregate queries include LIMIT 100 if not present.
- Use column names exactly as provided.

User question:
${question}
`.trim();
}

async function generateSQL(question, schema, samples) {
  const prompt = buildPrompt(question, schema, samples);

  // call Gemini
  const result = await model.generateContent(prompt);
  // result.response.text() may be how the SDK returns text (depends on SDK version)
  // we try to access it safely:
  try {
    const text = result.response && typeof result.response.text === "function"
      ? result.response.text()
      : (result.output || result.text || "").toString();
    return text.trim();
  } catch (err) {
    // fallback
    return (result.output?.[0]?.content?.text || "").trim();
  }
}

module.exports = { generateSQL };