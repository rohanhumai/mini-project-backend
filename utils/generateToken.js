// =============================================================================
// JWT TOKEN GENERATION UTILITY
// =============================================================================
// This utility function creates JSON Web Tokens for user authentication
// Called after successful login/registration to provide auth token to client

// Import jsonwebtoken library for creating signed tokens
// JWT allows stateless authentication - server doesn't need to store sessions
const jwt = require("jsonwebtoken");

// =============================================================================
// FUNCTION: Generate JWT Token
// =============================================================================
// Purpose: Creates a signed JWT token containing user identification data
// Called in: authController (login, register functions)
// Returns: Signed JWT token string
//
// Parameters:
//   - id: User's MongoDB ObjectId (unique identifier)
//   - role: User's role string ('admin', 'teacher', 'student')
const generateToken = (id, role) => {
  // jwt.sign() creates a new JSON Web Token
  // Consists of three parts: Header.Payload.Signature
  return jwt.sign(
    // =========================================================================
    // PAYLOAD (Data encoded in token)
    // =========================================================================
    // This data will be available when token is decoded/verified
    // WARNING: Payload is Base64 encoded, NOT encrypted - don't store secrets!
    {
      id, // User's unique ID - used to fetch user in protect middleware
      role, // User's role - can be used for quick role checks without DB query
    },

    // =========================================================================
    // SECRET KEY (For signing the token)
    // =========================================================================
    // Used to create the signature portion of JWT
    // Same secret must be used for verification (in protect middleware)
    // Should be a long, random string stored securely in environment variables
    process.env.JWT_SECRET,

    // =========================================================================
    // OPTIONS OBJECT
    // =========================================================================
    {
      // Token expiration time
      // After this duration, token becomes invalid and user must re-login
      // Accepts: seconds (number) or string ('30d', '24h', '60m', '120s')
      // Common values: '1d' (1 day), '7d' (1 week), '30d' (30 days)
      expiresIn: process.env.JWT_EXPIRE,
    },
  );
};

// Export the function for use in auth controllers
module.exports = generateToken;
