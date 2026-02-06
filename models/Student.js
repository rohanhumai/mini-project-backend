const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rollNumber: {
    type: String,
    required: [true, "Please add a roll number"],
    unique: true,
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8,
  },
  qrCode: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate unique QR data
studentSchema.methods.generateQRData = function () {
  return JSON.stringify({
    studentId: this._id,
    rollNumber: this.rollNumber,
    timestamp: Date.now(),
  });
};

module.exports = mongoose.model("Student", studentSchema);
