const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getDashboardStats,
  getAttendanceReport,
} = require("../controllers/adminController");

// All routes require admin access
router.use(protect);
router.use(authorize("admin"));

// Dashboard
router.get("/dashboard", getDashboardStats);

// User management
router.route("/users").get(getAllUsers).post(createUser);

router.route("/users/:id").put(updateUser).delete(deleteUser);

// Branch management
router.route("/branches").get(getAllBranches).post(createBranch);

router.route("/branches/:id").put(updateBranch).delete(deleteBranch);

// Reports
router.get("/reports/attendance", getAttendanceReport);

module.exports = router;
