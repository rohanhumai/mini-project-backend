const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
  subject: {
    code: String,
    name: String,
  },
  semester: {
    type: Number,
    required: true,
  },
  section: {
    type: String,
    default: "A",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  qrCode: {
    type: String,
    required: true,
  },
  qrCodeData: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
lectureSchema.index({ date: 1, branch: 1, subject: 1 });

module.exports = mongoose.model("Lecture", lectureSchema);
