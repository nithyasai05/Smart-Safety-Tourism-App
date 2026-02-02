const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

async function updateExistingUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/tourist-safety-db",
    );

    console.log("Connected to MongoDB");

    // Update all users that don't have isActive field set
    const result = await User.updateMany(
      { isActive: { $exists: false } }, // Find users where isActive field doesn't exist
      { $set: { isActive: true } }, // Set isActive to true
    );

    console.log(`Updated ${result.modifiedCount} users to have isActive: true`);

    // Also update any users that have isActive set to false (if any)
    const activeResult = await User.updateMany(
      { isActive: false },
      { $set: { isActive: true } },
    );

    console.log(
      `Activated ${activeResult.modifiedCount} previously deactivated users`,
    );

    // Show current user count
    const totalUsers = await User.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);

    process.exit(0);
  } catch (error) {
    console.error("Error updating users:", error);
    process.exit(1);
  }
}

updateExistingUsers();
