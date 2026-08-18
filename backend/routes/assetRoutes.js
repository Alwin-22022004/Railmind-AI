const express = require("express");
const router = express.Router();
const controller = require("../controllers/assetController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
const { requireSimulatorKey } = require("../middleware/simulatorMiddleware");

router.get("/", requireAuth, requirePermission("compressors.view"), controller.listAssets);

// Internal endpoint used only by the simulator to discover currently active compressors.
router.get("/simulation/active", requireSimulatorKey, controller.listSimulationAssets);
router.post("/", requireAuth, requirePermission("assets.manage"), controller.createAsset);
router.put("/:id", requireAuth, requirePermission("assets.manage"), controller.updateAsset);
router.patch("/:id/deactivate", requireAuth, requirePermission("assets.manage"), controller.deactivateAsset);

module.exports = router;
