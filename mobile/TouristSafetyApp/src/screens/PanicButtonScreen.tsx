import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { emergencyAPI, tokenManager } from '../services/api';
import { locationService } from '../services/locationService';
import socketService from '../services/socketService';
import { NavigationProps, User } from '../types';

const { width, height } = Dimensions.get('window');

interface PanicButtonSettings {
  autoTriggerLostTracking: boolean;
  autoTriggerGeofence: boolean;
  autoTriggerStaticLocation: boolean;
  autoTriggerAccident: boolean;
  staticLocationThresholdMinutes: number;
  notifyEmergencyContact: boolean;
}

interface LocationHistory {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface PanicEvent {
  eventId: string;
  type: string;
  triggerReason: string;
  message: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp: string;
  status: string;
  mlConfidence?: number;
}

const PanicButtonScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [panicTriggered, setPanicTriggered] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [activePanicEvents, setActivePanicEvents] = useState<PanicEvent[]>([]);
  const [settings, setSettings] = useState<PanicButtonSettings>({
    autoTriggerLostTracking: true,
    autoTriggerGeofence: true,
    autoTriggerStaticLocation: true,
    autoTriggerAccident: true,
    staticLocationThresholdMinutes: 60,
    notifyEmergencyContact: true,
  });

  const locationHistoryRef = useRef<LocationHistory[]>([]);
  const lastLocationUpdateRef = useRef<number>(Date.now());
  const sensorDataBufferRef = useRef<any[]>([]);
  const monitoringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  useEffect(() => {
    loadUserData();
    startMonitoring();
    startSensorMonitoring();

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await tokenManager.getUserData();
      if (userData) {
        setUser(userData);
        setSettings(userData.panicButtonSettings || settings);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const startMonitoring = async () => {
    if (!user) return;

    monitoringIntervalRef.current = setInterval(async () => {
      try {
        // Get current location
        const location = await locationService.getCurrentLocation();

        if (location) {
          // Update location history
          locationHistoryRef.current.push({
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: Date.now(),
          });

          lastLocationUpdateRef.current = Date.now();

          // Keep only last 50 locations
          if (locationHistoryRef.current.length > 50) {
            locationHistoryRef.current.shift();
          }

          // Check for static location
          if (settings.autoTriggerStaticLocation) {
            await checkStaticLocation(location);
          }

          // Check for geofence breach
          if (settings.autoTriggerGeofence) {
            await checkGeofenceBreach(location);
          }

          // Check for anomalous movement
          if (locationHistoryRef.current.length > 5) {
            await checkAnomalousMovement();
          }
        }

        // Check for lost tracking
        if (settings.autoTriggerLostTracking) {
          const timeSinceLast = Date.now() - lastLocationUpdateRef.current;
          if (timeSinceLast > 300000) {
            // 5 minutes
            await triggerLostTracking(timeSinceLast);
          }
        }
      } catch (error) {
        console.error('Error during monitoring:', error);
      }
    }, 30000); // Check every 30 seconds
  };

  const startSensorMonitoring = async () => {
    if (!settings.autoTriggerAccident) return;

    try {
      // Subscribe to accelerometer data (requires native module setup)
      if (Platform.OS === 'ios') {
        // iOS accelerometer subscription
        const subscription = DeviceEventEmitter.addListener(
          'AccelerometerUpdate',
          data => {
            sensorDataBufferRef.current.push({
              accelerationX: data.x,
              accelerationY: data.y,
              accelerationZ: data.z,
              timestamp: Date.now(),
            });

            // Keep only last 100 readings
            if (sensorDataBufferRef.current.length > 100) {
              sensorDataBufferRef.current.shift();
            }

            // Check for accident every 10 readings
            if (sensorDataBufferRef.current.length % 10 === 0) {
              checkAccident();
            }
          },
        );

        return () => subscription.remove();
      } else {
        // Android accelerometer subscription
        const subscription = DeviceEventEmitter.addListener(
          'AccelerometerUpdate',
          data => {
            sensorDataBufferRef.current.push({
              accelerationX: data.x,
              accelerationY: data.y,
              accelerationZ: data.z,
              timestamp: Date.now(),
            });

            if (sensorDataBufferRef.current.length > 100) {
              sensorDataBufferRef.current.shift();
            }

            if (sensorDataBufferRef.current.length % 10 === 0) {
              checkAccident();
            }
          },
        );

        return () => subscription.remove();
      }
    } catch (error) {
      console.error('Error setting up sensor monitoring:', error);
    }
  };

  const checkStaticLocation = async (currentLocation: any) => {
    try {
      const response = await emergencyAPI.post(
        '/api/panic/detect-static-location',
        {
          location: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy,
          },
        },
      );

      if (response.data.success && response.data.triggered) {
        handlePanicTrigger(response.data.event);
        Alert.alert(
          '⚠️ Safety Alert',
          'You have been in the same location for over an hour. Are you safe?',
          [
            {
              text: "I'm OK",
              onPress: () => resolvePanicEvent(response.data.eventId),
            },
            {
              text: 'Need Help',
              onPress: () => handleManualPanic('static_location'),
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error checking static location:', error);
    }
  };

  const checkGeofenceBreach = async (currentLocation: any) => {
    try {
      const response = await emergencyAPI.post(
        '/api/panic/detect-geofence-breach',
        {
          location: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy,
          },
        },
      );

      if (response.data.success && response.data.triggered) {
        handlePanicTrigger(response.data.event);
        Alert.alert(
          '🚨 Danger Zone Alert',
          `You have entered a restricted area: ${response.data.breachedZone?.name}`,
          [
            {
              text: 'Cancel',
              onPress: () => resolvePanicEvent(response.data.eventId),
            },
            {
              text: 'Confirm Emergency',
              onPress: () => handleManualPanic('geofence_breach'),
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error checking geofence:', error);
    }
  };

  const checkAnomalousMovement = async () => {
    try {
      const response = await emergencyAPI.post(
        '/api/panic/detect-anomalous-movement',
        {
          locations: locationHistoryRef.current.slice(-10),
        },
      );

      if (response.data.success && response.data.triggered) {
        handlePanicTrigger(response.data.event);
        Alert.alert(
          '⚠️ Unusual Movement Detected',
          'System detected unusual movement patterns that may indicate an accident. Are you safe?',
          [
            {
              text: "I'm OK",
              onPress: () => resolvePanicEvent(response.data.eventId),
            },
            {
              text: 'I Need Help',
              onPress: () => handleManualPanic('anomalous_movement'),
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error checking anomalous movement:', error);
    }
  };

  const checkAccident = async () => {
    try {
      if (sensorDataBufferRef.current.length < 10) return;

      // Calculate average acceleration magnitude
      const avgAccel =
        sensorDataBufferRef.current.reduce((sum, data) => {
          return (
            sum +
            Math.sqrt(
              data.accelerationX ** 2 +
                data.accelerationY ** 2 +
                data.accelerationZ ** 2,
            )
          );
        }, 0) / sensorDataBufferRef.current.length;

      // If high acceleration detected, send to server for ML analysis
      if (avgAccel > 15) {
        const response = await emergencyAPI.post('/api/panic/detect-accident', {
          sensorData: {
            accelerationX:
              sensorDataBufferRef.current[
                sensorDataBufferRef.current.length - 1
              ].accelerationX,
            accelerationY:
              sensorDataBufferRef.current[
                sensorDataBufferRef.current.length - 1
              ].accelerationY,
            accelerationZ:
              sensorDataBufferRef.current[
                sensorDataBufferRef.current.length - 1
              ].accelerationZ,
            gyroX: 0,
            gyroY: 0,
            gyroZ: 0,
          },
        });

        if (response.data.success && response.data.triggered) {
          handlePanicTrigger(response.data.event);
          Alert.alert(
            '🚨 ACCIDENT DETECTED',
            'Accident detection algorithm has identified a potential impact. Alerting emergency services...',
            [
              {
                text: 'Cancel Emergency',
                onPress: () => resolvePanicEvent(response.data.eventId),
              },
            ],
          );
        }
      }
    } catch (error) {
      console.error('Error checking accident:', error);
    }
  };

  const triggerLostTracking = async (timeSinceLast: number) => {
    try {
      const response = await emergencyAPI.post(
        '/api/panic/detect-lost-tracking',
        {
          lastUpdateTime: lastLocationUpdateRef.current,
        },
      );

      if (response.data.success && response.data.triggered) {
        handlePanicTrigger(response.data.event);
        Alert.alert(
          '📍 Tracking Lost',
          `Location tracking lost for ${Math.floor(
            timeSinceLast / 60000,
          )} minutes. Attempting to restore...`,
        );
      }
    } catch (error) {
      console.error('Error detecting lost tracking:', error);
    }
  };

  const handleManualPanic = async (emergencyType: string) => {
    try {
      const location = await locationService.getCurrentLocation();

      const response = await emergencyAPI.post('/api/panic/trigger-manual', {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        },
        emergencyType,
        message: `Manual panic triggered - Type: ${emergencyType}`,
      });

      if (response.data.success) {
        handlePanicTrigger(response.data.event);

        // Emit socket event to notify admin
        socketService.emit('panicAlert', {
          userId: user?._id,
          eventId: response.data.eventId,
          event: response.data.event,
        });

        Alert.alert(
          '🚨 EMERGENCY ALERT SENT',
          'Emergency services and your contacts have been notified. Help is on the way.',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('Error triggering panic:', error);
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
    }
  };

  const handlePanicTrigger = (event: PanicEvent) => {
    setPanicTriggered(true);
    setActivePanicEvents([...activePanicEvents, event]);
    startPulseAnimation();
  };

  const resolvePanicEvent = async (eventId: string) => {
    try {
      const response = await emergencyAPI.post('/api/panic/resolve-event', {
        eventId,
        resolutionDetails: {
          userConfirmed: true,
          resolvedAt: new Date(),
        },
      });

      if (response.data.success) {
        setActivePanicEvents(
          activePanicEvents.filter(e => e.eventId !== eventId),
        );
        if (activePanicEvents.length === 0) {
          setPanicTriggered(false);
        }
      }
    } catch (error) {
      console.error('Error resolving panic event:', error);
    }
  };

  const toggleSetting = (
    settingKey: keyof PanicButtonSettings,
    value: boolean,
  ) => {
    setSettings({
      ...settings,
      [settingKey]: value,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading Panic Button...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Main Panic Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => handleManualPanic('manual_panic')}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              styles.panicButton,
              {
                transform: [{ scale: panicTriggered ? pulseAnim : 1 }],
                backgroundColor: panicTriggered ? '#c0392b' : '#e74c3c',
              },
            ]}
          >
            <Text style={styles.panicButtonText}>🚨 PANIC</Text>
            <Text style={styles.panicButtonSubtext}>
              {panicTriggered ? 'ALERT ACTIVE' : 'Press & Hold'}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Active Panic Events */}
      {activePanicEvents.length > 0 && (
        <View style={styles.eventsContainer}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          {activePanicEvents.map(event => (
            <View key={event.eventId} style={styles.eventCard}>
              <Text style={styles.eventType}>{event.type}</Text>
              <Text style={styles.eventMessage}>{event.message}</Text>
              <TouchableOpacity
                style={styles.resolveButton}
                onPress={() => resolvePanicEvent(event.eventId)}
              >
                <Text style={styles.resolveButtonText}>✓ Resolve</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Auto-Trigger Settings */}
      <View style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>Auto-Trigger Settings</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Lost Tracking Detection</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              settings.autoTriggerLostTracking && styles.toggleOn,
            ]}
            onPress={() =>
              toggleSetting(
                'autoTriggerLostTracking',
                !settings.autoTriggerLostTracking,
              )
            }
          >
            <Text style={styles.toggleText}>
              {settings.autoTriggerLostTracking ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Geofence Detection</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              settings.autoTriggerGeofence && styles.toggleOn,
            ]}
            onPress={() =>
              toggleSetting(
                'autoTriggerGeofence',
                !settings.autoTriggerGeofence,
              )
            }
          >
            <Text style={styles.toggleText}>
              {settings.autoTriggerGeofence ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Static Location Detection</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              settings.autoTriggerStaticLocation && styles.toggleOn,
            ]}
            onPress={() =>
              toggleSetting(
                'autoTriggerStaticLocation',
                !settings.autoTriggerStaticLocation,
              )
            }
          >
            <Text style={styles.toggleText}>
              {settings.autoTriggerStaticLocation ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Accident Detection (AI)</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              settings.autoTriggerAccident && styles.toggleOn,
            ]}
            onPress={() =>
              toggleSetting(
                'autoTriggerAccident',
                !settings.autoTriggerAccident,
              )
            }
          >
            <Text style={styles.toggleText}>
              {settings.autoTriggerAccident ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Notify Emergency Contact</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              settings.notifyEmergencyContact && styles.toggleOn,
            ]}
            onPress={() =>
              toggleSetting(
                'notifyEmergencyContact',
                !settings.notifyEmergencyContact,
              )
            }
          >
            <Text style={styles.toggleText}>
              {settings.notifyEmergencyContact ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>🛡️ How it Works</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.bold}>Manual:</Text> Press the panic button
          anytime
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.bold}>Lost Tracking:</Text> Alert if location
          stops updating
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.bold}>Geofence:</Text> Alert when entering
          danger zones
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.bold}>Static Location:</Text> Alert if
          stationary for 1+ hour
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.bold}>Accident Detection:</Text> ML-powered
          impact detection
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
  },
  panicButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  panicButtonText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  panicButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  eventsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  eventCard: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  eventType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#c0392b',
    marginBottom: 5,
  },
  eventMessage: {
    fontSize: 12,
    color: '#555',
    marginBottom: 10,
  },
  resolveButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  resolveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  settingsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#ecf0f1',
  },
  toggleOn: {
    backgroundColor: '#27ae60',
  },
  toggleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoContainer: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0277bd',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
  },
  bold: {
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default PanicButtonScreen;
