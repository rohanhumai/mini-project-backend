// Express framework
const express = require("express");

// Router instance (modular routing ke liye)
const router = express.Router();

// ======== AUTH MIDDLEWARE ========
// protect → JWT verify karta hai
// authorize → role-based access control (RBAC)
const { protect, authorize } = require("../middleware/auth");

// ======== ADMIN CONTROLLERS ========
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

// ==================== GLOBAL MIDDLEWARE ====================

// 🔒 Iske neeche jitni bhi routes hain
// un sab ke liye login REQUIRED hai
router.use(protect);

// 🔒 Sirf admin role allow hai
// student / teacher yahin pe block ho jaayenge
router.use(authorize("admin"));

// ==================== DASHBOARD ====================

// @route   GET /api/admin/dashboard
// @desc    Admin dashboard stats (counts, charts, activity)
router.get("/dashboard", getDashboardStats);

// ==================== USER MANAGEMENT ====================

// @route   GET  /api/admin/users
// @desc    Get all users (pagination, search, filter)

// @route   POST /api/admin/users
// @desc    Create new user (student / teacher / admin)
router.route("/users").get(getAllUsers).post(createUser);

// @route   PUT    /api/admin/users/:id
// @desc    Update user & profile

// @route   DELETE /api/admin/users/:id
// @desc    Delete user completely
router.route("/users/:id").put(updateUser).delete(deleteUser);

// ==================== BRANCH MANAGEMENT ====================

// @route   GET  /api/admin/branches
// @desc    Get all branches

// @route   POST /api/admin/branches
// @desc    Create new branch
router.route("/branches").get(getAllBranches).post(createBranch);

// @route   PUT    /api/admin/branches/:id
// @desc    Update branch

// @route   DELETE /api/admin/branches/:id
// @desc    Delete branch (only if no students)
router.route("/branches/:id").put(updateBranch).delete(deleteBranch);

// ==================== REPORTS ====================

// @route   GET /api/admin/reports/attendance
// @desc    Attendance analytics & reports (date/branch/subject)
router.get("/reports/attendance", getAttendanceReport);

// Export router to be mounted in main app
module.exports = router;
