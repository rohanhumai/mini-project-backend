// Import mongoose library for MongoDB schema definition and modeling
const mongoose = require("mongoose");

// Define the schema structure for student profiles
// This schema stores academic information and links to User for authentication
const studentSchema = new mongoose.Schema({
  // Reference to the User document containing login credentials
  // Separates authentication (User) from profile data (Student)
  // Enables role-based access: same User model for students and teachers
  user: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
    ref: "User", // References the User model for population
    required: true, // Every student must have a linked user account
  },

  // Unique roll number/enrollment number assigned by institution
  // Primary identifier used by administration (e.g., "21CSE001", "2021BCS-045")
  rollNumber: {
    type: String,
    required: [true, "Please add a roll number"], // Custom error message for validation
    unique: true, // No two students can have same roll number
  },

  // Reference to the Branch document the student belongs to
  // Determines which subjects/lectures are applicable to this student
  branch: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
    ref: "Branch", // References the Branch model for population
    required: true, // Every student must belong to a branch
  },

  // Current semester of the student (1-8 for typical 4-year engineering program)
  // Used to filter relevant lectures and attendance records
  semester: {
    type: Number,
    required: true, // Semester is mandatory
    min: 1, // Minimum valid semester
    max: 8, // Maximum valid semester (4-year program)
  },

  // Student's personal QR code image data (base64 encoded or URL)
  // Optional: Can be used for alternative attendance methods
  // e.g., Teacher scans student QR instead of student scanning lecture QR
  qrCode: {
    type: String, // Not required - can be generated on demand
  },

  // Timestamp for when the student record was created
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to current time on creation
  },
});

// Instance method to generate unique QR code data for this student
// Called on a student document instance: student.generateQRData()
// Returns a JSON string that can be encoded into a QR code image
studentSchema.methods.generateQRData = function () {
  return JSON.stringify({
    studentId: this._id, // Unique MongoDB document ID
    rollNumber: this.rollNumber, // Human-readable identifier
    timestamp: Date.now(), // Generation time for uniqueness/expiry
  });
};

// Create and export the Student model based on the schema
// This model will interact with the "students" collection in MongoDB
module.exports = mongoose.model("Student", studentSchema);
