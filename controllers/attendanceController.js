// Attendance records (QR scan ke baad jo entry banti hai)
const Attendance = require("../models/Attendance");

// Lecture session (teacher ne QR generate kiya)
const Lecture = require("../models/Lecture");

// Student academic profile
const Student = require("../models/Student");

// ==================== GET ATTENDANCE BY DATE ====================

// @desc    Kisi ek date ka complete attendance (lecture-wise)
// @route   GET /api/attendance/by-date
// @access  Private
exports.getAttendanceByDate = async (req, res) => {
  try {
    // Query params
    const { date, branch, subject } = req.query;

    // Date ke start ka time (00:00:00)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    // Date ke end ka time (23:59:59)
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // ======== LECTURE FILTER ========
    // Pehle lectures nikalo, phir unka attendance
    let lectureQuery = {
      date: { $gte: startOfDay, $lte: endOfDay },
    };

    // Optional branch filter
    if (branch) lectureQuery.branch = branch;

    // Optional subject filter
    if (subject) lectureQuery["subject.code"] = subject;

    // Matching lectures fetch karo
    const lectures = await Lecture.find(lectureQuery)
      .populate("branch") // branch details (CS, AIML, etc.)
      .populate({
        path: "teacher",
        populate: { path: "user", select: "name" }, // teacher ka naam
      });

    // ======== HAR LECTURE KA ATTENDANCE ========
    const attendanceData = await Promise.all(
      lectures.map(async (lecture) => {
        // Us lecture ke saare attendance records
        const attendance = await Attendance.find({
          lecture: lecture._id,
        }).populate({
          path: "student",
          populate: [
            { path: "user", select: "name email" }, // student name/email
            { path: "branch", select: "code name" }, // student branch
          ],
        });

        // Lecture + uska attendance ek object me
        return {
          lecture,
          attendance,
        };
      }),
    );

    // Final response
    res.json({ success: true, data: attendanceData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== EXPORT ATTENDANCE ====================

// @desc    Attendance export (JSON ya CSV)
// @route   GET /api/attendance/export
// @access  Private/Teacher/Admin
exports.exportAttendance = async (req, res) => {
  try {
    const { branch, subject, startDate, endDate, format = "json" } = req.query;

    // ======== LECTURE FILTER ========
    let lectureQuery = {};

    if (branch) lectureQuery.branch = branch;
    if (subject) lectureQuery["subject.code"] = subject;

    // Date range filter
    if (startDate && endDate) {
      lectureQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Lectures fetch (date-wise sorted)
    const lectures = await Lecture.find(lectureQuery)
      .populate("branch")
      .populate({
        path: "teacher",
        populate: { path: "user", select: "name" },
      })
      .sort({ date: 1 });

    // ======== EXPORT FORMAT DATA ========
    const exportData = await Promise.all(
      lectures.map(async (lecture) => {
        // Us lecture ka attendance
        const attendance = await Attendance.find({
          lecture: lecture._id,
        }).populate({
          path: "student",
          populate: { path: "user", select: "name" },
        });

        // Structured export object
        return {
          date: lecture.date,
          subject: lecture.subject,
          branch: lecture.branch.code,
          teacher: lecture.teacher.user.name,
          time: `${lecture.startTime} - ${lecture.endTime}`,
          attendance: attendance.map((a) => ({
            rollNumber: a.student.rollNumber,
            name: a.student.user.name,
            status: a.status, // present / late / absent
            markedAt: a.markedAt, // QR scan timestamp
          })),
        };
      }),
    );

    // ======== CSV EXPORT ========
    if (format === "csv") {
      // CSV header
      let csvContent =
        "Date,Subject,Branch,Teacher,Roll Number,Name,Status,Marked At\n";

      // CSV rows
      exportData.forEach((lecture) => {
        lecture.attendance.forEach((att) => {
          csvContent +=
            `${lecture.date.toISOString().split("T")[0]},` +
            `${lecture.subject.name},` +
            `${lecture.branch},` +
            `${lecture.teacher},` +
            `${att.rollNumber},` +
            `${att.name},` +
            `${att.status},` +
            `${att.markedAt}\n`;
        });
      });

      // CSV download headers
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=attendance.csv",
      );

      return res.send(csvContent);
    }

    // Default JSON response
    res.json({ success: true, data: exportData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
