// ======== MODELS ========
// Base user (login + role)
const User = require("../models/User");

// Student profile (academic identity)
const Student = require("../models/Student");

// Teacher profile (teaching identity)
const Teacher = require("../models/Teacher");

// JWT token generator (auth ke liye)
const generateToken = require("../utils/generateToken");

// express-validator se validation errors nikalne ke liye
const { validationResult } = require("express-validator");

// ==================== REGISTER ====================

// @desc    Register user (student / teacher)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // Validation middleware se aaye hue errors
    const errors = validationResult(req);

    // Agar validation fail hua toh wahi return
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    // Request body se fields nikaal rahe
    const {
      name,
      email,
      password,
      role,
      rollNumber,
      branch,
      semester,
      section,
      employeeId,
      department,
    } = req.body;

    // ======== USER EXIST CHECK ========
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // ======== CREATE BASE USER ========
    // Agar role nahi diya, default student
    user = await User.create({
      name,
      email,
      password,
      role: role || "student",
    });

    // ======== ROLE-SPECIFIC PROFILE ========
    if (role === "student" || !role) {
      // Student academic profile
      await Student.create({
        user: user._id, // User collection se link
        rollNumber,
        branch,
        semester: semester || 1,
        section: section || "A",
      });
    } else if (role === "teacher") {
      // Teacher profile
      await Teacher.create({
        user: user._id,
        employeeId,
        department,
      });
    }

    // ======== JWT TOKEN ========
    // Token me userId + role encode hota hai
    const token = generateToken(user._id, user.role);

    // Response (frontend ko login state mil jaata hai)
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==================== LOGIN ====================

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // ======== FIND USER ========
    // +password because by default password hidden hota hai
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ======== PASSWORD CHECK ========
    // matchPassword bcrypt compare karta hai
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ======== ACTIVE CHECK ========
    // Admin agar deactivate kare toh login band
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated. Contact admin.",
      });
    }

    // ======== TOKEN GENERATE ========
    const token = generateToken(user._id, user.role);

    // ======== ROLE-SPECIFIC DATA ========
    let profileData = {};

    if (user.role === "student") {
      // Student ka branch, semester etc
      profileData = await Student.findOne({ user: user._id }).populate(
        "branch",
      );
    } else if (user.role === "teacher") {
      // Teacher ke branches + subjects
      profileData = await Teacher.findOne({ user: user._id }).populate(
        "branches",
      );
    }

    // Final login response
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: profileData,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==================== GET CURRENT USER ====================

// @desc    Logged-in user ka data
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    // req.user middleware se aata hai (JWT decode)
    const user = await User.findById(req.user.id);

    let profileData = {};

    // Role ke hisaab se profile attach
    if (user.role === "student") {
      profileData = await Student.findOne({ user: user._id }).populate(
        "branch",
      );
    } else if (user.role === "teacher") {
      profileData = await Teacher.findOne({ user: user._id }).populate(
        "branches",
      );
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: profileData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==================== UPDATE PASSWORD ====================

// @desc    Change password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    // Password compare ke liye +password
    const user = await User.findById(req.user.id).select("+password");

    // Current password verify
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // New password set (pre-save hook hash karega)
    user.password = req.body.newPassword;
    await user.save();

    // Fresh token (security best practice)
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      token,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
