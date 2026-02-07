// MongoDB ODM (Object Data Modeling) library
// Isse hum MongoDB ko JS objects ke through handle karte hai
const mongoose = require("mongoose");

// Environment variables (.env file) load karne ke liye
const dotenv = require("dotenv");

// Password hashing library (future auth ke liye)
// ⚠️ NOTE: Is file me directly use nahi ho raha, but User model me ho sakta hai
const bcrypt = require("bcryptjs");

// ======== MODELS IMPORT ========
// Base user model (admin / teacher / student sab isse linked honge)
const User = require("../models/User");

// Student-specific profile model
const Student = require("../models/Student");

// Teacher-specific profile model
const Teacher = require("../models/Teacher");

// Branch + subjects ka master data
const Branch = require("../models/Branch");

// .env file ko activate kar diya
dotenv.config();

// MongoDB se connection establish
mongoose.connect(process.env.MONGO_URI);

// ======== MAIN SEED FUNCTION ========
const seedData = async () => {
  try {
    // ======== STEP 1: PURANA DATA CLEAR ========
    // Taki duplicate entries na bane har baar seed chalane pe
    await User.deleteMany();
    await Branch.deleteMany();
    await Student.deleteMany();
    await Teacher.deleteMany();

    console.log("Data cleared...");

    // ======== STEP 2: BRANCH + SUBJECT MASTER DATA ========
    // Attendance system me branch & subject backbone hota hai
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

    // ======== STEP 3: ADMIN USER ========
    // Admin sirf User collection me hota hai (no extra profile)
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@college.edu",
      password: "admin123", // hashing model me hoti hai
      role: "admin",
    });

    // ======== STEP 4: TEACHER USERS (LOGIN IDENTITIES) ========
    // Teacher ka login User collection se hota hai
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

    // ======== STEP 5: TEACHER PROFILES ========
    // Teacher model me actual teaching info hoti hai
    await Teacher.create({
      // User collection se reference
      user: teacher1User._id,

      // College ka employee id
      employeeId: "EMP001",

      // Department info
      department: "Computer Science",

      // Teacher kaunse branches padhata hai
      branches: [branches[0]._id, branches[1]._id],

      // Teacher kaunse subject kis branch me padhata hai
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

    // ======== STEP 6: STUDENT USERS + PROFILES ========
    // Pehle User (login), fir Student (academic profile)
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
      // Student ka login account
      const user = await User.create({
        name: data.name,
        email: data.email,
        password: "student123",
        role: "student",
      });

      // Student ka academic data
      await Student.create({
        user: user._id, // User se link
        rollNumber: data.roll,
        branch: branches[data.branch]._id,
        semester: 5,
        section: "A",
      });
    }

    console.log("Students created...");
    console.log("=== SEED DATA COMPLETE ===");

    // Script successful hone ke baad process band
    process.exit();
  } catch (error) {
    // Agar koi error aaya toh clearly dikhao
    console.error(error);
    process.exit(1);
  }
};

// Seed function run
seedData();
