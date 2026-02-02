const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/tourist-safety",
    );

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: "admin@smartsafety.com",
    });
    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    // Create admin user
    const adminUser = new User({
      name: "Admin User",
      email: "admin@smartsafety.com",
      password: hashedPassword,
      phone: "+1234567890",
      emergencyContact: "+1234567890",
      role: "admin",
    });

    await adminUser.save();
    console.log("Admin user created successfully");
    console.log("Email: admin@smartsafety.com");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await mongoose.connection.close();
  }
}

createAdmin();
