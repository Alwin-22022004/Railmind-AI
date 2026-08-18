const pool = require("../config/db");
const bcrypt = require("bcrypt");

async function getEffectivePermissions(userId, role) {
  const result = await pool.query(
    `SELECT p.code
     FROM permissions p
     WHERE (
       EXISTS (
         SELECT 1 FROM role_permissions rp
         WHERE rp.role = $2 AND rp.permission_code = p.code
       )
       OR EXISTS (
         SELECT 1 FROM user_permissions up
         WHERE up.user_id = $1 AND up.permission_code = p.code AND up.allowed = TRUE
       )
     )
     AND NOT EXISTS (
       SELECT 1 FROM user_permissions deny_up
       WHERE deny_up.user_id = $1 AND deny_up.permission_code = p.code AND deny_up.allowed = FALSE
     )
     ORDER BY p.category, p.code`,
    [userId, role]
  );
  return result.rows.map((r) => r.code);
}

async function getRoleDefaults(role) {
  const result = await pool.query(
    `SELECT permission_code FROM role_permissions WHERE role = $1 ORDER BY permission_code`,
    [role]
  );
  return result.rows.map((r) => r.permission_code);
}

async function listPermissions() {
  const result = await pool.query(
    `SELECT code, label, description, category FROM permissions ORDER BY category, label`
  );
  return result.rows;
}

const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, is_active, created_at, updated_at
       FROM users ORDER BY created_at DESC`
    );
    const users = await Promise.all(result.rows.map(async (user) => ({
      ...user,
      permissions: await getEffectivePermissions(user.id, user.role),
    })));
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Users list error:", error);
    res.status(500).json({ success: false, message: "Failed to load users" });
  }
};

const createUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { fullName, email, password, role = "USER", permissions } = req.body;
    const normalizedRole = String(role).toUpperCase();
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "Full name, email and password are required." });
    }
    if (!["ADMIN", "OPERATOR", "MAINTENANCE", "USER"].includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: "Invalid role." });
    }

    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.rows.length) {
      return res.status(409).json({ success: false, message: "Email already exists." });
    }

    await client.query("BEGIN");
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO users(full_name,email,password_hash,role)
       VALUES ($1,$2,$3,$4)
       RETURNING id,full_name,email,role,is_active,created_at,updated_at`,
      [fullName.trim(), email.trim().toLowerCase(), passwordHash, normalizedRole]
    );
    const user = result.rows[0];

    if (Array.isArray(permissions)) {
      for (const code of permissions) {
        await client.query(
          `INSERT INTO user_permissions(user_id,permission_code,allowed)
           VALUES ($1,$2,TRUE)
           ON CONFLICT (user_id,permission_code) DO UPDATE SET allowed=TRUE,updated_at=NOW()`,
          [user.id, code]
        );
      }
    }

    await client.query("COMMIT");
    user.permissions = await getEffectivePermissions(user.id, user.role);
    res.status(201).json({ success: true, message: "User created successfully.", data: user });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Failed to create user" });
  } finally {
    client.release();
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot deactivate your own account." });
    }
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING id, full_name, email, role, is_active, updated_at`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ success:false, message:"User not found." });
    res.json({ success: true, message: "User status updated.", data: result.rows[0] });
  } catch (error) {
    console.error("Toggle status error:", error);
    res.status(500).json({ success:false, message:"Failed to update user status" });
  }
};

const updateUserAccess = async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot change your own role or privileges." });
    }

    const { role, permissions = [] } = req.body;
    const normalizedRole = String(role || "").toUpperCase();
    if (!["ADMIN", "OPERATOR", "MAINTENANCE", "USER"].includes(normalizedRole)) {
      return res.status(400).json({ success:false, message:"Invalid role." });
    }

    const allowedCodes = await pool.query("SELECT code FROM permissions");
    const allowed = new Set(allowedCodes.rows.map((r) => r.code));
    const requested = [...new Set(permissions)].filter((p) => allowed.has(p));

    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2
       RETURNING id,full_name,email,role,is_active,created_at,updated_at`,
      [normalizedRole, id]
    );
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success:false, message:"User not found." });
    }

    await client.query("DELETE FROM user_permissions WHERE user_id = $1", [id]);
    for (const code of requested) {
      await client.query(
        `INSERT INTO user_permissions(user_id,permission_code,allowed)
         VALUES ($1,$2,TRUE)`,
        [id, code]
      );
    }
    await client.query("COMMIT");

    const user = result.rows[0];
    user.permissions = await getEffectivePermissions(user.id, user.role);
    res.json({ success:true, message:"User role and privileges updated.", data:user });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Update access error:", error);
    res.status(500).json({ success:false, message:"Failed to update user access" });
  } finally {
    client.release();
  }
};

const getUserAccess = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query("SELECT id, full_name, email, role FROM users WHERE id=$1", [id]);
    if (!result.rows.length) return res.status(404).json({ success:false, message:"User not found." });
    const user = result.rows[0];
    const roleDefaults = await getRoleDefaults(user.role);
    const permissions = await getEffectivePermissions(user.id, user.role);
    res.json({ success:true, data:{ user, permissions, roleDefaults } });
  } catch (error) {
    console.error("User access read error:", error);
    res.status(500).json({ success:false, message:"Failed to load user access" });
  }
};

const getMyAccess = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, full_name, email, role, is_active FROM users WHERE id=$1", [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ success:false, message:"User not found." });
    const user = result.rows[0];
    const permissions = await getEffectivePermissions(user.id, user.role);
    res.json({ success:true, data:{ ...user, permissions } });
  } catch (error) {
    console.error("My access error:", error);
    res.status(500).json({ success:false, message:"Failed to load your access" });
  }
};

const getPermissions = async (req, res) => {
  try {
    res.json({ success:true, data: await listPermissions() });
  } catch (error) {
    console.error("Permissions error:", error);
    res.status(500).json({ success:false, message:"Failed to load permissions" });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  toggleUserStatus,
  updateUserAccess,
  getUserAccess,
  getMyAccess,
  getPermissions,
};
