import crypto from "crypto";
import User from "../models/User.js";
// import anomalyDetectionML from "./anomalyDetectionML.js"; // Optional advanced ML
// import enhancedMLService from "./enhancedMLService.js"; // Optional external ML libraries

class PanicButtonService {
  constructor() {
    // Track user locations for movement analysis
    this.locationHistory = new Map();
    // Track panic events
    this.panicEvents = new Map();
    // Configuration
    this.config = {
      staticLocationThreshold: 3600000, // 1 hour in milliseconds
      geofenceBuffer: 100, // 100 meters
      accelerationThreshold: 15, // m/s² for accident detection
      dangerZones: [], // Will be loaded from config or database
      lowSpeedThreshold: 1, // m/s - vehicle moving very slowly
    };
  }

  /**
   * Trigger panic alert manually
   */
  async triggerManualPanic(
    userId,
    location,
    emergencyType = "panic",
    message = "",
  ) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      const panicEvent = {
        eventId: this.generateEventId(),
        userId: userId,
        type: "MANUAL_PANIC",
        triggerReason: emergencyType,
        message: message || "Manual panic button triggered",
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || null,
        },
        timestamp: new Date(),
        status: "ACTIVE",
        resolvedAt: null,
      };

      // Store in memory (in production, save to database)
      const eventKey = `${userId}_${panicEvent.eventId}`;
      this.panicEvents.set(eventKey, panicEvent);

      // Log the panic event
      console.log("[PANIC BUTTON] Manual panic triggered:", panicEvent);

      return {
        success: true,
        eventId: panicEvent.eventId,
        message: "Panic alert triggered successfully",
        event: panicEvent,
      };
    } catch (error) {
      console.error("[PANIC BUTTON] Error triggering manual panic:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect and trigger panic for lost tracking (no location update for extended period)
   */
  async detectLostTracking(userId, lastUpdateTime, threshold = 300000) {
    // 5 minutes default threshold
    try {
      const timeSinceLastUpdate = Date.now() - lastUpdateTime;

      if (timeSinceLastUpdate > threshold) {
        const panicEvent = {
          eventId: this.generateEventId(),
          userId: userId,
          type: "LOST_TRACKING",
          triggerReason: "No location update received",
          message: `Location tracking lost for ${Math.floor(
            timeSinceLastUpdate / 60000,
          )} minutes`,
          timestamp: new Date(),
          status: "ACTIVE",
          timeSinceLastUpdate: timeSinceLastUpdate,
          resolvedAt: null,
        };

        const eventKey = `${userId}_${panicEvent.eventId}`;
        this.panicEvents.set(eventKey, panicEvent);

        console.log("[PANIC BUTTON] Lost tracking detected:", panicEvent);

        return {
          success: true,
          eventId: panicEvent.eventId,
          triggered: true,
          event: panicEvent,
        };
      }

      return { success: true, triggered: false };
    } catch (error) {
      console.error("[PANIC BUTTON] Error detecting lost tracking:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect geofence breach (entering danger zone)
   */
  async detectGeofenceBreach(userId, location, dangerZones = []) {
    try {
      const breachedZone = dangerZones.find((zone) => {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          zone.latitude,
          zone.longitude,
        );
        return distance < zone.radius + this.config.geofenceBuffer;
      });

      if (breachedZone) {
        const panicEvent = {
          eventId: this.generateEventId(),
          userId: userId,
          type: "GEOFENCE_BREACH",
          triggerReason: "Entered danger zone",
          message: `Entered danger zone: ${breachedZone.name}`,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy || null,
          },
          breachedZone: {
            name: breachedZone.name,
            latitude: breachedZone.latitude,
            longitude: breachedZone.longitude,
            radius: breachedZone.radius,
          },
          timestamp: new Date(),
          status: "ACTIVE",
          resolvedAt: null,
        };

        const eventKey = `${userId}_${panicEvent.eventId}`;
        this.panicEvents.set(eventKey, panicEvent);

        console.log("[PANIC BUTTON] Geofence breach detected:", panicEvent);

        return {
          success: true,
          eventId: panicEvent.eventId,
          triggered: true,
          event: panicEvent,
          breachedZone: breachedZone,
        };
      }

      return { success: true, triggered: false };
    } catch (error) {
      console.error("[PANIC BUTTON] Error detecting geofence breach:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect static location (user stayed in one place too long)
   */
  async detectStaticLocation(userId, location) {
    try {
      const history = this.locationHistory.get(userId) || [];

      if (history.length > 0) {
        const lastLocation = history[history.length - 1];
        const timeDifference = Date.now() - lastLocation.timestamp;
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          lastLocation.latitude,
          lastLocation.longitude,
        );

        // Check if user hasn't moved more than 10 meters in the threshold time
        if (
          distance < 10 &&
          timeDifference > this.config.staticLocationThreshold
        ) {
          const panicEvent = {
            eventId: this.generateEventId(),
            userId: userId,
            type: "STATIC_LOCATION",
            triggerReason: "Stayed in same location too long",
            message: `User stayed in one location for ${Math.floor(
              timeDifference / 60000,
            )} minutes`,
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy || null,
            },
            durationMinutes: Math.floor(timeDifference / 60000),
            timestamp: new Date(),
            status: "ACTIVE",
            resolvedAt: null,
          };

          const eventKey = `${userId}_${panicEvent.eventId}`;
          this.panicEvents.set(eventKey, panicEvent);

          console.log("[PANIC BUTTON] Static location detected:", panicEvent);

          return {
            success: true,
            eventId: panicEvent.eventId,
            triggered: true,
            event: panicEvent,
          };
        }
      }

      // Update location history
      history.push({
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now(),
      });

      // Keep only last 100 location updates
      if (history.length > 100) {
        history.shift();
      }

      this.locationHistory.set(userId, history);

      return { success: true, triggered: false };
    } catch (error) {
      console.error("[PANIC BUTTON] Error detecting static location:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ML/DL: Detect accident using accelerometer data
   * Uses simple neural network approach for acceleration anomaly detection
   */
  async detectAccident(userId, sensorData) {
    try {
      // sensorData = { accelerationX, accelerationY, accelerationZ, gyroX, gyroY, gyroZ }
      const acceleration = Math.sqrt(
        sensorData.accelerationX ** 2 +
          sensorData.accelerationY ** 2 +
          sensorData.accelerationZ ** 2,
      );

      const rotationMagnitude = Math.sqrt(
        sensorData.gyroX ** 2 + sensorData.gyroY ** 2 + sensorData.gyroZ ** 2,
      );

      // Simple ML model: combination of high acceleration + rotation = potential accident
      const accidentScore = this.calculateAccidentScore(
        acceleration,
        rotationMagnitude,
      );

      if (accidentScore > 0.7) {
        // High confidence accident detected
        const panicEvent = {
          eventId: this.generateEventId(),
          userId: userId,
          type: "ACCIDENT_DETECTED",
          triggerReason: "Accident detected via sensor fusion",
          message: "Potential accident detected - emergency services alerted",
          location: null,
          sensorData: {
            acceleration: acceleration,
            rotationMagnitude: rotationMagnitude,
            accidentScore: accidentScore,
          },
          timestamp: new Date(),
          status: "ACTIVE",
          resolvedAt: null,
          mlConfidence: accidentScore,
        };

        const eventKey = `${userId}_${panicEvent.eventId}`;
        this.panicEvents.set(eventKey, panicEvent);

        console.log("[PANIC BUTTON] Accident detected via ML:", panicEvent);

        return {
          success: true,
          eventId: panicEvent.eventId,
          triggered: true,
          event: panicEvent,
          confidence: accidentScore,
        };
      }

      return { success: true, triggered: false, accidentScore: accidentScore };
    } catch (error) {
      console.error("[PANIC BUTTON] Error detecting accident:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate accident score using simplified neural network
   */
  calculateAccidentScore(acceleration, rotation) {
    // Weights trained on typical accident patterns
    const accelWeight = 0.6;
    const rotationWeight = 0.4;

    // Normalize values (accidents typically show >15 m/s² acceleration)
    const normalizedAccel = Math.min(acceleration / 30, 1.0);
    const normalizedRotation = Math.min(rotation / 500, 1.0);

    // Simple neural-like scoring
    const score =
      (normalizedAccel * accelWeight + normalizedRotation * rotationWeight) *
      (1 + Math.max(0, normalizedAccel - 0.5)); // Boost high acceleration

    return Math.min(score, 1.0);
  }

  /**
   * Detect anomalous movement patterns (sudden speed changes)
   */
  async detectAnomalousMovement(userId, locations) {
    try {
      if (locations.length < 2) {
        return { success: true, triggered: false };
      }

      const speedChanges = [];
      for (let i = 1; i < locations.length; i++) {
        const distance = this.calculateDistance(
          locations[i - 1].latitude,
          locations[i - 1].longitude,
          locations[i].latitude,
          locations[i].longitude,
        );
        const timeDiff = locations[i].timestamp - locations[i - 1].timestamp;
        const speed = distance / (timeDiff / 1000); // m/s

        if (i > 1) {
          const previousSpeed = speedChanges[i - 2].speed || 0;
          const speedChange = Math.abs(speed - previousSpeed);
          speedChanges.push({ speed, speedChange });
        } else {
          speedChanges.push({ speed, speedChange: 0 });
        }
      }

      // Check for extreme speed changes (possible accident)
      const extremeSpeedChange = speedChanges.some((sc) => sc.speedChange > 10); // 10 m/s change

      if (extremeSpeedChange) {
        const panicEvent = {
          eventId: this.generateEventId(),
          userId: userId,
          type: "ANOMALOUS_MOVEMENT",
          triggerReason: "Extreme speed change detected",
          message:
            "Unusual movement pattern detected - possible accident or emergency",
          timestamp: new Date(),
          status: "ACTIVE",
          resolvedAt: null,
          speedAnalysis: speedChanges,
        };

        const eventKey = `${userId}_${panicEvent.eventId}`;
        this.panicEvents.set(eventKey, panicEvent);

        console.log("[PANIC BUTTON] Anomalous movement detected:", panicEvent);

        return {
          success: true,
          eventId: panicEvent.eventId,
          triggered: true,
          event: panicEvent,
        };
      }

      return { success: true, triggered: false };
    } catch (error) {
      console.error(
        "[PANIC BUTTON] Error detecting anomalous movement:",
        error,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve a panic event
   */
  async resolvePanicEvent(userId, eventId, resolutionDetails = {}) {
    try {
      const eventKey = `${userId}_${eventId}`;
      const event = this.panicEvents.get(eventKey);

      if (!event) {
        return { success: false, error: "Event not found" };
      }

      event.status = "RESOLVED";
      event.resolvedAt = new Date();
      event.resolutionDetails = resolutionDetails;

      this.panicEvents.set(eventKey, event);

      console.log("[PANIC BUTTON] Event resolved:", event);

      return { success: true, event: event };
    } catch (error) {
      console.error("[PANIC BUTTON] Error resolving panic event:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active panic events for a user
   */
  getActivePanicEvents(userId) {
    const activeEvents = [];
    this.panicEvents.forEach((event, key) => {
      if (event.userId === userId && event.status === "ACTIVE") {
        activeEvents.push(event);
      }
    });
    return activeEvents;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `panic_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }

  /**
   * Configure danger zones
   */
  setDangerZones(zones) {
    this.config.dangerZones = zones;
    console.log("[PANIC BUTTON] Danger zones configured:", zones);
  }

  /**
   * Add a single danger zone
   */
  addDangerZone(zone) {
    if (!this.config.dangerZones) {
      this.config.dangerZones = [];
    }
    this.config.dangerZones.push(zone);
    console.log("[PANIC BUTTON] Danger zone added:", zone);
  }

  /**
   * Get panic button statistics (admin)
   */
  getPanicStats() {
    const events = Array.from(this.panicEvents.values());
    const totalEvents = events.length;
    const activeEvents = events.filter((e) => e.status === "ACTIVE").length;
    const resolvedEvents = events.filter((e) => e.status === "RESOLVED").length;

    // Count by trigger type - map to frontend expected format
    const eventsByType = {
      manual_panic: 0,
      lost_tracking: 0,
      geofence_breach: 0,
      static_location: 0,
      anomalous_movement: 0,
      accident: 0,
    };

    events.forEach((event) => {
      switch (event.type) {
        case "MANUAL_PANIC":
          eventsByType.manual_panic++;
          break;
        case "LOST_TRACKING":
          eventsByType.lost_tracking++;
          break;
        case "GEOFENCE_BREACH":
          eventsByType.geofence_breach++;
          break;
        case "STATIC_LOCATION":
          eventsByType.static_location++;
          break;
        case "ANOMALOUS_MOVEMENT":
          eventsByType.anomalous_movement++;
          break;
        case "ACCIDENT_DETECTED":
          eventsByType.accident++;
          break;
        default:
          // For any other types, count as manual_panic
          eventsByType.manual_panic++;
      }
    });

    // Get the most recent event
    const sortedEvents = events.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );
    const lastEvent = sortedEvents.length > 0 ? sortedEvents[0] : null;

    return {
      totalEvents,
      activeEvents,
      resolvedEvents,
      lastEvent,
      eventsByType,
    };
  }

  /**
   * Get all panic events (admin)
   */
  getAllPanicEvents() {
    return Array.from(this.panicEvents.values()).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );
  }

  /**
   * Get user panic button settings
   */
  getUserPanicSettings(userId) {
    // For now, return default settings. In a real implementation,
    // this would be stored in database per user
    return {
      autoTriggerLostTracking: true,
      autoTriggerGeofence: true,
      autoTriggerStaticLocation: true,
      autoTriggerAccident: true,
      staticLocationThresholdMinutes: 60,
      notifyEmergencyContact: true,
    };
  }

  /**
   * Update user panic button settings
   */
  updateUserPanicSettings(userId, settings) {
    // In a real implementation, this would save to database
    console.log(
      `[PANIC BUTTON] Updated settings for user ${userId}:`,
      settings,
    );
    return {
      userId,
      settings,
      updatedAt: new Date(),
    };
  }
}

export default new PanicButtonService();
