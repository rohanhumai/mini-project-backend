// ======== MODELS ========
// Teacher profile (subjects, branches, identity)
const Teacher = require("../models/Teacher");

// Student academic data
const Student = require("../models/Student");

// Lecture session (QR + timing)
const Lecture = require("../models/Lecture");

// Attendance records
const Attendance = require("../models/Attendance");

// Branch master (mostly populate ke liye)
const Branch = require("../models/Branch");

// QR code generator library
const QRCode = require("qrcode");

// Crypto library (secure random lecture codes)
const crypto = require("crypto");

// ==================== TEACHER PROFILE ====================

// @desc    Get teacher profile
// @route   GET /api/teacher/profile
// @access  Private/Teacher
exports.getProfile = async (req, res) => {
  try {
    // Logged-in user ke basis pe teacher profile
    const teacher = await Teacher.findOne({ user: req.user._id })
      .populate("user", "name email") // basic identity
      .populate("branches"); // assigned branches

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

// ==================== GENERATE LECTURE QR ====================

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

    // Teacher identity verify
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    // ======== UNIQUE LECTURE CODE ========
    // Random, unpredictable → cheating-resistant
    const lectureCode = crypto.randomBytes(16).toString("hex");

    // ======== QR EXPIRY TIME ========
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (validMinutes || 60));

    // ======== QR PAYLOAD ========
    // Student side isi data ko parse karega
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

    // ======== QR IMAGE GENERATION ========
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    // ======== LECTURE RECORD CREATE ========
    const lecture = await Lecture.create({
      teacher: teacher._id,
      branch: branchId,
      subject: { code: subjectCode, name: subjectName },
      semester,
      section: section || "A",
      startTime,
      endTime,
      qrCode: qrCodeImage, // display QR
      qrCodeData: lectureCode, // verification key
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

// ==================== GET TEACHER LECTURES ====================

// @desc    Get teacher's lectures
// @route   GET /api/teacher/lectures
// @access  Private/Teacher
exports.getLectures = async (req, res) => {
  try {
    const { date, branch, subject, page = 1, limit = 10 } = req.query;

    // Teacher identity
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    // Base query (sirf apne lectures)
    let query = { teacher: teacher._id };

    // Date filter (single day)
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (branch) query.branch = branch;
    if (subject) query["subject.code"] = subject;

    // Lectures fetch
    const lectures = await Lecture.find(query)
      .populate("branch")
      .sort({ date: -1, startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Lecture.countDocuments(query);

    // ======== ATTENDANCE COUNTS ========
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

// ==================== LECTURE ATTENDANCE DETAILS ====================

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

    // Class ke saare students
    const allStudents = await Student.find({
      branch: lecture.branch._id,
      semester: lecture.semester,
      section: lecture.section,
    }).populate("user", "name email");

    // Lecture ke attendance records
    const attendanceRecords = await Attendance.find({
      lecture: lecture._id,
    }).populate({
      path: "student",
      populate: { path: "user", select: "name email" },
    });

    // Final attendance list (present + absent)
    const attendanceList = allStudents.map((student) => {
      const record = attendanceRecords.find(
        (a) => a.student._id.toString() === student._id.toString(),
      );

      return {
        student: {
          _id: student._id,
          rollNumber: student.rollNumber,
          name: student.user.name,
          email: student.user.email,
        },
        status: record ? record.status : "absent",
        markedAt: record ? record.markedAt : null,
      };
    });

    // Roll number wise sorting
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

// ==================== MANUAL ATTENDANCE UPDATE ====================

// @desc    Update attendance manually
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

// ==================== MANUAL MARK ATTENDANCE ====================

// @desc    Mark attendance manually
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

    // Existing attendance check
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

// ==================== DELETE ATTENDANCE ====================

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

// ==================== ASSIGNED BRANCHES & SUBJECTS ====================

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

// ==================== TEACHER DASHBOARD ====================

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

    // Aaj ke lectures
    const todayLectures = await Lecture.find({
      teacher: teacher._id,
      date: { $gte: today },
    }).populate("branch");

    const totalLectures = await Lecture.countDocuments({
      teacher: teacher._id,
    });

    // Currently active QR lecture
    const now = new Date();
    const activeLecture = await Lecture.findOne({
      teacher: teacher._id,
      isActive: true,
      expiresAt: { $gt: now },
    }).populate("branch");

    // Recent attendance activity
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
