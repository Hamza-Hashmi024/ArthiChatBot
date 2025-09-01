// utils/sql.js

// ✅ Clean SQL from AI output (remove ```sql fences etc.)
function extractFirstLine(sql) {
  if (!sql) return "";
  return sql
    .replace(/```sql/gi, "")   // remove starting ```sql
    .replace(/```/g, "")       // remove ending ```
    .trim();                   // clean spaces/newlines
}

// ✅ Check if query is safe SELECT only
function isSafeSelect(sql, allowedTables = []) {
  if (!sql) return { ok: false, reason: "Empty SQL" };

  const s = sql.trim();
  const upper = s.toUpperCase();

  // ❌ Block multiple statements like "SELECT ...; DROP TABLE ..."
  if ((s.match(/;/g) || []).length > 1) {
    return { ok: false, reason: "Multiple statements not allowed" };
  }

  // ❌ Only allow SELECT
  if (!upper.startsWith("SELECT")) {
    return { ok: false, reason: "Only SELECT is allowed" };
  }

  // ❌ Block dangerous keywords
  const forbidden = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
    "CREATE", "TRUNCATE", "GRANT", "REVOKE",
    "SHOW", "DESCRIBE", "USE", "WITH ", "--", "/*", "*/"
  ];
  if (forbidden.some(k => upper.includes(k))) {
    return { ok: false, reason: "Forbidden keyword detected" };
  }

  // ❌ Allow only whitelisted tables (if provided)
  if (allowedTables && allowedTables.length) {
    const tableMentions = [...s.matchAll(/\b(FROM|JOIN)\s+([`"]?)([a-zA-Z0-9_]+)\2/gi)]
      .map(m => m[3].toLowerCase());

    const notAllowed = tableMentions.filter(t => !allowedTables.includes(t));
    if (notAllowed.length) {
      return { ok: false, reason: `Disallowed table(s): ${notAllowed.join(", ")}` };
    }
  }

  return { ok: true };
}

// ✅ Enforce LIMIT if missing (to prevent huge result sets)
function enforceLimitIfNeeded(sql) {
  const s = sql.trim();
  const upper = s.toUpperCase();

  // Check if query is aggregate (COUNT, SUM, etc.)
  const isAggregate = /(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(s);
  const hasLimit = /\bLIMIT\s+\d+/i.test(s);

  // If not aggregate & no LIMIT → add LIMIT 100
  if (!isAggregate && !hasLimit) {
    return `${s} LIMIT 100`;
  }

  return s;
}

module.exports = { extractFirstLine, isSafeSelect, enforceLimitIfNeeded };
