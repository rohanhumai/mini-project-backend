const Student = require("../models/Student");
const Lecture = require("../models/Lecture");
const Attendance = require("../models/Attendance");

// @desc    Get student profile
// @route   GET /api/student/profile
// @access  Private/Student
exports.getProfile = async (req, res) => {
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

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Scan QR and mark attendance
// @route   POST /api/student/scan-attendance
// @access  Private/Student
exports.scanAttendance = async (req, res) => {
  try {
    const { qrData, location, deviceInfo } = req.body;

    // Parse QR data
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR code format",
      });
    }

    const { lectureCode, expiresAt } = parsedData;

    // Check if QR is expired
    if (new Date(expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "QR code has expired. Please ask your teacher for a new one.",
      });
    }

    // Find the lecture
    const lecture = await Lecture.findOne({
      qrCodeData: lectureCode,
      isActive: true,
    }).populate("branch");

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found or QR code is no longer active",
      });
    }

    // Get student profile
    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Verify student belongs to the correct branch/semester/section
    if (student.branch.toString() !== lecture.branch._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this branch",
      });
    }

    if (student.semester !== lecture.semester) {
      return res.status(403).json({
        success: false,
        message: "This lecture is for a different semester",
      });
    }

    if (student.section !== lecture.section) {
      return res.status(403).json({
        success: false,
        message: "This lecture is for a different section",
      });
    }

    // Check if already marked
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

    // Determine if late
    const now = new Date();
    const lectureDate = new Date(lecture.date);
    const [startHour, startMin] = lecture.startTime.split(":").map(Number);
    lectureDate.setHours(startHour, startMin, 0, 0);

    // If more than 15 minutes late, mark as late
    const lateThreshold = 15 * 60 * 1000; // 15 minutes in ms
    const status = now - lectureDate > lateThreshold ? "late" : "present";

    // Create attendance record
    const attendance = await Attendance.create({
      lecture: lecture._id,
      student: student._id,
      status,
      location,
      deviceInfo,
    });

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

// @desc    Get student's attendance history
// @route   GET /api/student/attendance
// @access  Private/Student
exports.getAttendanceHistory = async (req, res) => {
  try {
    const { subject, startDate, endDate, page = 1, limit = 20 } = req.query;

    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    let query = { student: student._id };

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

    // Filter by subject if provided
    let filteredRecords = attendanceRecords;
    if (subject) {
      filteredRecords = attendanceRecords.filter(
        (a) => a.lecture && a.lecture.subject.code === subject,
      );
    }

    // Filter by date range
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

// @desc    Get attendance summary by subject
// @route   GET /api/student/attendance/summary
// @access  Private/Student
exports.getAttendanceSummary = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id }).populate(
      "branch",
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Get all lectures for student's branch/semester/section
    const allLectures = await Lecture.find({
      branch: student.branch._id,
      semester: student.semester,
      section: student.section,
    });

    // Get student's attendance
    const attendanceRecords = await Attendance.find({
      student: student._id,
    });

    // Group by subject
    const subjectSummary = {};

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

    attendanceRecords.forEach((record) => {
      const lecture = allLectures.find(
        (l) => l._id.toString() === record.lecture.toString(),
      );
      if (lecture) {
        const subjectCode = lecture.subject.code;
        if (subjectSummary[subjectCode]) {
          if (record.status === "present") {
            subjectSummary[subjectCode].present++;
          } else if (record.status === "late") {
            subjectSummary[subjectCode].late++;
          }
        }
      }
    });

    // Calculate percentages and absent
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

    // Overall summary
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

    // Get recent attendance
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

    // Get today's lectures for student's class
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

    // Check which today's lectures student has attended
    const attendedLectureIds = recentAttendance
      .filter((a) => a.lecture && new Date(a.markedAt) >= today)
      .map((a) => a.lecture._id.toString());

    const todayLecturesWithStatus = todayLectures.map((lecture) => ({
      ...lecture.toObject(),
      attended: attendedLectureIds.includes(lecture._id.toString()),
    }));

    // Overall attendance stats
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
