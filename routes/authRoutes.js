// Express framework
const express = require("express");

// Router instance (auth routes ke liye)
const router = express.Router();

// express-validator se request body validation
const { body } = require("express-validator");

// ======== AUTH CONTROLLERS ========
const {
  register,
  login,
  getMe,
  updatePassword,
} = require("../controllers/authController");

// JWT authentication middleware
const { protect } = require("../middleware/auth");

// ==================== REGISTER ====================

// @route   POST /api/auth/register
// @desc    New user registration (student / teacher)
// @access  Public
router.post(
  "/register",

  // ======== INPUT VALIDATION ========
  [
    // Name empty nahi hona chahiye
    body("name").notEmpty().withMessage("Name is required"),

    // Proper email format check
    body("email").isEmail().withMessage("Please include a valid email"),

    // Password minimum length check
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],

  // Validation pass hua toh controller chalega
  register,
);

// ==================== LOGIN ====================

// @route   POST /api/auth/login
// @desc    User login (JWT generate hota hai)
// @access  Public
router.post("/login", login);

// ==================== GET CURRENT USER ====================

// @route   GET /api/auth/me
// @desc    Logged-in user ka data
// @access  Private (JWT required)
router.get(
  "/me",
  protect, // pehle token verify hoga
  getMe, // phir user data milega
);

// ==================== UPDATE PASSWORD ====================

// @route   PUT /api/auth/updatepassword
// @desc    Change current user's password
// @access  Private (JWT required)
router.put(
  "/updatepassword",
  protect, // sirf logged-in user
  updatePassword, // password change logic
);

// Export router (main app me mount hota hai)
module.exports = router;
