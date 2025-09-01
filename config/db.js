const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,  // ek time pe max 10 connections
  queueLimit: 0,
});

pool.getConnection()
  .then(() => {
    console.log("MySQL Connected Successfully (Pool)!");
  })
  .catch((error) => {
    console.error(" MySQL Connection Failed:", error.message);
    process.exit(1);
  });

module.exports = pool;