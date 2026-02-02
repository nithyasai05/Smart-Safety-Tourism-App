import express from "express";
import panicButtonService from "../services/panicButtonService.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/panic/trigger-manual
 * User manually triggers panic button
 */
router.post("/panic/trigger-manual", auth, async (req, res) => {
  try {
    const { emergencyType, message, location } = req.body;
    const userId = req.user.id || req.user._id;

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: "Location data is required",
      });
    }

    const result = await panicButtonService.triggerManualPanic(
      userId,
      location,
      emergencyType || "panic",
      message,
    );

    if (result.success) {
      res.json({
        success: true,
        message: "Panic alert triggered successfully",
        eventId: result.eventId,
        event: result.event,
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error triggering panic:", error);
    res.status(500).json({
      success: false,
      message: "Error triggering panic alert",
      error: error.message,
    });
  }
});

/**
 * POST /api/panic/detect-lost-tracking
 * Backend detects lost tracking for a user
 */
router.post("/panic/detect-lost-tracking", auth, async (req, res) => {
  try {
    const { lastUpdateTime } = req.body;
    const userId = req.user.id || req.user._id;

    if (!lastUpdateTime) {
      return res.status(400).json({
        success: false,
        message: "Last update time is required",
      });
    }

    const result = await panicButtonService.detectLostTracking(
      userId,
      lastUpdateTime,
    );

    res.json(result);
  } catch (error) {
    console.error("Error detecting lost tracking:", error);
    res.status(500).json({
      success: false,
      message: "Error detecting lost tracking",
      error: error.message,
    });
  }
});

/**
 * POST /api/panic/detect-geofence-breach
 * Detect if user entered danger zone
 */
router.post("/panic/detect-geofence-breach", auth, async (req, res) => {
  try {
    const { location, dangerZones } = req.body;
    const userId = req.user.id || req.user._id;

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: "Location data is required",
      });
    }

    const result = await panicButtonService.detectGeofenceBreach(
      userId,
      location,
      dangerZones || panicButtonService.config.dangerZones,
    );

    res.json(result);
  } catch (error) {
    console.error("Error detecting geofence breach:", error);
    res.status(500).json({
      success: false,
      message: "Error detecting geofence breach",
      error: error.message,
    });
  }
});

/**
 * POST /api/panic/detect-static-location
 * Detect if user stayed in one location too long
 */
router.post("/panic/detect-static-location", auth, async (req, res) => {
  try {
    const { location } = req.body;
    const userId = req.user.id || req.user._id;

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: "Location data is required",
      });
    }

    const result = await panicButtonService.detectStaticLocation(
      userId,
      location,
    );

    res.json(result);
  } catch (error) {
    console.error("Error detecting static location:", error);
    res.status(500).json({
      success: false,
      message: "Error detecting static location",
      error: error.message,
    });
  }
});

/**
 * POST /api/panic/detect-accident
 * ML/DL: Detect accident using sensor data
 */
router.post("/panic/detect-accident", auth, async (req, res) => {
  try {
    const { sensorData } = req.body;
    const userId = req.user.id || req.user._id;

    if (!sensorData) {
      return res.status(400).json({
        success: false,
        message: "Sensor data is required",
      });
    }

    const result = await panicButtonService.detectAccident(userId, sensorData);

    res.json(result);
  } catch (error) {
    console.error("Error detecting accident:", error);
    res.status(500).json({
      success: false,
      message: "Error detecting accident",
      error: error.message,
    });
  }
});

/**
 * POST /api/panic/detect-anomalous-movement
 * ML/DL: Detect anomalous movement patterns
 */
router.post("/panic/detect-anomalous-movement", auth, async (req, res) => {
  try {
    const { locations } = req.body;
    const userId = req.user.id || req.user._id;

    if (!locations || !Array.isArray(locations)) {
      return res.status(400).json({
        success: false,
        message: "Locations array is required",
      });
    }

    const result = await panicButtonService.detectAnomalousMovement(
      userId,
      locations,
    );

    res.json(result);
  } catch (error) {
    console.error("Error detecting anomalous movement:", error);
    res.status(500).json({
      success: false,
      message: "Error detecting anomalous movement",
      error: error.message,
    });
  }
});

