// Express framework (HTTP server)
const express = require("express");

// CORS middleware (frontend ↔ backend communication)
const cors = require("cors");

// Environment variables (.env)
const dotenv = require("dotenv");

// MongoDB connection logic
const connectDB = require("./config/db");

// ==================== ENV & DB ====================

// .env file load
dotenv.config();

// Database connect (MongoDB)
connectDB();

// ==================== APP INIT ====================

const app = express();

// ==================== GLOBAL MIDDLEWARE ====================

// CORS enable (React / mobile app se API calls allow)
app.use(cors());

// JSON body parser (req.body ke liye)
app.use(express.json());

// ==================== ROUTES ====================

// 🔐 Authentication routes (login, register, me)
app.use("/api/auth", require("./routes/authRoutes"));

// 🛠 Admin routes (users, branches, reports, dashboard)
app.use("/api/admin", require("./routes/adminRoutes"));

// 👨‍🏫 Teacher routes (QR generate, lectures, attendance control)
app.use("/api/teacher", require("./routes/teacherRoutes"));

// 🎓 Student routes (profile, QR scan, history, dashboard)
app.use("/api/student", require("./routes/studentRoutes"));

// 📊 Attendance routes (by-date, export)
app.use("/api/attendance", require("./routes/attendanceRoutes"));

// ==================== ERROR HANDLING ====================

// Central error handler (last middleware)
app.use((err, req, res, next) => {
  // Server console me full stack trace
  console.error(err.stack);

  // Client ko safe error response
  res.status(500).json({
    success: false,
    message: "Server Error",

    // Development me actual error dikhate hain
    // Production me hide kar dete hain (security)
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// ==================== SERVER START ====================

const PORT = process.env.PORT || 5000;

// Server listen
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
