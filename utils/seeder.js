const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const User = require("../models/User"); // ✅ missing tha
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Branch = require("../models/Branch");

dotenv.config();
mongoose.connect(process.env.MONGO_URI);

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Branch.deleteMany();
    await Student.deleteMany();
    await Teacher.deleteMany();

    console.log("Data cleared...");

    // Create branches
    const branches = await Branch.insertMany([
      {
        code: "CS",
        name: "Computer Science",
        subjects: [
          { code: "M3", name: "Mathematics III" },
          { code: "AOA", name: "Analysis of Algorithms" },
          { code: "COA", name: "Computer Organization" },
          { code: "DSGT", name: "Discrete Structures" },
          { code: "WebDev", name: "Web Development" },
        ],
      },
      {
        code: "AIML",
        name: "AI & Machine Learning",
        subjects: [
          { code: "ML", name: "Machine Learning" },
          { code: "DL", name: "Deep Learning" },
          { code: "NLP", name: "Natural Language Processing" },
          { code: "CV", name: "Computer Vision" },
          { code: "Python", name: "Python Programming" },
        ],
      },
      {
        code: "ECS",
        name: "Electronics & Communication",
        subjects: [
          { code: "Analog", name: "Analog Electronics" },
          { code: "Digital", name: "Digital Electronics" },
          { code: "EMFT", name: "EM Field Theory" },
          { code: "Signal", name: "Signals & Systems" },
        ],
      },
    ]);

    console.log("Branches created...");

    // Create admin user
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@college.edu",
      password: "admin123",
      role: "admin",
    });

    // Create teacher users
    const teacher1User = await User.create({
      name: "Kishan Rangeele",
      email: "Kishanr@gmail.com",
      password: "teacher123",
      role: "teacher",
    });

    const teacher2User = await User.create({
      name: "Nikita K",
      email: "NikitaK@gmail.com",
      password: "teacher123",
      role: "teacher",
    });

    // Create teacher profiles
    await Teacher.create({
      user: teacher1User._id,
      employeeId: "EMP001",
      department: "Computer Science",
      branches: [branches[0]._id, branches[1]._id],
      subjects: [
        {
          branch: branches[0]._id,
          subjectCode: "AOA",
          subjectName: "Analysis of Algorithms",
        },
        {
          branch: branches[0]._id,
          subjectCode: "COA",
          subjectName: "Computer Organization",
        },
        {
          branch: branches[1]._id,
          subjectCode: "ML",
          subjectName: "Machine Learning",
        },
      ],
    });

    await Teacher.create({
      user: teacher2User._id,
      employeeId: "EMP002",
      department: "AI & ML",
      branches: [branches[1]._id],
      subjects: [
        {
          branch: branches[1]._id,
          subjectCode: "DL",
          subjectName: "Deep Learning",
        },
        {
          branch: branches[1]._id,
          subjectCode: "NLP",
          subjectName: "Natural Language Processing",
        },
      ],
    });

    console.log("Teachers created...");

    // Create student users
    const studentData = [
      {
        name: "Alice Brown",
        email: "alice@student.edu",
        roll: "CS001",
        branch: 0,
      },
      {
        name: "Bob Wilson",
        email: "bob@student.edu",
        roll: "CS002",
        branch: 0,
      },
      {
        name: "Charlie Davis",
        email: "charlie@student.edu",
        roll: "CS003",
        branch: 0,
      },
      {
        name: "Diana Miller",
        email: "diana@student.edu",
        roll: "AIML001",
        branch: 1,
      },
      {
        name: "Eve Taylor",
        email: "eve@student.edu",
        roll: "AIML002",
        branch: 1,
      },
    ];

    for (const data of studentData) {
      const user = await User.create({
        name: data.name,
        email: data.email,
        password: "student123",
        role: "student",
      });

      await Student.create({
        user: user._id,
        rollNumber: data.roll,
        branch: branches[data.branch]._id,
        semester: 5,
        section: "A",
      });
    }

    console.log("Students created...");
    console.log("");
    console.log("=== SEED DATA COMPLETE ===");
    console.log("");
    console.log("Login Credentials:");
    console.log("------------------");
    console.log("Admin: admin@college.edu / admin123");
    console.log("Teacher 1: john.smith@college.edu / teacher123");
    console.log("Teacher 2: sarah.johnson@college.edu / teacher123");
    console.log("Student: alice@student.edu / student123");
    console.log("");

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();