/**
 * POST /api/panic/resolve-event
 * Resolve a panic event
 */
router.post("/panic/resolve-event", auth, async (req, res) => {
  try {
    const { eventId, resolutionDetails } = req.body;
    const userId = req.user.id || req.user._id;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    const result = await panicButtonService.resolvePanicEvent(
      userId,
      eventId,
      resolutionDetails,
    );

    res.json(result);
  } catch (error) {
    console.error("Error resolving panic event:", error);
    res.status(500).json({
      success: false,
      message: "Error resolving panic event",
      error: error.message,
    });
  }
});

/**
 * GET /api/panic/active-events
 * Get active panic events for the user
 */
router.get("/panic/active-events", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const events = panicButtonService.getActivePanicEvents(userId);

    res.json({
      success: true,
      events: events,
      count: events.length,
    });
  } catch (error) {
    console.error("Error fetching active events:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching active events",
      error: error.message,
    });
  }
});

/**
 * POST /api/panic/configure-danger-zones
 * Admin: Configure danger zones (geofences)
 */
router.post("/panic/configure-danger-zones", auth, async (req, res) => {
  try {
    const { zones } = req.body;

    // Verify admin access - use req.user directly (no additional DB lookup needed)
    if (req.user.role !== "admin" && req.user.role !== "police") {
      return res.status(403).json({
        success: false,
        message: "Only admins and police can configure danger zones",
      });
    }

    if (!zones || !Array.isArray(zones)) {
      return res.status(400).json({
        success: false,
        message: "Zones array is required",
      });
    }

    panicButtonService.setDangerZones(zones);

    res.json({
      success: true,
      message: "Danger zones configured successfully",
      zones: zones,
    });
  } catch (error) {
    console.error("Error configuring danger zones:", error);
    res.status(500).json({
      success: false,
      message: "Error configuring danger zones",
      error: error.message,
    });
  }
});

/**
 * GET /api/panic/stats
 * Admin: Get panic button statistics
 */
router.get("/panic/stats", auth, async (req, res) => {
  try {
    // Verify admin access - use req.user directly (no additional DB lookup needed)
    if (req.user.role !== "admin" && req.user.role !== "police") {
      return res.status(403).json({
        success: false,
        message: "Only admins and police can view panic statistics",
      });
    }

    const stats = panicButtonService.getPanicStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching panic stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching panic statistics",
      error: error.message,
    });
  }
});

/**
 * GET /api/panic/all-events
 * Admin: Get all panic events (not just user's)
 */
router.get("/panic/all-events", auth, async (req, res) => {
  try {
    // Verify admin access - use req.user directly (no additional DB lookup needed)
    if (req.user.role !== "admin" && req.user.role !== "police") {
      return res.status(403).json({
        success: false,
        message: "Only admins and police can view all panic events",
      });
    }

    const events = panicButtonService.getAllPanicEvents();
    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching all panic events:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching panic events",
      error: error.message,
    });
  }
});

/**
 * GET /api/panic/user-settings/:userId
 * Admin: Get user panic button settings
 */
router.get("/panic/user-settings/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify admin access - use req.user directly (no additional DB lookup needed)
    if (req.user.role !== "admin" && req.user.role !== "police") {
      return res.status(403).json({
        success: false,
        message: "Only admins and police can view user settings",
      });
    }

    // Verify target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const settings = panicButtonService.getUserPanicSettings(userId);
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching user panic settings:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user settings",
      error: error.message,
    });
  }
});

/**
 * POST /api/panic/user-settings/:userId
 * Admin: Update user panic button settings
 */
router.post("/panic/user-settings/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;

    // Verify admin access - use req.user directly (no additional DB lookup needed)
    if (req.user.role !== "admin" && req.user.role !== "police") {
      return res.status(403).json({
        success: false,
        message: "Only admins and police can update user settings",
      });
    }

    // Verify target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const result = panicButtonService.updateUserPanicSettings(userId, settings);
    res.json({
      success: true,
      message: "User panic settings updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error updating user panic settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user settings",
      error: error.message,
    });
  }
});

export default router;
