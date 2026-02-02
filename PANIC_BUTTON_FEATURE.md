# Panic Button Feature - Smart Tourist Safety System

## Overview

The Panic Button is an advanced safety feature that combines **manual triggers** with **automatic detection** using machine learning and deep learning algorithms. It protects tourists by detecting emergency situations and alerting authorities in real-time.

## Features

### 1. **Manual Panic Button**

- Large, easily accessible button in the mobile app
- Instantly triggers emergency alert with location
- Can be triggered anytime by the user
- Sends immediate notification to emergency contacts

### 2. **Automatic Detection Triggers**

#### Lost Tracking Detection

- **Trigger:** No location update received for more than 5 minutes
- **Action:** Automatically alerts system and user
- **Use Case:** Connection loss, GPS failure, device turned off

#### Geofence Breach Detection

- **Trigger:** User enters a configured danger zone
- **Configuration:** Admin can define danger zones with GPS coordinates and radius
- **Action:** Alerts user and optionally notifies authorities
- **Use Case:** Restricted areas, crime hotspots, hazardous locations

#### Static Location Detection

- **Trigger:** User stays in the same location for more than 1 hour without significant movement
- **Action:** Prompts user with safety check, escalates if no response
- **Use Case:** User may be injured, lost, or in distress

#### Accident Detection (ML/DL)

- **Trigger:** Rapid acceleration/deceleration detected via accelerometer
- **Algorithm:** Neural network-based sensor fusion
- **Confidence Score:** Real-time ML model outputs confidence percentage
- **Use Case:** Vehicle accidents, falls, collisions

#### Anomalous Movement Detection (ML)

- **Trigger:** Extreme speed changes detected between location updates
- **Algorithm:** Statistical anomaly detection using Z-score analysis
- **Pattern Recognition:** Identifies unusual movement patterns
- **Use Case:** Emergency evasion, injury causing irregular movement

## Architecture

### Backend Services

#### `panicButtonService.js`

Main service handling all panic button logic:

- Trigger management
- Event tracking
- Geofence calculation (Haversine formula)
- Static location detection
- Event resolution

#### `anomalyDetectionML.js`

Machine Learning module:

- **Accident Classification:** Neural network-based accident detection
- **Location Anomaly Detection:** Z-score based statistical analysis
- **Movement Anomaly Detection:** Speed pattern recognition
- **User Profiling:** Personalized baseline detection
- **Prediction:** Next location prediction for anomaly comparison

### API Endpoints

```
POST /api/panic/trigger-manual
  - Manually trigger panic button
  - Required: location {latitude, longitude}
  - Optional: emergencyType, message

POST /api/panic/detect-lost-tracking
  - Backend initiated: Detect lost tracking
  - Required: lastUpdateTime

POST /api/panic/detect-geofence-breach
  - Check if user entered danger zone
  - Required: location, dangerZones array

POST /api/panic/detect-static-location
  - Check if user stayed in same spot too long
  - Required: location

POST /api/panic/detect-accident
  - ML-based accident detection
  - Required: sensorData {accelerationX, Y, Z, gyroX, Y, Z}

POST /api/panic/detect-anomalous-movement
  - ML-based movement anomaly detection
  - Required: locations array with timestamps

POST /api/panic/resolve-event
  - Resolve an active panic event
  - Required: eventId

GET /api/panic/active-events
  - Get all active panic events for user

POST /api/panic/configure-danger-zones
  - Admin: Configure geofence danger zones
  - Required: zones array with {name, latitude, longitude, radius}
```

### Database Schema (User Model)

```javascript
{
  // ... existing fields ...

  // Panic event tracking
  panicEvents: [{
    eventId: String,
    type: String, // MANUAL_PANIC, LOST_TRACKING, GEOFENCE_BREACH, etc.
    triggerReason: String,
    message: String,
    location: { latitude, longitude, accuracy },
    status: String, // ACTIVE, RESOLVED, CANCELLED
    timestamp: Date,
    resolvedAt: Date,
    resolutionDetails: Object,
    mlConfidence: Number, // For ML-detected events
  }],

  // Panic button settings
  panicButtonEnabled: Boolean,
  panicButtonSettings: {
    autoTriggerLostTracking: Boolean,
    autoTriggerGeofence: Boolean,
    autoTriggerStaticLocation: Boolean,
    autoTriggerAccident: Boolean,
    staticLocationThresholdMinutes: Number,
    notifyEmergencyContact: Boolean,
  }
}
```

