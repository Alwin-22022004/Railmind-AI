const pool = require("../config/db");

(async () => {
  try {
    console.log("============================================");
    console.log(" RailMind AI — Database Verification");
    console.log("============================================");

    // 1. Connection info
    const info = await pool.query(
      "SELECT current_database() as db, current_user as usr"
    );
    console.log(`Database: ${info.rows[0].db} | User: ${info.rows[0].usr}\n`);

    // 2. Applied migrations
    const migCheck = await pool.query(`
      SELECT to_regclass('public.schema_migrations') as reg;
    `);

    if (migCheck.rows[0].reg) {
      const migs = await pool.query(
        "SELECT filename, applied_at FROM schema_migrations ORDER BY id ASC;"
      );
      console.log(`Applied Migrations (${migs.rows.length}):`);
      for (const m of migs.rows) {
        console.log(`  ✓ ${m.filename} (applied: ${m.applied_at.toISOString()})`);
      }
    } else {
      console.log("⚠️ schema_migrations table does not exist yet.");
    }
    console.log("");

    // 3. Existing tables in public schema
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`Public Tables (${tables.rows.length}):`);
    const tableNames = tables.rows.map((r) => r.table_name);
    console.log("  " + tableNames.join(", "));
    console.log("");

    // 4. Verify required tables
    const requiredTables = [
      "users",
      "assets",
      "telemetry",
      "predictions",
      "alerts",
      "maintenance_logs",
      "permissions",
      "role_permissions",
      "user_permissions",
      "schema_migrations",
    ];

    const missingTables = requiredTables.filter((t) => !tableNames.includes(t));
    if (missingTables.length === 0) {
      console.log("✅ All 10 expected tables exist!");
    } else {
      console.log("⚠️ Missing tables:", missingTables.join(", "));
    }
    console.log("");

    // 5. Seeded assets count and sample
    if (tableNames.includes("assets")) {
      const assets = await pool.query(
        "SELECT asset_code, name, status, zone FROM assets ORDER BY asset_code;"
      );
      console.log(`Seeded Assets (${assets.rows.length}):`);
      for (const a of assets.rows) {
        console.log(`  • ${a.asset_code} | ${a.name} | ${a.status} | ${a.zone}`);
      }
    }

    // 6. Permissions count
    if (tableNames.includes("permissions")) {
      const perms = await pool.query("SELECT COUNT(*) as cnt FROM permissions;");
      console.log(`\nPermissions seeded: ${perms.rows[0].cnt}`);
    }

    console.log("============================================\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Verification failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
