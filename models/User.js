// Import mongoose library for MongoDB schema definition and modeling
const mongoose = require("mongoose");

// Import bcryptjs for secure password hashing
// bcryptjs is a pure JavaScript implementation (no native dependencies)
// Alternative: 'bcrypt' (faster but requires native compilation)
const bcrypt = require("bcryptjs");

// Define the schema structure for user authentication
// This is the core authentication model - Student and Teacher models reference this
// Contains only auth-related fields; profile data stored in respective models
const userSchema = new mongoose.Schema(
  {
    // User's full name for display purposes
    name: {
      type: String,
      required: true, // Name is mandatory for registration
    },

    // User's email address - serves as unique login identifier
    // Used for authentication and communication
    email: {
      type: String,
      required: true, // Email is mandatory
      unique: true, // Prevents duplicate accounts with same email
    },

    // User's hashed password (never store plain text passwords!)
    // Automatically hashed via pre-save middleware before storing
    password: {
      type: String,
      required: true, // Password is mandatory
    },

    // User role for Role-Based Access Control (RBAC)
    // Determines permissions and accessible routes/features
    role: {
      type: String,
      enum: ["admin", "teacher", "student"], // Only these three roles are allowed
      default: "student", // New users are students by default
    },
  },
  // Schema options object
  {
    // Automatically adds 'createdAt' and 'updatedAt' fields
    // createdAt: Set once when document is created
    // updatedAt: Updated automatically on every save/update
    timestamps: true,
  },
);

// =============================================================================
// MIDDLEWARE: Pre-save hook for password hashing
// =============================================================================
// Runs automatically before every save() operation on a User document
// Arrow functions won't work here - we need 'this' to refer to the document
userSchema.pre("save", async function (next) {
  // Check if password field was modified
  // Prevents re-hashing an already hashed password on other updates (e.g., name change)
  // isModified() returns true for new documents and when field is changed
  if (!this.isModified("password")) return next();

  // Hash the password with bcrypt
  // 10 = salt rounds (cost factor) - higher = more secure but slower
  // Salt is automatically generated and embedded in the hash
  this.password = await bcrypt.hash(this.password, 10);

  // Call next() to proceed with the save operation
  next();
});

// =============================================================================
// INSTANCE METHOD: Password comparison for login authentication
// =============================================================================
// Called on a user document instance: user.matchPassword(enteredPassword)
// Used during login to verify if entered password matches stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  // bcrypt.compare() handles:
  // 1. Extracting salt from stored hash
  // 2. Hashing entered password with same salt
  // 3. Comparing the two hashes
  // Returns true if match, false otherwise
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create and export the User model based on the schema
// This model will interact with the "users" collection in MongoDB
module.exports = mongoose.model("User", userSchema);
