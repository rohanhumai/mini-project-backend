// Express framework
const express = require("express");

// Router instance (modular route handling)
const router = express.Router();

// ======== AUTH MIDDLEWARE ========
// protect → JWT verify karta hai (login required)
// authorize → role-based access control
const { protect, authorize } = require("../middleware/auth");

// ======== CONTROLLERS ========
const {
  getAttendanceByDate,
  exportAttendance,
} = require("../controllers/attendanceController");

// ==================== GLOBAL AUTH ====================

// 🔒 Is router ke saare routes ke liye
// user ka logged-in hona compulsory hai
router.use(protect);

// ==================== ATTENDANCE VIEW ====================

// @route   GET /api/attendance/by-date
// @desc    Kisi ek date ka attendance (lecture-wise)
// @access  Private (student / teacher / admin)
router.get("/by-date", getAttendanceByDate);

// ==================== ATTENDANCE EXPORT ====================

// @route   GET /api/attendance/export
// @desc    Attendance export (JSON / CSV)
// @access  Private (sirf teacher aur admin)
router.get(
  "/export",
  authorize("teacher", "admin"), // role gate
  exportAttendance,
);

// Export router
module.exports = router;
