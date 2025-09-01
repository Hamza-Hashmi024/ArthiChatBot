const pool = require("../config/db");

async function fetchSchemaAndSamples(sampleLimit = 3) {
  const conn = await pool.getConnection(); // get a connection from pool
  try {
    // Step 1: Get all table names
    const [tablesRows] = await conn.query("SHOW TABLES");
    const tables = tablesRows.map(r => Object.values(r)[0]);

    // Step 2: Prepare objects to hold schema + sample rows
    const schema = {};   // { tableName: [col1, col2, ...] }
    const samples = {};  // { tableName: [ {col:val}, ... ] }

    // Step 3: Loop through tables
    for (const table of tables) {
      // Get column names (DESCRIBE table)
      const [cols] = await conn.query("DESCRIBE ??", [table]);
      schema[table] = cols.map(c => c.Field);

      // Get few sample rows from the table
      const [rows] = await conn.query("SELECT * FROM ?? LIMIT ?", [table, sampleLimit]);
      samples[table] = rows;
    }

    // Step 4: Return both schema and sample data
    return { schema, samples };

  } finally {
    // Always release connection back to pool
    conn.release();
  }
}

module.exports = { fetchSchemaAndSamples };