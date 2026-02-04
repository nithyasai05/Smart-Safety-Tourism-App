import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// Load environment variables when this module is imported directly
dotenv.config();

const {
  DB_NAME,
  DB_USER,
  MYSQL_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_SSL_REQUIRED = "true",
} = process.env;

const sequelize = new Sequelize(
  DB_NAME || "defaultdb",
  DB_USER || "root",
  MYSQL_PASSWORD || "",
  {
    host: DB_HOST || "localhost",
    port: DB_PORT ? Number(DB_PORT) : 3306,
    dialect: "mysql",
    logging: false,
    dialectOptions:
      DB_SSL_REQUIRED === "true"
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false, // For Aiven Cloud, adjust if certs are provided
            },
          }
        : {},
  },
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("📊 MySQL Connected");

    // Sync models to create tables without dropping data
    await sequelize.sync({ alter: true });
    console.log("📊 Database synchronized");
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    // For demo purposes, continue without database
    console.log("⚠️  Continuing without database connection...");
  }
};

export default connectDB;
export { sequelize };
