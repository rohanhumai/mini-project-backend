const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  employeeId: {
    type: String,
    required: [true, "Please add an employee ID"],
    unique: true,
  },
  department: {
    type: String,
    required: true,
  },
  branches: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
  ],
  subjects: [
    {
      branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
      },
      subjectCode: String,
      subjectName: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Teacher", teacherSchema);
