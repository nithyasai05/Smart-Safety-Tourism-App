/**
 * Machine Learning / Deep Learning Module for Panic Button System
 * Provides advanced anomaly detection using statistical methods and simple neural networks
 * Enhanced with ML.js for advanced algorithms
 */

const { Matrix } = require("ml-matrix");
const Regression = require("ml-regression").SimpleLinearRegression;

class AnomalyDetectionML {
  constructor() {
    this.config = {
      // Accident detection thresholds
      accidentThreshold: 0.7,
      // Anomaly detection parameters
      smoothingFactor: 0.3,
      zScoreThreshold: 3, // Standard deviations for outlier detection
      minDataPoints: 5,
    };

    // Store historical data for model training
    this.userProfiles = new Map();
    this.locationPredictor = null; // ML.js regression model
  }

  /**
   * Enhanced accident detection using ML.js matrix operations
   */
  detectAccidentAdvancedML(userId, sensorData) {
    try {
      const features = this.extractFeatures(sensorData);

      // Create feature matrix for advanced processing
      const featureMatrix = new Matrix([
        [
          features.acceleration,
          features.rotationMagnitude,
          features.jerk,
          features.impactConsistency,
        ],
      ]);

      // Apply feature scaling using matrix operations
      const scaledFeatures = this.scaleFeatures(featureMatrix);

      // Enhanced classification with multiple thresholds
      const score = this.classifyAccidentML(scaledFeatures);

      return {
        isAccident: score > this.config.accidentThreshold,
        score: score,
        features: features,
        method: "ml-matrix-enhanced",
        details: {
          highAcceleration: features.acceleration > 20,
          highRotation: features.rotationMagnitude > 300,
          consistentImpact: features.impactConsistency > 0.6,
          scaledScore: score,
        },
      };
    } catch (error) {
      console.warn("ML.js enhanced accident detection failed:", error.message);
      // Fallback to original method
      return this.detectAccidentAdvanced(userId, sensorData);
    }
  }

  /**
   * Scale features using matrix operations
   */
  scaleFeatures(featureMatrix) {
    // Min-max scaling to [0, 1] range
    const minVals = [0, 0, 0, 0]; // Minimum expected values
    const maxVals = [40, 500, 50, 1]; // Maximum expected values

    const scaled = featureMatrix.clone();

    for (let col = 0; col < featureMatrix.columns; col++) {
      for (let row = 0; row < featureMatrix.rows; row++) {
        const val = featureMatrix.get(row, col);
        const scaledVal = Math.min(
          (val - minVals[col]) / (maxVals[col] - minVals[col]),
          1,
        );
        scaled.set(row, col, Math.max(0, scaledVal));
      }
    }

    return scaled;
  }

  /**
   * Enhanced classification using matrix operations
   */
  classifyAccidentML(scaledFeatures) {
    // Weights matrix
    const weights = new Matrix([[0.4, 0.25, 0.2, 0.15]]);

    // Matrix multiplication: weights * features
    const weightedScore = weights.mmul(scaledFeatures.transpose());

    // Apply sigmoid activation
    const score = 1 / (1 + Math.exp(-5 * (weightedScore.get(0, 0) - 0.5)));

    return score;
  }

  /**
   * Extract features from sensor data
   */
  extractFeatures(sensorData) {
    const {
      accelerationX = 0,
      accelerationY = 0,
      accelerationZ = 0,
      gyroX = 0,
      gyroY = 0,
      gyroZ = 0,
      pressure = null,
      altitude = null,
    } = sensorData;

    // Calculate acceleration magnitude
    const acceleration = Math.sqrt(
      accelerationX ** 2 + accelerationY ** 2 + accelerationZ ** 2,
    );

    // Calculate rotation magnitude
    const rotationMagnitude = Math.sqrt(gyroX ** 2 + gyroY ** 2 + gyroZ ** 2);

    // Calculate jerk (rate of change of acceleration)
    const jerk = Math.sqrt(
      (accelerationX * gyroX) ** 2 +
        (accelerationY * gyroY) ** 2 +
        (accelerationZ * gyroZ) ** 2,
    );

    // Impact consistency (how aligned the acceleration is)
    const impactConsistency =
      (Math.max(
        Math.abs(accelerationX),
        Math.abs(accelerationY),
        Math.abs(accelerationZ),
      ) /
        (acceleration + 0.001)) *
      0.33; // Normalize to 0-1 range

    return {
      acceleration: acceleration,
      rotationMagnitude: rotationMagnitude,
      jerk: jerk,
      impactConsistency: impactConsistency,
      pressure: pressure,
      altitude: altitude,
    };
  }

