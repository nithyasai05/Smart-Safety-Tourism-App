import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Use a local MongoDB connection for development
    // You can change this to MongoDB Atlas URL later
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/tourist-safety-db";

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    // For demo purposes, continue without database
    console.log("⚠️  Continuing without database connection...");
    console.log(
      "💡 To setup MongoDB: brew install mongodb-community (macOS) or install MongoDB locally",
    );
  }
};

export default connectDB;
