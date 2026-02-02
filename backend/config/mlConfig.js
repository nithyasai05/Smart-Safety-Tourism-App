/**
 * ML Configuration and Feature Flags
 * Controls which ML libraries and features are enabled
 */

module.exports = {
  // Core ML features (always enabled - pure JavaScript)
  core: {
    accidentDetection: true,
    locationAnomaly: true,
    movementAnalysis: true,
    statisticalAnalysis: true,
  },

  // Enhanced ML features (optional - require external libraries)
  enhanced: {
    // Set to true to enable TensorFlow.js features
    tensorFlowEnabled: process.env.ENABLE_TENSORFLOW === "true",

    // Set to true to enable ML.js advanced algorithms
    mljsEnabled: process.env.ENABLE_MLJS === "true",

    // Set to true to enable all advanced ML features
    advancedMLEnabled: process.env.ENABLE_ADVANCED_ML === "true",
  },

  // Model configurations
  models: {
    accidentDetection: {
      threshold: 0.7,
      features: ["acceleration", "rotation", "jerk", "consistency"],
      weights: [0.4, 0.25, 0.2, 0.15],
    },

    locationPrediction: {
      minDataPoints: 5,
      polynomialDegree: 2,
      confidenceThreshold: 0.6,
    },

    anomalyDetection: {
      zScoreThreshold: 3,
      minDataPoints: 10,
      smoothingFactor: 0.3,
    },
  },

  // Performance settings
  performance: {
    maxTrainingDataPoints: 1000,
    modelUpdateInterval: 3600000, // 1 hour in milliseconds
    cacheEnabled: true,
    cacheTTL: 7200000, // 2 hours in milliseconds
  },

  // Logging and monitoring
  logging: {
    enableMLMetrics: process.env.LOG_ML_METRICS === "true",
    logLevel: process.env.ML_LOG_LEVEL || "info",
    metricsInterval: 300000, // 5 minutes
  },

  // Helper methods
  isEnhancedMLEnabled() {
    return (
      this.enhanced.advancedMLEnabled ||
      this.enhanced.tensorFlowEnabled ||
      this.enhanced.mljsEnabled
    );
  },

  shouldUseTensorFlow() {
    return this.enhanced.tensorFlowEnabled && this.enhanced.advancedMLEnabled;
  },

  shouldUseMLjs() {
    return this.enhanced.mljsEnabled && this.enhanced.advancedMLEnabled;
  },
};
