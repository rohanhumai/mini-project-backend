// Import mongoose library for MongoDB schema definition and modeling
const mongoose = require("mongoose");

// Define the schema structure for teacher profiles
// This schema stores professional/academic information and links to User for authentication
// Teachers can be assigned to multiple branches and teach multiple subjects
const teacherSchema = new mongoose.Schema({
  // Reference to the User document containing login credentials
  // Separates authentication (User) from profile data (Teacher)
  // Same pattern used for Student model - enables role-based access control
  user: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
    ref: "User", // References the User model for population
    required: true, // Every teacher must have a linked user account
  },

  // Unique employee ID assigned by institution
  // Primary identifier used by HR/administration (e.g., "EMP001", "TCH-2024-042")
  employeeId: {
    type: String,
    required: [true, "Please add an employee ID"], // Custom error message for validation
    unique: true, // No two teachers can have same employee ID
  },

  // Department the teacher belongs to (e.g., "Computer Science", "Mathematics")
  // Note: This is a string, not a reference - allows flexibility for non-academic depts
  department: {
    type: String,
    required: true, // Department is mandatory
  },

  // Array of Branch references the teacher is authorized to teach
  // A teacher can be assigned to multiple branches (e.g., CSE and IT)
  // Used to filter which classes/lectures the teacher can create
  branches: [
    {
      type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
      ref: "Branch", // References the Branch model for population
    },
  ],

  // Array of subjects the teacher is qualified/assigned to teach
  // Uses embedded subdocuments to store subject details with branch context
  // Denormalized design: stores subject info directly for quick access
  subjects: [
    {
      // Reference to the Branch this subject assignment belongs to
      // A teacher might teach same subject in different branches
      branch: {
        type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
        ref: "Branch", // References the Branch model
      },

      // Subject code (e.g., "CS101", "MA201")
      // Matches the subject code in Branch.subjects array
      subjectCode: String,

      // Full name of the subject (e.g., "Data Structures", "Linear Algebra")
      // Stored directly to avoid additional lookups
      subjectName: String,
    },
  ],

  // Timestamp for when the teacher record was created
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to current time on creation
  },
});

// Create and export the Teacher model based on the schema
// This model will interact with the "teachers" collection in MongoDB
module.exports = mongoose.model("Teacher", teacherSchema);