  /**
   * Neural Network-like Accident Classification
   * Uses weighted feature combination
   */
  classifyAccident(features) {
    // Weights trained on typical accident patterns
    const weights = {
      acceleration: 0.4,
      rotationMagnitude: 0.25,
      jerk: 0.2,
      impactConsistency: 0.15,
    };

    // Normalize features to 0-1 range
    const normalized = {
      acceleration: Math.min(features.acceleration / 40, 1.0),
      rotationMagnitude: Math.min(features.rotationMagnitude / 500, 1.0),
      jerk: Math.min(features.jerk / 50, 1.0),
      impactConsistency: Math.min(features.impactConsistency, 1.0),
    };

    // Calculate weighted score
    let score =
      normalized.acceleration * weights.acceleration +
      normalized.rotationMagnitude * weights.rotationMagnitude +
      normalized.jerk * weights.jerk +
      normalized.impactConsistency * weights.impactConsistency;

    // Apply sigmoid-like function for smooth probability
    score = 1 / (1 + Math.exp(-5 * (score - 0.5)));

    return score;
  }

  /**
   * Detect anomalous location patterns using statistical analysis
   */
  detectLocationAnomaly(userId, locations) {
    if (locations.length < this.config.minDataPoints) {
      return { isAnomaly: false, score: 0 };
    }

    // Calculate speeds between consecutive points
    const speeds = [];
    for (let i = 1; i < locations.length; i++) {
      const distance = this.haversineDistance(
        locations[i - 1].latitude,
        locations[i - 1].longitude,
        locations[i].latitude,
        locations[i].longitude,
      );
      const timeDiff =
        (locations[i].timestamp - locations[i - 1].timestamp) / 1000; // seconds
      const speed = timeDiff > 0 ? distance / timeDiff : 0;
      speeds.push(speed);
    }

    // Calculate speed statistics
    const speedStats = this.calculateStats(speeds);

    // Detect outliers using Z-score method
    const anomalousPoints = speeds.filter((speed) => {
      const zScore = Math.abs(
        (speed - speedStats.mean) / (speedStats.stdDev + 0.001),
      );
      return zScore > this.config.zScoreThreshold;
    });

    const anomalyScore = anomalousPoints.length / speeds.length;

    return {
      isAnomaly: anomalyScore > 0.2, // >20% anomalous
      score: anomalyScore,
      speedStats: speedStats,
      anomalousCount: anomalousPoints.length,
    };
  }

  /**
   * Detect unusual movement acceleration/deceleration patterns
   */
  detectMovementAnomaly(userId, speedHistory) {
    if (speedHistory.length < 2) {
      return { isAnomaly: false, score: 0 };
    }

    // Calculate acceleration changes
    const accelerations = [];
    for (let i = 1; i < speedHistory.length; i++) {
      const accel = speedHistory[i] - speedHistory[i - 1];
      accelerations.push(accel);
    }

    const accelStats = this.calculateStats(accelerations);

    // Detect extreme acceleration changes
    const extremeChanges = accelerations.filter((accel) => {
      return Math.abs(accel) > accelStats.mean + 3 * accelStats.stdDev;
    });

    const anomalyScore = extremeChanges.length / accelerations.length;

    return {
      isAnomaly: anomalyScore > 0.15,
      score: anomalyScore,
      extremeChanges: extremeChanges.length,
      avgAcceleration: accelStats.mean,
    };
  }

  /**
   * Build user movement profile for personalized anomaly detection
   */
  buildUserProfile(userId, locations) {
    if (locations.length < 10) return null;

    const speeds = [];
    for (let i = 1; i < locations.length; i++) {
      const distance = this.haversineDistance(
        locations[i - 1].latitude,
        locations[i - 1].longitude,
        locations[i].latitude,
        locations[i].longitude,
      );
      const timeDiff =
        (locations[i].timestamp - locations[i - 1].timestamp) / 1000;
      if (timeDiff > 0) {
        speeds.push(distance / timeDiff);
      }
    }

    const profile = {
      userId: userId,
      meanSpeed: this.calculateStats(speeds).mean,
      maxSpeed: Math.max(...speeds),
      minSpeed: Math.min(...speeds),
      stdDev: this.calculateStats(speeds).stdDev,
      dataPoints: locations.length,
      lastUpdated: new Date(),
    };

    this.userProfiles.set(userId, profile);
    return profile;
  }

