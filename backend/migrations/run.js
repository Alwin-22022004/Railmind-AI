const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const fs = require("fs");
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
    // 1. Create schema_migrations tracking table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Fetch set of already applied migrations
    const appliedRes = await pool.query("SELECT filename FROM schema_migrations");
    const appliedSet = new Set(appliedRes.rows.map((r) => r.filename));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏩ Skipping ${file} (already applied)`);
        continue;
      }

      const filePath = path.join(dir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      console.log(`\n▶ Running ${file}...`);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
          [file]
        );
        await client.query("COMMIT");
        console.log(`✅ ${file} applied successfully`);
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(`❌ Migration ${file} failed:`, err);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log("\n🎉 All migration checks completed successfully.");
  } catch (err) {
    console.error("\n❌ Migration runner terminated with error.");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigrations();