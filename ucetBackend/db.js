// db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "MySQL123",
  database: process.env.DB_NAME || "ucet_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
try {
  const connection = await pool.getConnection();
  console.log("✅ MySQL Database Connected Successfully!");
  connection.release();
} catch (err) {
  console.error("❌ Database connection failed:", err.message);
}
export default pool;
