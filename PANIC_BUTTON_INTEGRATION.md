# Panic Button Integration Guide

## Quick Start

### Backend Setup

1. **Services Created:**
   - `backend/services/panicButtonService.js` - Main panic button logic
   - `backend/services/anomalyDetectionML.js` - ML/DL models for accident detection

2. **Routes Added:**
   - `backend/routes/panicButton.js` - All panic button endpoints

3. **Database Schema:**
   - Updated `User` model with panic event tracking fields
   - Added `panicButtonSettings` for user preferences

4. **Server Integration:**
   - Updated `backend/server.js` to include panic button routes
   - Available at `/api/panic/*` endpoints

### Mobile Setup

1. **Screen Component:**
   - `mobile/TouristSafetyApp/src/screens/PanicButtonScreen.tsx` - Full-featured panic button UI
   - Features: Manual trigger, auto-detection toggles, active event display

2. **Navigation:**
   - Added to bottom tab navigator with 🆘 icon
   - Access as 4th tab in main app

3. **Types Updated:**
   - Added `PanicButton` to `TabStackParamList`

### Features Implemented

| Feature                      | Type     | ML/DL | Status         |
| ---------------------------- | -------- | ----- | -------------- |
| Manual Panic Button          | Trigger  | ❌    | ✅ Implemented |
| Lost Tracking Detection      | Auto     | ❌    | ✅ Implemented |
| Geofence Breach Detection    | Auto     | ❌    | ✅ Implemented |
| Static Location Detection    | Auto     | ❌    | ✅ Implemented |
| Accident Detection           | Auto     | ✅    | ✅ Implemented |
| Anomalous Movement Detection | Auto     | ✅    | ✅ Implemented |
| User Profiling               | Learning | ✅    | ✅ Implemented |
| Location Prediction          | ML       | ✅    | ✅ Implemented |

## API Endpoints

### Trigger Panic Button

```bash
POST /api/panic/trigger-manual
Authorization: Bearer TOKEN

{
  "location": { "latitude": 40.7128, "longitude": -74.0060 },
  "emergencyType": "panic",
  "message": "Optional message"
}
```

### Check Lost Tracking

```bash
POST /api/panic/detect-lost-tracking
Authorization: Bearer TOKEN

{
  "lastUpdateTime": 1674125000000
}
```

### Check Geofence Breach

```bash
POST /api/panic/detect-geofence-breach
Authorization: Bearer TOKEN

{
  "location": { "latitude": 40.7128, "longitude": -74.0060 },
  "dangerZones": [
    {
      "name": "Danger Zone 1",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "radius": 500
    }
  ]
}
```

### Check Static Location

```bash
POST /api/panic/detect-static-location
Authorization: Bearer TOKEN

{
  "location": { "latitude": 40.7128, "longitude": -74.0060 }
}
```

### ML: Detect Accident

```bash
POST /api/panic/detect-accident
Authorization: Bearer TOKEN

{
  "sensorData": {
    "accelerationX": 25,
    "accelerationY": 30,
    "accelerationZ": 20,
    "gyroX": 200,
    "gyroY": 250,
    "gyroZ": 180
  }
}
```

### ML: Detect Anomalous Movement

```bash
POST /api/panic/detect-anomalous-movement
Authorization: Bearer TOKEN

{
  "locations": [
    { "latitude": 40.7128, "longitude": -74.0060, "timestamp": 1674125000000 },
    { "latitude": 40.7129, "longitude": -74.0061, "timestamp": 1674125030000 }
  ]
}
```

### Resolve Event

```bash
POST /api/panic/resolve-event
Authorization: Bearer TOKEN

{
  "eventId": "panic_1674125000000_abc123",
  "resolutionDetails": { "userConfirmed": true }
}
```

### Get Active Events

```bash
GET /api/panic/active-events
Authorization: Bearer TOKEN
```

### Configure Danger Zones (Admin Only)

```bash
POST /api/panic/configure-danger-zones
Authorization: Bearer ADMIN_TOKEN

{
  "zones": [
    {
      "name": "Crime Hotspot Downtown",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "radius": 500
    },
    {
      "name": "Industrial Area",
      "latitude": 40.7000,
      "longitude": -74.0200,
      "radius": 1000
    }
  ]
}
```

## Machine Learning Models

### 1. Accident Detection Neural Network

**Algorithm:** Weighted feature classification with sigmoid activation
**Input:** Accelerometer (3-axis) and Gyroscope (3-axis) data
**Output:** Confidence score (0-1)
**Threshold:** > 0.7 triggers alert

**Features Extracted:**

- Acceleration magnitude
- Rotation magnitude
- Jerk (rate of change)
- Impact consistency

**Weights:**

- Acceleration: 40%
- Rotation: 25%
- Jerk: 20%
- Consistency: 15%

### 2. Location Anomaly Detection

**Algorithm:** Z-score statistical analysis
**Method:**

1. Calculate speed between GPS points
2. Compute mean and standard deviation
3. Detect outliers where |Z| > 3

**Personalized Mode:**

- Builds user profile from history
- Customizes threshold per user (|Z| > 2.5)
- Adapts to user's movement patterns

### 3. Movement Anomaly Detection

**Algorithm:** Speed change analysis
**Detection:**