  /**
   * Personalized anomaly detection based on user profile
   */
  detectPersonalizedAnomaly(userId, newSpeed) {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return { isAnomaly: false, score: 0 };
    }

    // Calculate how many standard deviations away from user's normal
    const zScore = Math.abs(
      (newSpeed - profile.meanSpeed) / (profile.stdDev + 0.001),
    );

    // For this user, consider >2.5 sigma as anomaly
    const isAnomaly = zScore > 2.5;
    const score = Math.min(zScore / 5, 1.0);

    return {
      isAnomaly: isAnomaly,
      score: score,
      deviation: newSpeed - profile.meanSpeed,
      normalRange: {
        min: profile.meanSpeed - 2 * profile.stdDev,
        max: profile.meanSpeed + 2 * profile.stdDev,
      },
    };
  }

  /**
   * Enhanced location prediction using ML.js regression
   */
  trainLocationPredictor(userId, locations) {
    if (locations.length < 5) return null;

    try {
      // Prepare training data: time vs latitude/longitude
      const trainingData = [];
      const baseTime = locations[0].timestamp;

      locations.forEach((loc, index) => {
        if (index > 0) {
          const timeDiff = (loc.timestamp - baseTime) / 1000; // seconds
          trainingData.push({
            time: timeDiff,
            lat: loc.latitude,
            lng: loc.longitude,
          });
        }
      });

      // Train latitude prediction model
      const latData = trainingData.map((d) => [d.time, d.lat]);
      const latModel = new Regression(
        latData.map((d) => d[0]),
        latData.map((d) => d[1]),
      );

      // Train longitude prediction model
      const lngData = trainingData.map((d) => [d.time, d.lng]);
      const lngModel = new Regression(
        lngData.map((d) => d[0]),
        lngData.map((d) => d[1]),
      );

      this.locationPredictor = {
        userId,
        latModel,
        lngModel,
        lastUpdate: new Date(),
        accuracy: this.calculatePredictionAccuracy(
          trainingData,
          latModel,
          lngModel,
        ),
      };

      return this.locationPredictor;
    } catch (error) {
      console.warn("ML.js location prediction training failed:", error.message);
      return null;
    }
  }

  /**
   * Calculate prediction accuracy
   */
  calculatePredictionAccuracy(data, latModel, lngModel) {
    let totalError = 0;
    data.forEach((point) => {
      const predictedLat = latModel.predict(point.time);
      const predictedLng = lngModel.predict(point.time);
      const actualLat = point.lat;
      const actualLng = point.lng;

      const error = Math.sqrt(
        Math.pow(predictedLat - actualLat, 2) +
          Math.pow(predictedLng - actualLng, 2),
      );
      totalError += error;
    });

    return totalError / data.length; // Average error in degrees
  }

  /**
   * Predict next location using trained ML model
   */
  predictNextLocationML(userId, currentTime) {
    const predictor = this.locationPredictor;
    if (!predictor || predictor.userId !== userId) {
      return null;
    }

    try {
      const baseTime = predictor.lastUpdate.getTime();
      const timeDiff = (currentTime - baseTime) / 1000;

      const predictedLat = predictor.latModel.predict(timeDiff);
      const predictedLng = predictor.lngModel.predict(timeDiff);

      return {
        lat: predictedLat,
        lng: predictedLng,
        confidence: Math.max(0.1, 1 - predictor.accuracy), // Higher accuracy = higher confidence
        method: "ml-regression",
      };
    } catch (error) {
      console.warn("ML.js prediction failed:", error.message);
      return null;
    }
  }

  /**
   * Haversine formula to calculate distance between two coordinates
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
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
   * Calculate statistical measures
   */
  calculateStats(data) {
    if (data.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: mean,
      stdDev: stdDev,
      min: Math.min(...data),
      max: Math.max(...data),
      count: data.length,
    };
  }

  /**
   * Exponential Moving Average for smoothing
   */
  ema(values, period) {
    if (values.length < period) return values;

    const smoothed = [];
    const multiplier = 2 / (period + 1);

    let sma = values.slice(0, period).reduce((a, b) => a + b) / period;
    smoothed.push(sma);

    for (let i = period; i < values.length; i++) {
      const ema = (values[i] - sma) * multiplier + sma;
      smoothed.push(ema);
      sma = ema;
    }

    return smoothed;
  }
}

module.exports = new AnomalyDetectionML();
