// Import mongoose library for MongoDB schema definition and modeling
const mongoose = require("mongoose");

// Define the schema structure for academic branches/departments
const branchSchema = new mongoose.Schema({
  // Unique branch code (e.g., "CSE", "AIML", "ECE")
  code: {
    type: String,
    required: true, // Branch code is mandatory
    unique: true, // No two branches can have the same code
    uppercase: true, // Automatically converts input to uppercase (e.g., "cse" → "CSE")
    trim: true, // Removes leading/trailing whitespace
  },

  // Full name of the branch (e.g., "Computer Science and Engineering")
  name: {
    type: String,
    required: true, // Branch name is mandatory
  },

  // Array of subjects offered under this branch
  // Uses embedded subdocuments instead of references for better read performance
  subjects: [
    {
      // Subject code (e.g., "CS101", "CS102")
      code: {
        type: String,
        required: true, // Subject code is mandatory within each subject
      },
      // Full name of the subject (e.g., "Data Structures", "Algorithms")
      name: {
        type: String,
        required: true, // Subject name is mandatory within each subject
      },
    },
  ],

  // Flag to indicate if the branch is currently active
  // Useful for soft deletion - instead of removing data, mark as inactive
  isActive: {
    type: Boolean,
    default: true, // New branches are active by default
  },

  // Timestamp for when the branch record was created
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to current time on document creation
  },
});

// Create and export the Branch model based on the schema
// This model will interact with the "branches" collection in MongoDB
module.exports = mongoose.model("Branch", branchSchema);
