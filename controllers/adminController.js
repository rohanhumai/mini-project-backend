const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Branch = require("../models/Branch");
const Attendance = require("../models/Attendance");
const Lecture = require("../models/Lecture");

// ==================== USER MANAGEMENT ====================

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search } = req.query;

    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

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

// @desc    Create user
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, ...profileData } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create user
    const user = await User.create({ name, email, password, role });

    // Create role-specific profile
    if (role === "student") {
      await Student.create({
        user: user._id,
        rollNumber: profileData.rollNumber,
        branch: profileData.branch,
        semester: profileData.semester || 1,
        section: profileData.section || "A",
      });
    } else if (role === "teacher") {
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

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive, ...profileData } = req.body;

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

    // Update role-specific profile
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

// @desc    Delete user
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

    // Delete associated profiles
    await Student.findOneAndDelete({ user: user._id });
    await Teacher.findOneAndDelete({ user: user._id });
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
// @route   GET /api/admin/branches
// @access  Private/Admin
exports.getAllBranches = async (req, res) => {
  try {
    const branches = await Branch.find().sort({ code: 1 });
    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create branch
// @route   POST /api/admin/branches
// @access  Private/Admin
exports.createBranch = async (req, res) => {
  try {
    const { code, name, subjects } = req.body;

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

// @desc    Update branch
// @route   PUT /api/admin/branches/:id
// @access  Private/Admin
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

// @desc    Delete branch
// @route   DELETE /api/admin/branches/:id
// @access  Private/Admin
exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    // Check if students are enrolled
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

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalBranches = await Branch.countDocuments();
    const totalLectures = await Lecture.countDocuments();

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLectures = await Lecture.countDocuments({
      date: { $gte: today },
    });

    const todayAttendance = await Attendance.countDocuments({
      markedAt: { $gte: today },
    });

    // Branch-wise student distribution
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

    // Recent activity
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

// @desc    Get attendance report
// @route   GET /api/admin/reports/attendance
// @access  Private/Admin
exports.getAttendanceReport = async (req, res) => {
  try {
    const { branch, subject, startDate, endDate, semester } = req.query;

    let matchQuery = {};

    if (startDate && endDate) {
      matchQuery.markedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const report = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "lectures",
          localField: "lecture",
          foreignField: "_id",
          as: "lectureInfo",
        },
      },
      { $unwind: "$lectureInfo" },
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: "$studentInfo" },
      {
        $lookup: {
          from: "branches",
          localField: "studentInfo.branch",
          foreignField: "_id",
          as: "branchInfo",
        },
      },
      { $unwind: "$branchInfo" },
      {
        $group: {
          _id: {
            branch: "$branchInfo.code",
            subject: "$lectureInfo.subject.code",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$markedAt" } },
          },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
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
