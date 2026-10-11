const pool = require("../config/db");

(async () => {
  try {
    const res = await pool.query(
      "SELECT NOW() as current_time, current_database() as db_name, current_user as db_user"
    );
    console.log("✅ PostgreSQL connection test successful!");
    console.log("   Connected Database :", res.rows[0].db_name);
    console.log("   Connected User     :", res.rows[0].db_user);
    console.log("   Database Timestamp :", res.rows[0].current_time);
    process.exit(0);
  } catch (err) {
    console.error("❌ PostgreSQL connection test failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
