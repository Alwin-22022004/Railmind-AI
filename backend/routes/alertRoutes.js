const express = require("express");
const router = express.Router();
const controller = require("../controllers/alertController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");

router.get("/", requireAuth, requirePermission("alerts.view"), controller.getAlerts);
router.patch("/:id/acknowledge", requireAuth, requirePermission("alerts.manage"), controller.acknowledgeAlert);
router.patch("/:id/assign", requireAuth, requirePermission("alerts.manage"), controller.assignAlert);
router.patch("/:id/resolve", requireAuth, requirePermission("alerts.manage"), controller.resolveAlert);

module.exports = router;
