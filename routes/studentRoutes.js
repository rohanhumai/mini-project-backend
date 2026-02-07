// Express framework
const express = require("express");

// Router instance (student routes ke liye)
const router = express.Router();

// ======== AUTH MIDDLEWARE ========
// protect → JWT verify karta hai (login compulsory)
// authorize → role check karta hai (sirf student allow)
const { protect, authorize } = require("../middleware/auth");

// ======== STUDENT CONTROLLERS ========
const {
  getProfile,
  scanAttendance,
  getAttendanceHistory,
  getAttendanceSummary,
  getDashboard,
} = require("../controllers/studentController");

// ==================== GLOBAL MIDDLEWARE ====================

// 🔒 Is router ke saare routes ke liye
// pehle user logged-in hona chahiye
router.use(protect);

// 🎓 Sirf student role allow
// teacher / admin yahin block ho jaayenge
router.use(authorize("student"));

// ==================== STUDENT ROUTES ====================

// @route   GET /api/student/profile
// @desc    Student ka profile (branch, semester, section)
router.get("/profile", getProfile);

// @route   GET /api/student/dashboard
// @desc    Student dashboard (today lectures, recent attendance, stats)
router.get("/dashboard", getDashboard);

// @route   POST /api/student/scan-attendance
// @desc    QR scan karke attendance mark karna
router.post("/scan-attendance", scanAttendance);

// @route   GET /api/student/attendance
// @desc    Student ki complete attendance history (pagination + filters)
router.get("/attendance", getAttendanceHistory);

// @route   GET /api/student/attendance/summary
// @desc    Subject-wise attendance summary + percentage
router.get("/attendance/summary", getAttendanceSummary);

// Export router (main app.js / server.js me mount hota hai)
module.exports = router;