## Mobile Implementation

### PanicButtonScreen Component (`PanicButtonScreen.tsx`)

Features:

- Large, red panic button (180x180 px)
- Animated pulse effect when active
- Real-time monitoring every 30 seconds
- Sensor data collection (accelerometer, gyroscope)
- Geofence monitoring
- Static location tracking
- User-configurable auto-trigger settings
- Active panic event display
- Event resolution interface

#### Location History Tracking

```typescript
const locationHistoryRef = useRef<LocationHistory[]>([]);
// Maintains last 50 location updates for pattern analysis
```

#### Sensor Data Collection

```typescript
const sensorDataBufferRef = useRef<any[]>([]);
// Collects accelerometer/gyroscope data
// Triggers ML analysis every 10 readings
```

#### Auto-Trigger Settings UI

- Toggle for each detection type
- Customizable thresholds (e.g., static location time)
- Emergency contact notification toggle

## Machine Learning Models

### 1. Accident Detection Neural Network

**Input Features:**

- `acceleration`: Magnitude of acceleration (m/s²)
- `rotationMagnitude`: Combined gyroscope data (rad/s)
- `jerk`: Rate of change of acceleration
- `impactConsistency`: Alignment of force vectors

**Feature Extraction:**

```javascript
acceleration = sqrt(ax² + ay² + az²)
rotationMagnitude = sqrt(gx² + gy² + gz²)
jerk = sqrt((ax*gx)² + (ay*gy)² + (az*gz)²)
impactConsistency = max(|ax|, |ay|, |az|) / (acceleration + 0.001)
```

**Classification:**

```javascript
weights = {
  acceleration: 0.4, // Most important
  rotationMagnitude: 0.25,
  jerk: 0.2,
  impactConsistency: 0.15,
};

// Sigmoid activation for probability
score = 1 / (1 + exp(-5 * (weightedSum - 0.5)));
```

**Threshold:** Score > 0.7 triggers accident alert

### 2. Location Anomaly Detection (Z-Score Analysis)

**Method:**

1. Calculate speed between consecutive GPS points
2. Compute mean (μ) and standard deviation (σ) of speeds
3. Calculate Z-score: Z = |speed - μ| / σ
4. Flag outliers where |Z| > 3

**Personalized Detection:**

- Builds user profile from historical data
- Baseline normal speed range: μ ± 2σ
- Personalized threshold: |Z| > 2.5

### 3. Movement Anomaly Detection

**Detection Steps:**

1. Calculate acceleration between consecutive speeds
2. Identify extreme changes: |accel| > mean + 3\*stdDev
3. Calculate anomaly score: extremeChanges / totalPoints
4. Trigger if anomaly score > 0.15 (15% unusual points)

### 4. User Profiling & Prediction

**Profile Data:**

- Mean speed (normal movement rate)
- Max/min speeds (capability range)
- Standard deviation (consistency)

**Location Prediction:**

- Linear regression on last 3 positions
- Predicts next expected location
- Detects major deviations (>2 sigma)

## Configuration

### Environment Variables

```env
API_BASE_URL=http://localhost:5000
PANIC_BUTTON_ENABLED=true
STATIC_LOCATION_THRESHOLD_MS=3600000  # 1 hour
GEOFENCE_BUFFER_METERS=100
ACCIDENT_DETECTION_THRESHOLD=0.7
```

### Sample Danger Zones Configuration

```javascript
const dangerZones = [
  {
    name: "Crime Hotspot Downtown",
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 500 // meters
  },
  {
    name: "Industrial Area",
    latitude: 40.7000,
    longitude: -74.0200,
    radius: 1000
  }
];

// Set zones via API
POST /api/panic/configure-danger-zones
{
  "zones": dangerZones
}
```

## Usage Flow

### User Manual Panic Trigger

