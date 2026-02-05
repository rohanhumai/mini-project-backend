const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
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

router.use(protect);
router.use(authorize("teacher", "admin"));

router.get("/profile", getProfile);
router.get("/dashboard", getDashboardStats);
router.get("/assigned", getAssignedBranchesSubjects);

// Lecture routes
router.post("/lectures/generate-qr", generateLectureQR);
router.get("/lectures", getLectures);
router.get("/lectures/:lectureId/attendance", getLectureAttendance);
router.post("/lectures/:lectureId/mark-attendance", markAttendanceManually);

// Attendance management
router
  .route("/attendance/:attendanceId")
  .put(updateAttendance)
  .delete(deleteAttendance);

module.exports = router;
