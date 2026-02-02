import express from "express";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// @route   GET /api/alerts/stats
// @desc    Get alert statistics for dashboard
// @access  Private (Admin only)
router.get("/alerts/stats", auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== "admin" && req.user.role !== "police") {
      return res.status(403).json({
        success: false,
        message: "Only admins and police can view alert statistics",
      });
    }

    // Get all users with panic events
    const users = await User.find({}).select(
      "name email digitalId panicEvents",
    );

    let totalAlerts = 0;
    let activeAlerts = 0;
    let resolvedAlerts = 0;
    let lastAlert = null;

    users.forEach((user) => {
      if (user.panicEvents && user.panicEvents.length > 0) {
        user.panicEvents.forEach((event) => {
          totalAlerts++;

          if (event.status === "ACTIVE") {
            activeAlerts++;
          } else if (event.status === "RESOLVED") {
            resolvedAlerts++;
          }

          // Track the most recent alert
          if (
            !lastAlert ||
            new Date(event.timestamp) > new Date(lastAlert.timestamp)
          ) {
            lastAlert = {
              alertId: event.eventId,
              userId: user._id.toString(),
              digitalId: user.digitalId,
              type: event.type,
              emergencyType: event.type,
              priority: event.type === "ACCIDENT_DETECTED" ? "HIGH" : "MEDIUM",
              location: event.location || { latitude: 0, longitude: 0 },
              timestamp: event.timestamp,
              status: event.status,
              message:
                event.message || `${event.type} alert for user ${user.name}`,
              resolvedAt: event.resolvedAt,
            };
          }
        });
      }
    });

    const stats = {
      totalAlerts,
      activeAlerts,
      resolvedAlerts,
      lastAlert,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching alert stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching alert statistics",
      error: error.message,
    });
  }
});

// @route   GET /api/alerts/emergency
// @desc    Get active emergency alerts
// @access  Private (Admin only)
router.get("/alerts/emergency", auth, async (req, res) => {
  try {
    // Verify admin access
    if (req.user.role !== "admin" && req.user.role !== "police") {
      return res.status(403).json({
        success: false,
        message: "Only admins and police can view emergency alerts",
      });
    }

    // Get all users with active panic events
    const users = await User.find({}).select(
      "name email digitalId panicEvents",
    );

    const emergencyAlerts = [];

    users.forEach((user) => {
      if (user.panicEvents && user.panicEvents.length > 0) {
        user.panicEvents.forEach((event) => {
          if (event.status === "ACTIVE") {
            emergencyAlerts.push({
              alertId: event.eventId,
              userId: user._id.toString(),
              digitalId: user.digitalId,
              type: event.type,
              emergencyType: event.type,
              priority: event.type === "ACCIDENT_DETECTED" ? "HIGH" : "MEDIUM",
              location: event.location || { latitude: 0, longitude: 0 },
              timestamp: event.timestamp,
              status: event.status,
              message:
                event.message ||
                `${event.type} emergency for user ${user.name}`,
            });
          }
        });
      }
    });

    // Sort by timestamp (most recent first)
    emergencyAlerts.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );

    res.json({
      success: true,
      data: emergencyAlerts,
    });
  } catch (error) {
    console.error("Error fetching emergency alerts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching emergency alerts",
      error: error.message,
    });
  }
});

// @route   POST /api/alerts/:alertId/resolve
// @desc    Resolve an emergency alert
// @access  Private (Admin only)
router.post("/alerts/:alertId/resolve", auth, async (req, res) => {
  try {
    const { alertId } = req.params;

    // Verify admin access
    if (req.user.role !== "admin" && req.user.role !== "police") {
      return res.status(403).json({
        success: false,
        message: "Only admins and police can resolve alerts",
      });
    }

    // Find the user with this alert
    const user = await User.findOne({
      "panicEvents.eventId": alertId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    // Update the specific panic event
    const eventIndex = user.panicEvents.findIndex(
      (event) => event.eventId === alertId,
    );

    if (eventIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    user.panicEvents[eventIndex].status = "RESOLVED";
    user.panicEvents[eventIndex].resolvedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: "Alert resolved successfully",
      data: {
        alertId,
        status: "RESOLVED",
        resolvedAt: user.panicEvents[eventIndex].resolvedAt,
      },
    });
  } catch (error) {
    console.error("Error resolving alert:", error);
    res.status(500).json({
      success: false,
      message: "Error resolving alert",
      error: error.message,
    });
  }
});

export default router;
