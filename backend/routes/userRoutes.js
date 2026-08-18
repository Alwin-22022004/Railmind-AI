const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");

router.get("/permissions", requireAuth, requirePermission("users.view"), controller.getPermissions);
router.get("/me/access", requireAuth, controller.getMyAccess);
router.get("/", requireAuth, requirePermission("users.view"), controller.getAllUsers);
router.post("/", requireAuth, requirePermission("users.manage"), controller.createUser);
router.get("/:id/access", requireAuth, requirePermission("users.manage"), controller.getUserAccess);
router.put("/:id/access", requireAuth, requirePermission("users.manage"), controller.updateUserAccess);
router.patch("/:id/toggle-status", requireAuth, requirePermission("users.manage"), controller.toggleUserStatus);

module.exports = router;
