
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;
const useSsl =
  Boolean(databaseUrl) || process.env.DB_SSL === "true";

const poolConfig = databaseUrl
  ? {
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  }
  : {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(useSsl
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  };

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL connection error:", err.message);
});

module.exports = pool;
