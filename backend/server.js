require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

// NEW
const authRoutes = require("./routes/authRoutes");
const telemetryRoutes = require("./routes/telemetryRoutes");
const userRoutes = require("./routes/userRoutes");
const assetRoutes = require("./routes/assetRoutes");
const alertRoutes = require("./routes/alertRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// NEW
app.use("/api/auth", authRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/maintenance", maintenanceRoutes);

// Home Route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "RailMind AI Backend Running 🚆",
    });
});

// Database Test Route
app.get("/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            time: result.rows[0].now,
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: "Database Connection Failed",
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});