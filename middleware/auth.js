// Import jsonwebtoken library for JWT verification
// JWT (JSON Web Token) is used for stateless authentication
const jwt = require("jsonwebtoken");

// Import User model to fetch user details after token verification
const User = require("../models/User");

// =============================================================================
// MIDDLEWARE: Protect Routes (Authentication)
// =============================================================================
// Purpose: Ensures only authenticated users can access protected routes
// Usage: router.get('/profile', protect, getProfile)
// Attaches user object to req for use in subsequent middleware/controllers
exports.protect = async (req, res, next) => {
  // Variable to store extracted token
  let token;

  // ==========================================================================
  // STEP 1: Extract token from Authorization header
  // ==========================================================================
  // Expected format: "Bearer <token>"
  // Example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Split "Bearer <token>" by space and get the token part (index 1)
    // "Bearer abc123".split(' ') => ["Bearer", "abc123"]
    token = req.headers.authorization.split(" ")[1];
  }

  // ==========================================================================
  // STEP 2: Check if token exists
  // ==========================================================================
  // If no token provided, user is not authenticated
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }

  try {
    // ========================================================================
    // STEP 3: Verify token validity
    // ========================================================================
    // jwt.verify() does three things:
    // 1. Checks if token signature is valid (not tampered)
    // 2. Checks if token is not expired
    // 3. Decodes and returns the payload
    // Throws error if verification fails
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ========================================================================
    // STEP 4: Fetch user from database using decoded ID
    // ========================================================================
    // decoded.id comes from the JWT payload (set during login/token generation)
    // We fetch fresh user data to ensure we have latest info (role changes, etc.)
    req.user = await User.findById(decoded.id);

    // ========================================================================
    // STEP 5: Check if user still exists
    // ========================================================================
    // User might have been deleted after token was issued
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // ========================================================================
    // STEP 6: Check if user account is active
    // ========================================================================
    // Allows admins to deactivate accounts without deleting them
    // Deactivated users cannot access protected routes even with valid token
    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is deactivated",
      });
    }

    // ========================================================================
    // STEP 7: Authentication successful - proceed to next middleware
    // ========================================================================
    // req.user is now available in all subsequent middleware and controllers
    next();
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING: Token verification failed
    // ========================================================================
    // Possible reasons:
    // - Token expired (jwt.TokenExpiredError)
    // - Invalid signature (jwt.JsonWebTokenError)
    // - Malformed token (jwt.JsonWebTokenError)
    // We return generic message to avoid exposing security details
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};

// =============================================================================
// MIDDLEWARE: Role-Based Authorization
// =============================================================================
// Purpose: Restricts route access to specific user roles
// Usage: router.delete('/user/:id', protect, authorize('admin'), deleteUser)
// Must be used AFTER protect middleware (needs req.user)
// Uses closure pattern to accept dynamic role arguments
exports.authorize = (...roles) => {
  // Return the actual middleware function
  // Closure allows access to 'roles' array inside the middleware
  return (req, res, next) => {
    // ========================================================================
    // Check if user's role is included in allowed roles
    // ========================================================================
    // roles = array of allowed roles passed to authorize()
    // req.user.role = current user's role (set by protect middleware)
    // Example: authorize('admin', 'teacher') => roles = ['admin', 'teacher']
    if (!roles.includes(req.user.role)) {
      // User's role is not in the allowed list
      // 403 Forbidden = authenticated but not authorized
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    // ========================================================================
    // Authorization successful - proceed to next middleware/controller
    // ========================================================================
    next();
  };
};