- Identify extreme acceleration changes
- Trigger if >15% of movements are anomalous
- Useful for fall/accident detection

### 4. User Profiling

**Profile Data:**

- Mean speed (baseline)
- Speed variance (consistency)
- Max/min speeds (capability)
- Movement patterns

**Location Prediction:**

- Linear regression on last 3 positions
- Predicts next location
- Detects major deviations

## Testing the Features

### Manual Test 1: Trigger Panic

1. Open app, go to "Panic" tab
2. Tap large red panic button
3. Confirm alert shows in admin dashboard

### Manual Test 2: Lost Tracking

1. Kill app or disable GPS
2. Wait 5+ minutes
3. System should detect lost tracking
4. User gets alert notification

### Manual Test 3: Geofence

1. Configure danger zones via API
2. Navigate device to zone boundary
3. System detects breach
4. User gets confirmation prompt

### Manual Test 4: Static Location

1. Stay in one location
2. Wait 1 hour without moving >10m
3. System triggers static location alert
4. User can confirm they're safe

### Manual Test 5: Accident Detection

1. Simulate high acceleration via test API
2. Send sensor data with acceleration > 20 m/s²
3. System returns high confidence score
4. Alert triggered automatically

## Configuration

### Environment Variables (Backend)

```env
# Panic Button Configuration
PANIC_BUTTON_ENABLED=true
STATIC_LOCATION_THRESHOLD_MS=3600000    # 1 hour
LOST_TRACKING_THRESHOLD_MS=300000       # 5 minutes
GEOFENCE_BUFFER_METERS=100
ACCIDENT_DETECTION_THRESHOLD=0.7
ZCORE_THRESHOLD=3
ANOMALY_PERCENTAGE_THRESHOLD=0.2
```

### User Settings (Customizable)

```javascript
{
  panicButtonEnabled: true,
  panicButtonSettings: {
    autoTriggerLostTracking: true,
    autoTriggerGeofence: true,
    autoTriggerStaticLocation: true,
    autoTriggerAccident: true,
    staticLocationThresholdMinutes: 60,
    notifyEmergencyContact: true
  }
}
```

## Mobile App Integration

### Location Monitoring

- Starts automatically in background
- 30-second check interval
- Maintains last 50 location history

### Sensor Monitoring

- Accelerometer data collection
- Gyroscope data collection
- Processes every 10 readings
- Buffers last 100 readings

### Real-time Updates

- Socket.IO integration for live alerts
- Push notifications for critical events
- Admin dashboard updates in real-time

## Admin Dashboard Integration

### New Features

- Panic event timeline
- Active alert map view
- User-by-user panic history
- Statistics and trends
- Quick event resolution

### Existing Integration

- Resolves via existing `/api/alerts/:alertId/resolve`
- Updates admin dashboard in real-time
- Stores event history in database

## Security Considerations

1. **Authentication:** All endpoints require JWT token
2. **Authorization:** Role-based access control
3. **Rate Limiting:** Implement to prevent spam
4. **Data Validation:** Input validation on all endpoints
5. **Encryption:** Location data encrypted in transit
6. **Audit Trail:** All panic events logged

## Performance Notes

- In-memory storage for real-time responsiveness
- Production: Move to database for persistence
- Circular buffers prevent memory leaks
- Efficient distance calculations (Haversine)
- Minimal ML model overhead

## Next Steps

### Immediate (v1.0)

- ✅ Core panic button functionality
- ✅ ML-based accident detection
- ✅ Auto-trigger scenarios
- ✅ User settings

### Short-term (v1.1)

- [ ] Database persistence for panic events
- [ ] Admin event management interface
- [ ] SMS/Email notifications
- [ ] Enhanced ML models

### Medium-term (v1.2)

- [ ] TensorFlow Lite integration
- [ ] Camera-based accident detection
- [ ] Voice alerts
- [ ] Crowd-sourced danger zones

### Long-term (v2.0)

- [ ] Real emergency dispatch integration
- [ ] Wearable device support
- [ ] Advanced predictive analytics
- [ ] Multi-country support

## Troubleshooting

### Panic Not Triggering

- Check `panicButtonEnabled` is true
- Verify location permissions
- Check network connection
- Review backend logs

### False Accident Alerts

- Adjust `accidentThreshold` (0.5-0.9 range)
- Review sensor calibration
- Check for noisy accelerometer
- Add debounce logic if needed

### Geofence Not Detecting

- Verify danger zones configured
- Check GPS accuracy
- Ensure continuous location updates
- Verify zone coordinates

### Lost Tracking Not Working

- Verify threshold setting (default 5 min)
- Check location update frequency
- Ensure network connectivity
- Review location permissions

## Support

For issues or questions:

1. Check logs: `backend/logs/`
2. Review panic button documentation
3. Test with sample API calls
4. Check device permissions
5. Verify network connectivity

## Documentation

- Full feature guide: [PANIC_BUTTON_FEATURE.md](../PANIC_BUTTON_FEATURE.md)
- API reference: [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
- ML models: [ML_MODELS.md](../ML_MODELS.md)
- Mobile app: [MOBILE_APP_GUIDE.md](../docs/WEB_DASHBOARD_GUIDE.md)
