// ======== MODELS ========
// Student academic profile
const Student = require("../models/Student");

// Lecture session (QR generate entity)
const Lecture = require("../models/Lecture");

// Attendance record (QR scan output)
const Attendance = require("../models/Attendance");

// ==================== STUDENT PROFILE ====================

// @desc    Get student profile
// @route   GET /api/student/profile
// @access  Private/Student
exports.getProfile = async (req, res) => {
  try {
    // Logged-in user ke basis pe student profile nikalna
    const student = await Student.findOne({ user: req.user._id })
      .populate("user", "name email") // basic user info
      .populate("branch"); // branch details

    // Agar profile hi nahi mili
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Success response
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== SCAN QR & MARK ATTENDANCE ====================

// @desc    Scan QR and mark attendance
// @route   POST /api/student/scan-attendance
// @access  Private/Student
exports.scanAttendance = async (req, res) => {
  try {
    const { qrData, location, deviceInfo } = req.body;

    // ======== QR DATA PARSING ========
    let parsedData;
    try {
      // QR ke andar JSON hota hai
      parsedData = JSON.parse(qrData);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR code format",
      });
    }

    const { lectureCode, expiresAt } = parsedData;

    // ======== QR EXPIRY CHECK ========
    if (new Date(expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "QR code has expired. Please ask your teacher for a new one.",
      });
    }

    // ======== LECTURE FETCH ========
    const lecture = await Lecture.findOne({
      qrCodeData: lectureCode, // QR unique identifier
      isActive: true, // lecture still valid
    }).populate("branch");

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found or QR code is no longer active",
      });
    }

    // ======== STUDENT FETCH ========
    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // ======== AUTHORIZATION CHECKS ========
    // Branch mismatch
    if (student.branch.toString() !== lecture.branch._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this branch",
      });
    }

    // Semester mismatch
    if (student.semester !== lecture.semester) {
      return res.status(403).json({
        success: false,
        message: "This lecture is for a different semester",
      });
    }

    // Section mismatch
    if (student.section !== lecture.section) {
      return res.status(403).json({
        success: false,
        message: "This lecture is for a different section",
      });
    }

    // ======== DUPLICATE ATTENDANCE CHECK ========
    const existingAttendance = await Attendance.findOne({
      lecture: lecture._id,
      student: student._id,
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this lecture",
        data: existingAttendance,
      });
    }

    // ======== LATE / PRESENT LOGIC ========
    const now = new Date();

    // Lecture start time set karna
    const lectureDate = new Date(lecture.date);
    const [startHour, startMin] = lecture.startTime.split(":").map(Number);
    lectureDate.setHours(startHour, startMin, 0, 0);

    // 15 minute ka late threshold
    const lateThreshold = 15 * 60 * 1000;
    const status = now - lectureDate > lateThreshold ? "late" : "present";

    // ======== ATTENDANCE CREATE ========
    const attendance = await Attendance.create({
      lecture: lecture._id,
      student: student._id,
      status,
      location, // geo data (anti-proxy logic)
      deviceInfo, // device fingerprint
    });

    // Final response
    res.status(201).json({
      success: true,
      data: {
        attendance,
        lecture: {
          subject: lecture.subject,
          date: lecture.date,
          time: `${lecture.startTime} - ${lecture.endTime}`,
        },
      },
      message: `Attendance marked as ${status}!`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ATTENDANCE HISTORY ====================

// @desc    Get student's attendance history
// @route   GET /api/student/attendance
// @access  Private/Student
exports.getAttendanceHistory = async (req, res) => {
  try {
    const { subject, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Student identity
    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Base query (sirf apna data)
    let query = { student: student._id };

    // Attendance records fetch
    const attendanceRecords = await Attendance.find(query)
      .populate({
        path: "lecture",
        populate: [
          { path: "branch", select: "code name" },
          { path: "teacher", populate: { path: "user", select: "name" } },
        ],
      })
      .sort({ markedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Subject filter (client-side)
    let filteredRecords = attendanceRecords;
    if (subject) {
      filteredRecords = attendanceRecords.filter(
        (a) => a.lecture && a.lecture.subject.code === subject,
      );
    }

    // Date range filter
    if (startDate && endDate) {
      filteredRecords = filteredRecords.filter((a) => {
        const date = new Date(a.markedAt);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    }

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: filteredRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ATTENDANCE SUMMARY ====================

// @desc    Get attendance summary by subject
// @route   GET /api/student/attendance/summary
// @access  Private/Student
exports.getAttendanceSummary = async (req, res) => {
  try {
    // Student + branch info
    const student = await Student.findOne({ user: req.user._id }).populate(
      "branch",
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Student ke saare lectures
    const allLectures = await Lecture.find({
      branch: student.branch._id,
      semester: student.semester,
      section: student.section,
    });

    // Student ke attendance records
    const attendanceRecords = await Attendance.find({
      student: student._id,
    });

    // ======== SUBJECT-WISE SUMMARY ========
    const subjectSummary = {};

    // Total lectures count
    allLectures.forEach((lecture) => {
      const subjectCode = lecture.subject.code;
      if (!subjectSummary[subjectCode]) {
        subjectSummary[subjectCode] = {
          subjectCode,
          subjectName: lecture.subject.name,
          totalLectures: 0,
          present: 0,
          late: 0,
          absent: 0,
          percentage: 0,
        };
      }
      subjectSummary[subjectCode].totalLectures++;
    });

    // Present / late count
    attendanceRecords.forEach((record) => {
      const lecture = allLectures.find(
        (l) => l._id.toString() === record.lecture.toString(),
      );
      if (lecture) {
        const subjectCode = lecture.subject.code;
        if (record.status === "present") {
          subjectSummary[subjectCode].present++;
        } else if (record.status === "late") {
          subjectSummary[subjectCode].late++;
        }
      }
    });

    // Absent + percentage calculate
    Object.keys(subjectSummary).forEach((key) => {
      const summary = subjectSummary[key];
      summary.absent = summary.totalLectures - summary.present - summary.late;
      summary.percentage =
        summary.totalLectures > 0
          ? Math.round(
              ((summary.present + summary.late) / summary.totalLectures) * 100,
            )
          : 0;
    });

    // ======== OVERALL SUMMARY ========
    const overall = {
      totalLectures: allLectures.length,
      present: attendanceRecords.filter((a) => a.status === "present").length,
      late: attendanceRecords.filter((a) => a.status === "late").length,
      absent: 0,
      percentage: 0,
    };

    overall.absent = overall.totalLectures - overall.present - overall.late;

    overall.percentage =
      overall.totalLectures > 0
        ? Math.round(
            ((overall.present + overall.late) / overall.totalLectures) * 100,
          )
        : 0;

    res.json({
      success: true,
      data: {
        subjects: Object.values(subjectSummary),
        overall,
        student: {
          rollNumber: student.rollNumber,
          branch: student.branch.code,
          semester: student.semester,
          section: student.section,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== STUDENT DASHBOARD ====================

// @desc    Get student dashboard
// @route   GET /api/student/dashboard
// @access  Private/Student
exports.getDashboard = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id })
      .populate("user", "name email")
      .populate("branch");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Recent attendance (last 5 scans)
    const recentAttendance = await Attendance.find({ student: student._id })
      .populate({
        path: "lecture",
        populate: {
          path: "teacher",
          populate: { path: "user", select: "name" },
        },
      })
      .sort({ markedAt: -1 })
      .limit(5);

    // Aaj ke lectures
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayLectures = await Lecture.find({
      branch: student.branch._id,
      semester: student.semester,
      section: student.section,
      date: { $gte: today, $lt: tomorrow },
    }).populate({
      path: "teacher",
      populate: { path: "user", select: "name" },
    });

    // Aaj ke lectures me attendance status
    const attendedLectureIds = recentAttendance
      .filter((a) => new Date(a.markedAt) >= today)
      .map((a) => a.lecture._id.toString());

    const todayLecturesWithStatus = todayLectures.map((lecture) => ({
      ...lecture.toObject(),
      attended: attendedLectureIds.includes(lecture._id.toString()),
    }));

    // Overall stats
    const totalLectures = await Lecture.countDocuments({
      branch: student.branch._id,
      semester: student.semester,
      section: student.section,
    });

    const totalAttended = await Attendance.countDocuments({
      student: student._id,
      status: { $in: ["present", "late"] },
    });

    res.json({
      success: true,
      data: {
        student,
        recentAttendance,
        todayLectures: todayLecturesWithStatus,
        stats: {
          totalLectures,
          attended: totalAttended,
          percentage:
            totalLectures > 0
              ? Math.round((totalAttended / totalLectures) * 100)
              : 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
