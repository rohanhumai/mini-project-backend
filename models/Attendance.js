const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  lecture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lecture",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  status: {
    type: String,
    enum: ["present", "absent", "late"],
    default: "present",
  },
  markedAt: {
    type: Date,
    default: Date.now,
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
  deviceInfo: {
    type: String,
  },
});

// Compound index to prevent duplicate attendance
attendanceSchema.index({ lecture: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
