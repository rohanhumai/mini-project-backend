const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getProfile,
  scanAttendance,
  getAttendanceHistory,
  getAttendanceSummary,
  getDashboard,
} = require("../controllers/studentController");

router.use(protect);
router.use(authorize("student"));

router.get("/profile", getProfile);
router.get("/dashboard", getDashboard);
router.post("/scan-attendance", scanAttendance);
router.get("/attendance", getAttendanceHistory);
router.get("/attendance/summary", getAttendanceSummary);

module.exports = router;
