// Express framework
const express = require("express");

// Router instance (teacher routes ke liye)
const router = express.Router();

// ======== AUTH MIDDLEWARE ========
// protect   → JWT verify karta hai (login compulsory)
// authorize → role-based access control
const { protect, authorize } = require("../middleware/auth");

// ======== TEACHER CONTROLLERS ========
const {
  getProfile,
  generateLectureQR,
  getLectures,
  getLectureAttendance,
  updateAttendance,
  markAttendanceManually,
  deleteAttendance,
  getAssignedBranchesSubjects,
  getDashboardStats,
} = require("../controllers/teacherController");

// ==================== GLOBAL MIDDLEWARE ====================

// 🔒 Is router ke saare routes ke liye
// user ka logged-in hona compulsory
router.use(protect);

// 🎓 Teacher aur Admin dono allowed
// Student yahin pe block ho jaayega
router.use(authorize("teacher", "admin"));

// ==================== BASIC TEACHER INFO ====================

// @route   GET /api/teacher/profile
// @desc    Teacher profile (branches, subjects, identity)
router.get("/profile", getProfile);

// @route   GET /api/teacher/dashboard
// @desc    Teacher dashboard (today lectures, active QR, stats)
router.get("/dashboard", getDashboardStats);

// @route   GET /api/teacher/assigned
// @desc    Teacher ko kaunse branches aur subjects assigned hain
router.get("/assigned", getAssignedBranchesSubjects);

// ==================== LECTURE ROUTES ====================

// @route   POST /api/teacher/lectures/generate-qr
// @desc    New lecture create karke QR generate karna
router.post("/lectures/generate-qr", generateLectureQR);

// @route   GET /api/teacher/lectures
// @desc    Teacher ke saare lectures (filters + pagination)
router.get("/lectures", getLectures);

// @route   GET /api/teacher/lectures/:lectureId/attendance
// @desc    Particular lecture ka full attendance list
router.get("/lectures/:lectureId/attendance", getLectureAttendance);

// @route   POST /api/teacher/lectures/:lectureId/mark-attendance
// @desc    Student ka attendance manually mark karna
router.post("/lectures/:lectureId/mark-attendance", markAttendanceManually);

// ==================== ATTENDANCE MANAGEMENT ====================

// @route   PUT    /api/teacher/attendance/:attendanceId
// @desc    Attendance status update (present/late/absent)

// @route   DELETE /api/teacher/attendance/:attendanceId
// @desc    Attendance record delete karna
router
  .route("/attendance/:attendanceId")
  .put(updateAttendance)
  .delete(deleteAttendance);

// Export router (main app/server file me mount hota hai)
module.exports = router;