1. User taps large red panic button
2. System captures current GPS location
3. Creates emergency alert with type "MANUAL_PANIC"
4. Sends real-time notification to admin dashboard
5. Notifies emergency contacts via SMS/Push
6. Admin can track location and status in real-time

### Automatic Accident Detection

1. Mobile app collects sensor data continuously
2. Every 30 seconds, checks for anomalies
3. If acceleration spike detected:
   - ML model calculates confidence score
   - If score > 0.7, triggers panic event
   - User gets prompt confirming accident
   - Alert sent to emergency services
4. User can cancel false alarms

### Geofence Breach

1. User location checked against danger zones every 30 seconds
2. If location enters zone:
   - Creates "GEOFENCE_BREACH" event
   - Alerts user with zone name
   - Prompts user action
   - If confirmed, escalates to emergency

### Static Location Detection

1. System tracks location history
2. If same location (< 10m movement) for 1 hour:
   - Creates "STATIC_LOCATION" event
   - Prompts user: "Are you safe?"
   - 15-minute timeout for response
   - If no response, escalates to emergency

## Testing

### Test Scenarios

1. **Manual Panic**

   ```bash
   curl -X POST http://localhost:5000/api/panic/trigger-manual \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{
       "location": {"latitude": 40.7128, "longitude": -74.0060},
       "emergencyType": "panic"
     }'
   ```

2. **Accident Detection**

   ```bash
   curl -X POST http://localhost:5000/api/panic/detect-accident \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{
       "sensorData": {
         "accelerationX": 25,
         "accelerationY": 30,
         "accelerationZ": 20,
         "gyroX": 200,
         "gyroY": 250,
         "gyroZ": 180
       }
     }'
   ```

3. **Configure Danger Zones**
   ```bash
   curl -X POST http://localhost:5000/api/panic/configure-danger-zones \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -d '{
       "zones": [
         {
           "name": "Danger Zone 1",
           "latitude": 40.7128,
           "longitude": -74.0060,
           "radius": 500
         }
       ]
     }'
   ```

## Security Considerations

1. **Authentication:** All endpoints require valid JWT token
2. **Authorization:** Only admins can configure danger zones
3. **Rate Limiting:** Implement to prevent abuse
4. **Encryption:** Location data encrypted in transit
5. **False Alarm Handling:** Users can cancel alerts within 2 minutes
6. **Audit Logs:** All panic events logged with timestamps and user data

## Performance Optimization

1. **Location History:** Limited to 50 last updates (circular buffer)
2. **Sensor Data:** Limited to 100 readings with circular buffer
3. **Check Interval:** 30 seconds for location-based checks
4. **Batch Processing:** Sensor data analyzed every 10 readings
5. **In-Memory Storage:** Uses Map for fast event lookup

## Future Enhancements

1. **Computer Vision:** Integrate device camera for accident image capture
2. **Advanced ML:** Deploy pre-trained models (TensorFlow Lite)
3. **Crowd Sourcing:** Verify danger zone alerts with nearby users
4. **Predictive Analytics:** Predict danger based on time/location patterns
5. **Integration:** Connect with real emergency dispatch systems
6. **Voice Alert:** Real-time voice notification to user
7. **Wearable Integration:** Heart rate and fall detection from smartwatch

## Troubleshooting

### Issue: Panic button not triggering automatically

- Check `panicButtonSettings` in user document
- Verify `panicButtonEnabled` is true
- Check location permissions on device
- Verify sensor data is being collected

### Issue: False accident detection

- Adjust `accidentThreshold` (currently 0.7)
- Review sensor data quality
- Check for noisy accelerometer readings
- Consider adding debounce logic

### Issue: Geofence not detecting breach

- Verify danger zones are configured
- Check GPS accuracy (should be < 50m)
- Ensure location updates are continuous
- Verify zone coordinates are correct

## Support & Documentation

For more information:

- [Backend API Documentation](./BACKEND_API.md)
- [Mobile App Guide](./MOBILE_APP_GUIDE.md)
- [Admin Dashboard Guide](../docs/WEB_DASHBOARD_GUIDE.md)
- [ML Model Details](./ML_MODELS.md)
