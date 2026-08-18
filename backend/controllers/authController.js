const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* ===========================
   Register User
=========================== */

const register = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Validate Input
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required.",
            });
        }

        // Check if Email Exists
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists.",
            });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert User
        const result = await pool.query(
            `INSERT INTO users
            (full_name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, full_name, email, role, created_at`,
            [fullName, email, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            user: result.rows[0],
        });

    } catch (error) {

        console.error("Register Error:", error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error.",
        });

    }
};


/* ===========================
   Login User
=========================== */

const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        // Validate Input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and Password are required.",
            });
        }

        // Find User
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const user = result.rows[0];

        // Compare Password
        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        // Check User Status
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated.",
            });
        }

        // Generate JWT Token
        const permissionsResult = await pool.query(
            `SELECT p.code
             FROM permissions p
             WHERE (EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role=$1 AND rp.permission_code=p.code)
                    OR EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id=$2 AND up.permission_code=p.code AND up.allowed=TRUE))
               AND NOT EXISTS (SELECT 1 FROM user_permissions deny_up WHERE deny_up.user_id=$2 AND deny_up.permission_code=p.code AND deny_up.allowed=FALSE)
             ORDER BY p.category,p.code`,
            [user.role, user.id]
        );
        const permissions = permissionsResult.rows.map((r) => r.code);

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d",
            }
        );

        res.status(200).json({
            success: true,
            message: "Login Successful.",
            token,
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                permissions,
            },
        });

    } catch (error) {

        console.error("Login Error:", error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error.",
        });

    }

};

module.exports = {
    register,
    login,
};