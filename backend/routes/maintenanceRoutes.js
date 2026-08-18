const express = require("express");
const router = express.Router();
const controller = require("../controllers/maintenanceController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
router.get("/", requireAuth, requirePermission("maintenance.view"), controller.listLogs);
router.post("/", requireAuth, requirePermission("maintenance.manage"), controller.createLog);
module.exports = router;
