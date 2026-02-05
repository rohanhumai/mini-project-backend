const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Lecture = require("../models/Lecture");
const Attendance = require("../models/Attendance");
const Branch = require("../models/Branch");
const QRCode = require("qrcode");
const crypto = require("crypto");

// @desc    Get teacher profile
// @route   GET /api/teacher/profile
// @access  Private/Teacher
exports.getProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id })
      .populate("user", "name email")
      .populate("branches");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    res.json({ success: true, data: teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate QR code for lecture
// @route   POST /api/teacher/lectures/generate-qr
// @access  Private/Teacher
exports.generateLectureQR = async (req, res) => {
  try {
    const {
      branchId,
      subjectCode,
      subjectName,
      semester,
      section,
      startTime,
      endTime,
      validMinutes,
    } = req.body;

    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    // Generate unique lecture code
    const lectureCode = crypto.randomBytes(16).toString("hex");

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (validMinutes || 60));

    // QR Code data
    const qrData = JSON.stringify({
      lectureCode,
      teacherId: teacher._id,
      branchId,
      subjectCode,
      semester,
      section,
      timestamp: Date.now(),
      expiresAt: expiresAt.toISOString(),
    });

    // Generate QR Code as base64
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    // Create lecture record
    const lecture = await Lecture.create({
      teacher: teacher._id,
      branch: branchId,
      subject: { code: subjectCode, name: subjectName },
      semester,
      section: section || "A",
      startTime,
      endTime,
      qrCode: qrCodeImage,
      qrCodeData: lectureCode,
      expiresAt,
      date: new Date(),
    });

    res.status(201).json({
      success: true,
      data: {
        lecture,
        qrCode: qrCodeImage,
        expiresAt,
      },
      message: "QR Code generated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get teacher's lectures
// @route   GET /api/teacher/lectures
// @access  Private/Teacher
exports.getLectures = async (req, res) => {
  try {
    const { date, branch, subject, page = 1, limit = 10 } = req.query;

    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    let query = { teacher: teacher._id };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (branch) query.branch = branch;
    if (subject) query["subject.code"] = subject;

    const lectures = await Lecture.find(query)
      .populate("branch")
      .sort({ date: -1, startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Lecture.countDocuments(query);

    // Get attendance count for each lecture
    const lecturesWithAttendance = await Promise.all(
      lectures.map(async (lecture) => {
        const attendanceCount = await Attendance.countDocuments({
          lecture: lecture._id,
          status: "present",
        });
        const totalStudents = await Student.countDocuments({
          branch: lecture.branch._id,
          semester: lecture.semester,
          section: lecture.section,
        });
        return {
          ...lecture.toObject(),
          attendanceCount,
          totalStudents,
        };
      }),
    );

    res.json({
      success: true,
      data: lecturesWithAttendance,
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

// @desc    Get lecture attendance details
// @route   GET /api/teacher/lectures/:lectureId/attendance
// @access  Private/Teacher
exports.getLectureAttendance = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.lectureId).populate(
      "branch",
    );

    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found",
      });
    }

    // Get all students for this branch/semester/section
    const allStudents = await Student.find({
      branch: lecture.branch._id,
      semester: lecture.semester,
      section: lecture.section,
    }).populate("user", "name email");

    // Get attendance records
    const attendanceRecords = await Attendance.find({
      lecture: lecture._id,
    }).populate({
      path: "student",
      populate: { path: "user", select: "name email" },
    });

    const presentStudentIds = attendanceRecords.map((a) =>
      a.student._id.toString(),
    );

    // Build attendance list
    const attendanceList = allStudents.map((student) => {
      const attendanceRecord = attendanceRecords.find(
        (a) => a.student._id.toString() === student._id.toString(),
      );

      return {
        student: {
          _id: student._id,
          rollNumber: student.rollNumber,
          name: student.user.name,
          email: student.user.email,
        },
        status: attendanceRecord ? attendanceRecord.status : "absent",
        markedAt: attendanceRecord ? attendanceRecord.markedAt : null,
      };
    });

    // Sort by roll number
    attendanceList.sort((a, b) =>
      a.student.rollNumber.localeCompare(b.student.rollNumber),
    );

    res.json({
      success: true,
      data: {
        lecture,
        attendance: attendanceList,
        summary: {
          total: allStudents.length,
          present: attendanceRecords.filter((a) => a.status === "present")
            .length,
          late: attendanceRecords.filter((a) => a.status === "late").length,
          absent: allStudents.length - attendanceRecords.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update attendance manually
// @route   PUT /api/teacher/attendance/:attendanceId
// @access  Private/Teacher
exports.updateAttendance = async (req, res) => {
  try {
    const { status } = req.body;

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.attendanceId,
      { status },
      { new: true },
    ).populate({
      path: "student",
      populate: { path: "user", select: "name" },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    res.json({
      success: true,
      data: attendance,
      message: "Attendance updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark attendance manually
// @route   POST /api/teacher/lectures/:lectureId/mark-attendance
// @access  Private/Teacher
exports.markAttendanceManually = async (req, res) => {
  try {
    const { studentId, status } = req.body;

    const lecture = await Lecture.findById(req.params.lectureId);
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found",
      });
    }

    // Check if attendance already exists
    let attendance = await Attendance.findOne({
      lecture: lecture._id,
      student: studentId,
    });

    if (attendance) {
      attendance.status = status;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        lecture: lecture._id,
        student: studentId,
        status,
      });
    }

    res.json({
      success: true,
      data: attendance,
      message: "Attendance marked successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete attendance
// @route   DELETE /api/teacher/attendance/:attendanceId
// @access  Private/Teacher
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(
      req.params.attendanceId,
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    res.json({
      success: true,
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get assigned branches and subjects
// @route   GET /api/teacher/assigned
// @access  Private/Teacher
exports.getAssignedBranchesSubjects = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id }).populate(
      "branches",
    );

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    res.json({
      success: true,
      data: {
        branches: teacher.branches,
        subjects: teacher.subjects,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get teacher dashboard stats
// @route   GET /api/teacher/dashboard
// @access  Private/Teacher
exports.getDashboardStats = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLectures = await Lecture.find({
      teacher: teacher._id,
      date: { $gte: today },
    }).populate("branch");

    const totalLectures = await Lecture.countDocuments({
      teacher: teacher._id,
    });

    // Get active lecture (if any)
    const now = new Date();
    const activeLecture = await Lecture.findOne({
      teacher: teacher._id,
      isActive: true,
      expiresAt: { $gt: now },
    }).populate("branch");

    // Recent attendance
    const recentAttendance = await Attendance.find()
      .populate({
        path: "lecture",
        match: { teacher: teacher._id },
      })
      .populate({
        path: "student",
        populate: { path: "user", select: "name" },
      })
      .sort({ markedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        todayLectures,
        totalLectures,
        activeLecture,
        recentAttendance: recentAttendance.filter((a) => a.lecture),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
