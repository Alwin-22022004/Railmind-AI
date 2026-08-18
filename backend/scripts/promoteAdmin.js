require("dotenv").config();
const pool = require("../config/db");

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run promote-admin -- user@example.com");
    process.exit(1);
  }
  try {
    const result = await pool.query(
      `UPDATE users SET role='ADMIN', is_active=TRUE, updated_at=NOW()
       WHERE LOWER(email)=LOWER($1)
       RETURNING id,full_name,email,role`,
      [email]
    );
    if (!result.rows.length) throw new Error("User not found.");
    console.log("✅ User promoted to ADMIN:", result.rows[0]);
  } catch (e) {
    console.error("❌", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
