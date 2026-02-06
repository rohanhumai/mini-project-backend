// Import mongoose library for MongoDB schema definition and modeling
const mongoose = require("mongoose");

// Define the schema structure for lecture sessions
// Each lecture represents a single class session where attendance can be taken via QR code
const lectureSchema = new mongoose.Schema({
  // Reference to the Teacher document who is conducting this lecture
  // Establishes relationship between Lecture and Teacher collections
  teacher: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
    ref: "Teacher", // References the Teacher model for population
    required: true, // Every lecture must have an assigned teacher
  },

  // Reference to the Branch document this lecture belongs to
  // Helps identify which department/branch students should attend
  branch: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
    ref: "Branch", // References the Branch model for population
    required: true, // Every lecture must be associated with a branch
  },

  // Embedded subject information (denormalized from Branch.subjects)
  // Stored directly to avoid additional lookups and maintain historical accuracy
  // Even if subject is later modified in Branch, lecture retains original info
  subject: {
    code: String, // Subject code (e.g., "CS101")
    name: String, // Subject name (e.g., "Data Structures")
  },

  // Semester number for which this lecture is conducted
  // Helps filter students who should attend (1-8 typically for engineering)
  semester: {
    type: Number,
    required: true, // Semester is mandatory for student filtering
  },

  // Section/division of the class (e.g., "A", "B", "C")
  // Used when a semester has multiple sections
  section: {
    type: String,
    default: "A", // Defaults to section "A" if not specified
  },

  // Date on which the lecture is scheduled
  date: {
    type: Date,
    default: Date.now, // Defaults to current date if not provided
  },

  // Lecture start time in string format (e.g., "09:00", "14:30")
  // Stored as string for flexibility in formatting
  startTime: {
    type: String,
    required: true, // Start time is mandatory
  },

  // Lecture end time in string format (e.g., "10:00", "15:30")
  // Used to calculate lecture duration and validate attendance timing
  endTime: {
    type: String,
    required: true, // End time is mandatory
  },

  // QR code image data (typically base64 encoded string or URL)
  // This is what gets displayed for students to scan
  qrCode: {
    type: String,
    required: true, // QR code image is mandatory for attendance
  },

  // Unique data/token encoded within the QR code
  // When scanned, this data is sent to server to validate and mark attendance
  // Typically contains encrypted lecture ID, timestamp, or unique token
  qrCodeData: {
    type: String,
    required: true, // QR code data payload is mandatory
  },

  // Flag indicating if the lecture session is currently active for attendance
  // Set to false when attendance window closes or teacher manually ends session
  isActive: {
    type: Boolean,
    default: true, // Lectures are active by default when created
  },

  // Expiration timestamp for the QR code/attendance window
  // After this time, students cannot mark attendance for this lecture
  // Prevents late scanning of QR codes
  expiresAt: {
    type: Date,
    required: true, // Expiration time is mandatory for security
  },

  // Timestamp for when this lecture record was created
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to current time on creation
  },
});

// Create compound index for optimized query performance
// Speeds up common queries that filter by date, branch, and subject together
// Useful for: fetching daily lectures, branch-wise reports, subject-wise attendance
lectureSchema.index({ date: 1, branch: 1, subject: 1 });

// Create and export the Lecture model based on the schema
// This model will interact with the "lectures" collection in MongoDB
module.exports = mongoose.model("Lecture", lectureSchema);
