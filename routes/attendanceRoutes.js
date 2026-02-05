const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getAttendanceByDate,
  exportAttendance,
} = require("../controllers/attendanceController");

router.use(protect);

router.get("/by-date", getAttendanceByDate);
router.get("/export", authorize("teacher", "admin"), exportAttendance);

module.exports = router;
