require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function runMigrations() {
  const dir = __dirname;

  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No .sql migration files found.");
    process.exit(0);
  }

  try {
    for (const file of files) {
      const filePath = path.join(dir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      console.log(`\n▶ Running ${file}...`);
      await pool.query(sql);
      console.log(`✅ ${file} applied successfully`);
    }

    console.log("\n🎉 All migrations applied successfully.");
  } catch (err) {
    console.error("\n❌ Migration failed:");
    console.error(err);
  } finally {
    await pool.end();
    process.exit();
  }
}

runMigrations();