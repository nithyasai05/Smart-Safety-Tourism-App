import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Slider,
  Typography,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Divider,
  ListItemButton,
  ListItemAvatar,
} from "@mui/material";
import {
  GoogleMap,
  Marker,
  Circle,
  useJsApiLoader,
} from "@react-google-maps/api";
import { io, Socket } from "socket.io-client";

const containerStyle = {
  width: "100%",
  height: "360px",
};

const MapView: React.FC = () => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [radius, setRadius] = useState<number>(200); // meters
  const [geofenceEnabled, setGeofenceEnabled] = useState<boolean>(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const mapRef = useRef<any>(null);
  const geofenceCircleRef = useRef<any>(null);

  // Use the provided API key directly (replace or set via env in production)
  const apiKey =
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    "AIzaSyBIiaSuuixOg2MP0EMyQyr_LIH1zQrbCFU";

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }

    const watcherId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.warn("Geolocation watch error", err);
        setGeoError(err.message || "Unable to retrieve location");
        setPosition(null);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    );

    return () => {
      try {
        navigator.geolocation.clearWatch(watcherId);
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  // Manage geofence circle
  useEffect(() => {
    if (!mapRef.current || !position) return;

    // Remove existing circle if it exists
    if (geofenceCircleRef.current) {
      geofenceCircleRef.current.setMap(null);
      geofenceCircleRef.current = null;
    }

    // Create new circle if geofencing is enabled
    if (geofenceEnabled) {
      geofenceCircleRef.current = new window.google.maps.Circle({
        map: mapRef.current,
        center: position,
        radius: radius,
        fillColor: "#ff0000",
        fillOpacity: 0.12,
        strokeColor: "#ff0000",
        strokeOpacity: 0.6,
      });
    }

    // Cleanup function
    return () => {
      if (geofenceCircleRef.current) {
        geofenceCircleRef.current.setMap(null);
        geofenceCircleRef.current = null;
      }
    };
  }, [geofenceEnabled, position, radius]);

  // Socket.io: connect as admin and receive user location updates
  useEffect(() => {
    const backendUrl =
      process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
    const token = localStorage.getItem("adminToken");

    const socket = io(backendUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (!token) {
        console.warn(
          "No admin token found in localStorage; admin socket will not authenticate",
        );
      }
      socket.emit("authenticate", { token, userType: "admin" });
      // Request current known locations once
      socket.emit("get_user_locations");
      socket.emit("get_online_users");
    });

    socket.on("user_locations", (locations: any[]) => {
      setUserLocations(locations.map((l) => normalizeLocation(l)));
    });

    socket.on("location_update", (loc) => {
      const normalized = normalizeLocation(loc);
      setUserLocations((prev) => {
        const idx = prev.findIndex(
          (u) => String(u.userId) === String(normalized.userId),
        );
        if (idx === -1) return [...prev, normalized];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...normalized };
        return copy;
      });
    });

    socket.on("online_users", (users) => {
      // Merge online users with existing location list, preferring existing locations
      const mapped = users.map((u: any) => ({
        userId: u.userId,
        digitalId: u.digitalId || u.digitalId || u._id || u.userId,
        lastLocation: u.lastLocation || null,
      }));
      setUserLocations((prev) => {
        const byId = new Map(prev.map((p) => [String(p.userId), p]));
        mapped.forEach((m: any) => {
          if (!byId.has(String(m.userId)) && m.lastLocation) {
            byId.set(String(m.userId), normalizeLocation(m.lastLocation));
          }
        });
        return Array.from(byId.values());
      });
    });

    socket.on("disconnect", () => {
      // leave state as-is
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const normalizeLocation = (raw: any) => {
    // raw may contain { userId, digitalId, location: { latitude, longitude }, latitude, longitude, timestamp }
    let lat: number | null = null;
    let lng: number | null = null;
    if (
      raw.location &&
      raw.location.latitude != null &&
      raw.location.longitude != null
    ) {
      lat = Number(raw.location.latitude);
      lng = Number(raw.location.longitude);
    } else if (raw.latitude != null && raw.longitude != null) {
      lat = Number(raw.latitude);
      lng = Number(raw.longitude);
    } else if (raw.lat != null && raw.lng != null) {
      lat = Number(raw.lat);
      lng = Number(raw.lng);
    }

    return {
      userId: raw.userId || raw._id || raw.id,
      digitalId:
        raw.digitalId ||
        raw.digital_id ||
        raw.digital ||
        raw.userId ||
        "unknown",
      lat,
      lng,
      timestamp: raw.timestamp || raw.updatedAt || new Date(),
      raw,
    };
  };

  if (loadError) {
    return <div>Map failed to load</div>;
  }

  return (
    <Box>
      <Box
        sx={{
          mb: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="subtitle1">Device Location</Typography>
          <Typography variant="body2" color="text.secondary">
            {position
              ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`
              : "Fetching location..."}
          </Typography>
        </Box>
        <Box sx={{ width: 280 }}>
          <Typography variant="caption">Geofence radius: {radius} m</Typography>
          <Slider
            value={radius}
            onChange={(_, v) => setRadius(typeof v === "number" ? v : v[0])}
            min={50}
            max={2000}
            step={10}
            aria-label="Geofence radius"
          />
        </Box>
        <Button
          variant="contained"
          color={geofenceEnabled ? "error" : "primary"}
          onClick={() => setGeofenceEnabled(!geofenceEnabled)}
          className="geofence-toggle-btn"
        >
          {geofenceEnabled ? "Disable Geofence" : "Enable Geofence"}
        </Button>
      </Box>

      <Box
        sx={{ border: "1px solid #ddd", borderRadius: 1, overflow: "hidden" }}
      >
        {isLoaded && position ? (
          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={position}
                zoom={15}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
              >
                {/* Admin's own position */}
                <Marker position={position} title="You (admin)" />

                {/* Other users' locations */}
                {userLocations.map((u) =>
                  u.lat != null && u.lng != null ? (
                    <Marker
                      key={String(u.userId) + String(u.timestamp)}
                      position={{ lat: u.lat, lng: u.lng }}
                      title={`${u.digitalId} • ${new Date(u.timestamp).toLocaleString()}`}
                      label={{
                        text: String(u.digitalId),
                        fontSize: "10px",
                        color: "#fff",
                      }}
                      // Slightly different icon color via SVG data URL
                      icon={{
                        url: `data:image/svg+xml;utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1976d2"/></svg>`)}`,
                      }}
                    />
                  ) : null,
                )}

                {/* Geofence circle is managed by useEffect */}
              </GoogleMap>
            </Box>

            <Box sx={{ width: 280, p: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Online Users
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
                {userLocations.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No online users" />
                  </ListItem>
                )}
                {userLocations.map((u) => (
                  <ListItem key={String(u.userId)} disablePadding>
                    <ListItemButton
                      onClick={() => {
                        if (u.lat != null && u.lng != null && mapRef.current) {
                          mapRef.current.panTo({ lat: u.lat, lng: u.lng });
                          try {
                            mapRef.current.setZoom(16);
                          } catch (e) {}
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ width: 30, height: 30, mr: 1 }}>
                          {String(u.digitalId || "").slice(0, 2)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={u.digitalId || u.userId}
                        secondary={
                          u.lat != null
                            ? new Date(u.timestamp).toLocaleString()
                            : "No location"
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            {geoError ? (
              <Box>
                <Typography color="error" sx={{ mb: 1 }}>
                  {geoError}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    setGeoError(null);
                    // Try requesting position once
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) =>
                          setPosition({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                          }),
                        (err) =>
                          setGeoError(
                            err.message || "Unable to retrieve location",
                          ),
                        { enableHighAccuracy: true, timeout: 10000 },
                      );
                    } else {
                      setGeoError("Geolocation not supported");
                    }
                  }}
                >
                  Request Location
                </Button>
              </Box>
            ) : (
              <Typography>Awaiting location permission / GPS fix...</Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MapView;
