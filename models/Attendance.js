// Import mongoose library for MongoDB schema definition and modeling
const mongoose = require("mongoose");

// Define the schema structure for attendance records
const attendanceSchema = new mongoose.Schema({
  // Reference to the Lecture document this attendance belongs to
  // Creates a relationship between Attendance and Lecture collections
  lecture: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
    ref: "Lecture", // References the Lecture model for population
    required: true, // Every attendance must be linked to a lecture
  },

  // Reference to the Student document who attended
  // Creates a relationship between Attendance and Student collections
  student: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
    ref: "Student", // References the Student model for population
    required: true, // Every attendance must be linked to a student
  },

  // Attendance status with predefined allowed values
  status: {
    type: String,
    enum: ["present", "absent", "late"], // Only these three values are allowed
    default: "present", // Defaults to "present" if not specified
  },

  // Timestamp indicating when attendance was recorded
  markedAt: {
    type: Date,
    default: Date.now, // Automatically set to current time if not provided
  },

  // Optional GPS coordinates for location-based attendance verification
  // Useful for ensuring students are physically present at the venue
  location: {
    latitude: Number, // GPS latitude coordinate
    longitude: Number, // GPS longitude coordinate
  },

  // Optional field to store device information (browser, OS, device type)
  // Useful for tracking/auditing and preventing fraudulent attendance
  deviceInfo: {
    type: String,
  },
});

// Create a compound unique index on lecture and student fields
// This prevents a student from having multiple attendance records for the same lecture
// If a duplicate entry is attempted, MongoDB will throw a duplicate key error
attendanceSchema.index({ lecture: 1, student: 1 }, { unique: true });

// Create and export the Attendance model based on the schema
// This model will be used to interact with the "attendances" collection in MongoDB
module.exports = mongoose.model("Attendance", attendanceSchema);
