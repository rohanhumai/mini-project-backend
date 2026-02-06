// Import the mongoose library for MongoDB object modeling
const mongoose = require("mongoose");

// Define an async function to establish database connection
const connectDB = async () => {
  try {
    // Attempt to connect to MongoDB using the connection string from environment variables
    // mongoose.connect() returns a promise that resolves to the connection object
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // Log successful connection with the host name for confirmation
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, log the error message
    console.error(`Error: ${error.message}`);

    // Exit the process with failure code (1) since the app can't function without DB
    process.exit(1);
  }
};

// Export the connectDB function for use in other modules (typically called in server.js/app.js)
module.exports = connectDB;
