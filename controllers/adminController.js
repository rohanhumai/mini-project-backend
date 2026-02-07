// ======== MODELS IMPORT ========
// Base login entity (admin / teacher / student)
const User = require("../models/User");

// Student academic profile
const Student = require("../models/Student");

// Teacher academic + subject mapping
const Teacher = require("../models/Teacher");

// Branch + subject master
const Branch = require("../models/Branch");

// Attendance records (QR scan output)
const Attendance = require("../models/Attendance");

// Lecture sessions (QR generate entity)
const Lecture = require("../models/Lecture");

// ==================== USER MANAGEMENT ====================

// @desc    Get all users (admin view with filters)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    // Query params: role filter, pagination, search
    const { role, page = 1, limit = 10, search } = req.query;

    let query = {};

    // Role-based filtering (admin / teacher / student)
    if (role) query.role = role;

    // Search by name OR email (case-insensitive)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch paginated users
    const users = await User.find(query)
      .skip((page - 1) * limit) // pagination offset
      .limit(parseInt(limit)) // page size
      .sort({ createdAt: -1 }); // latest users first

    // Total count for pagination UI
    const total = await User.countDocuments(query);

    // Response with pagination meta
    res.json({
      success: true,
      data: users,
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

// @desc    Create user (admin power)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    // Common user fields + role-specific fields
    const { name, email, password, role, ...profileData } = req.body;

    // Prevent duplicate accounts
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create base user (login identity)
    const user = await User.create({ name, email, password, role });

    // ======== ROLE-SPECIFIC PROFILE CREATION ========
    if (role === "student") {
      // Student academic record
      await Student.create({
        user: user._id, // reference to User
        rollNumber: profileData.rollNumber,
        branch: profileData.branch,
        semester: profileData.semester || 1,
        section: profileData.section || "A",
      });
    } else if (role === "teacher") {
      // Teacher teaching permissions
      await Teacher.create({
        user: user._id,
        employeeId: profileData.employeeId,
        department: profileData.department,
        branches: profileData.branches || [],
        subjects: profileData.subjects || [],
      });
    }

    res.status(201).json({
      success: true,
      data: user,
      message: "User created successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user & profile
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive, ...profileData } = req.body;

    // Update base user info
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true, runValidators: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update role-specific profile (or create if missing)
    if (role === "student") {
      await Student.findOneAndUpdate({ user: user._id }, profileData, {
        new: true,
        upsert: true,
      });
    } else if (role === "teacher") {
      await Teacher.findOneAndUpdate({ user: user._id }, profileData, {
        new: true,
        upsert: true,
      });
    }

    res.json({
      success: true,
      data: user,
      message: "User updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user completely
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Clean up linked profiles
    await Student.findOneAndDelete({ user: user._id });
    await Teacher.findOneAndDelete({ user: user._id });

    // Delete base user
    await user.deleteOne();

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== BRANCH MANAGEMENT ====================

// @desc    Get all branches
exports.getAllBranches = async (req, res) => {
  try {
    // Sorted by branch code (CS, AIML, etc.)
    const branches = await Branch.find().sort({ code: 1 });
    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new branch
exports.createBranch = async (req, res) => {
  try {
    const { code, name, subjects } = req.body;

    // Prevent duplicate branch codes
    const existingBranch = await Branch.findOne({ code });
    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch with this code already exists",
      });
    }

    const branch = await Branch.create({ code, name, subjects });

    res.status(201).json({
      success: true,
      data: branch,
      message: "Branch created successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update branch details
exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    res.json({
      success: true,
      data: branch,
      message: "Branch updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete branch (only if no students)
exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    // Safety check: students still enrolled?
    const studentsCount = await Student.countDocuments({ branch: branch._id });
    if (studentsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete branch. ${studentsCount} students are enrolled.`,
      });
    }

    await branch.deleteOne();

    res.json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== DASHBOARD STATS ====================

// @desc    Admin dashboard overview
exports.getDashboardStats = async (req, res) => {
  try {
    // Total counts for cards
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalBranches = await Branch.countDocuments();
    const totalLectures = await Lecture.countDocuments();

    // Start of today (00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today’s lectures & attendance
    const todayLectures = await Lecture.countDocuments({
      date: { $gte: today },
    });

    const todayAttendance = await Attendance.countDocuments({
      markedAt: { $gte: today },
    });

    // Branch-wise student count (chart data)
    const branchDistribution = await Student.aggregate([
      {
        $lookup: {
          from: "branches",
          localField: "branch",
          foreignField: "_id",
          as: "branchInfo",
        },
      },
      { $unwind: "$branchInfo" },
      {
        $group: {
          _id: "$branchInfo.code",
          name: { $first: "$branchInfo.name" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Recent attendance activity feed
    const recentAttendance = await Attendance.find()
      .populate({
        path: "student",
        populate: { path: "user", select: "name" },
      })
      .populate({
        path: "lecture",
        populate: {
          path: "teacher",
          populate: { path: "user", select: "name" },
        },
      })
      .sort({ markedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        counts: {
          students: totalStudents,
          teachers: totalTeachers,
          branches: totalBranches,
          lectures: totalLectures,
        },
        today: {
          lectures: todayLectures,
          attendance: todayAttendance,
        },
        branchDistribution,
        recentAttendance,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ATTENDANCE REPORT ====================

// @desc    Attendance analytics report
exports.getAttendanceReport = async (req, res) => {
  try {
    const { branch, subject, startDate, endDate, semester } = req.query;

    let matchQuery = {};

    // Date range filter
    if (startDate && endDate) {
      matchQuery.markedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Aggregation pipeline for reports
    const report = await Attendance.aggregate([
      { $match: matchQuery },

      // Join lecture info
      {
        $lookup: {
          from: "lectures",
          localField: "lecture",
          foreignField: "_id",
          as: "lectureInfo",
        },
      },
      { $unwind: "$lectureInfo" },

      // Join student info
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: "$studentInfo" },

      // Join branch info
      {
        $lookup: {
          from: "branches",
          localField: "studentInfo.branch",
          foreignField: "_id",
          as: "branchInfo",
        },
      },
      { $unwind: "$branchInfo" },

      // Group by branch + subject + date
      {
        $group: {
          _id: {
            branch: "$branchInfo.code",
            subject: "$lectureInfo.subject.code",
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$markedAt" },
            },
          },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },

      { $sort: { "_id.date": -1 } },
    ]);

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
