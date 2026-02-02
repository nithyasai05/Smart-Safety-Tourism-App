import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  LinearProgress,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  ExitToApp,
  LocationOn,
  Warning,
  Phone,
  Shield,
  Settings,
  MyLocation,
  History,
  Notifications,
  Menu as MenuIcon,
  Close,
  CheckCircle,
  Info,
  NavigationOutlined,
  Speed,
  GpsFixed,
  Map,
  Refresh,
  LocationDisabled,
  NearMe,
  Room,
} from "@mui/icons-material";
import { io, Socket } from "socket.io-client";
import { apiService, User } from "../services/api";
import "./TouristDashboard.css";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
  address?: string;
}

interface AlertHistory {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  status: string;
}

const TouristDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    null,
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [panicActive, setPanicActive] = useState(false);
  const [panicCountdown, setPanicCountdown] = useState(0);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panicDialogOpen, setPanicDialogOpen] = useState(false);
  const [locationPermissionDialog, setLocationPermissionDialog] =
    useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "info" | "warning",
  });
  const [blockchainVerified, setBlockchainVerified] = useState<boolean | null>(
    null,
  );
  const [verifyingBlockchain, setVerifyingBlockchain] = useState(false);
  const [availableGuides, setAvailableGuides] = useState<User[]>([]);
  const [assignedGuide, setAssignedGuide] = useState<User | null>(null);
  const [guidesDialogOpen, setGuidesDialogOpen] = useState(false);
  const [assigningGuide, setAssigningGuide] = useState(false);
  const [settings, setSettings] = useState({
    autoShareLocation: true,
    notifyEmergencyContact: true,
    soundAlerts: true,
    showMapAlways: true,
  });

  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
    // Load user data immediately, regardless of location permission
    loadUserData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize location-dependent features after location is granted
  useEffect(() => {
    if (locationGranted) {
      initializeSocket();
      startLocationTracking();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [locationGranted]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkLocationPermission = async () => {
    try {
      if ("permissions" in navigator) {
        // Add timeout to prevent hanging
        const permissionPromise = navigator.permissions.query({
          name: "geolocation",
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Permission query timeout")), 5000),
        );

        const permission = await Promise.race([
          permissionPromise,
          timeoutPromise,
        ]);

        if (permission.state === "granted") {
          setLocationGranted(true);
          setLoading(false);
        } else if (permission.state === "denied") {
          setLocationError(
            "Location permission denied. Please enable it in your browser settings.",
          );
          setLocationPermissionDialog(true);
          setLoading(false);
        } else {
          setLocationPermissionDialog(true);
          setLoading(false);
        }

        permission.addEventListener("change", () => {
          if (permission.state === "granted") {
            setLocationGranted(true);
            setLocationPermissionDialog(false);
          }
        });
      } else {
        setLocationPermissionDialog(true);
        setLoading(false);
      }
    } catch (error) {
      console.warn("Location permission check failed:", error);
      setLocationPermissionDialog(true);
      setLoading(false);
    }
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setSnackbar({
        open: true,
        message: "Your browser doesn't support location services",
        severity: "error",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };
        setCurrentLocation(newLocation);
        setLocationGranted(true);
        setLocationPermissionDialog(false);
        setLocationError(null);
        setSnackbar({
          open: true,
          message: "Location access granted! You're now protected.",
          severity: "success",
        });
      },
      (error) => {
        let errorMessage = "Unable to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location permission denied. Please enable it in browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setLocationError(errorMessage);
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: "error",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const loadUserData = async () => {
    try {
      const storedUser = localStorage.getItem("touristUser");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      }

      const response = await apiService.getProfile();
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem("touristUser", JSON.stringify(response.user));
        // Reset assigned guide state
        setAssignedGuide(null);
        // Load guides after user data is loaded, passing the user data directly
        loadAvailableGuides(response.user);
      } else {
        console.error("❌ Failed to load user profile:", response);
      }
    } catch (error: any) {
      console.error("Error loading user data:", error);
      // Don't redirect on API errors - ProtectedRoute already handles auth
      // Just continue with stored user data
    } finally {
      // Always turn off loading, regardless of success/failure
      setLoading(false);
    }
  };

  const loadAvailableGuides = async (userData?: User) => {
    const currentUser = userData || user;
    try {
      const response = await apiService.getAvailableGuides();
      if (response.success && response.guides) {
        setAvailableGuides(response.guides);
        // Check if user already has an assigned guide

        if (currentUser?.assignedGuide) {
          const guide = response.guides.find(
            (g) => String(g.id || g._id) === String(currentUser.assignedGuide),
          );

          response.guides.forEach((g) => {
            console.log(
              `  Guide ${g.name}: id=${g.id} (type: ${typeof g.id}), _id=${g._id} (type: ${typeof g._id}), assignedGuide=${currentUser.assignedGuide} (type: ${typeof currentUser.assignedGuide}), match=${String(g.id || g._id) === String(currentUser.assignedGuide)}`,
            );
          });

          if (guide) {
            setAssignedGuide(guide);
          } else {
            setAssignedGuide(null);
          }
        } else {
          setAssignedGuide(null);
        }
      } else {
        console.error("❌ Failed to load guides:", response);
      }
    } catch (error: any) {
      // Handle API errors gracefully - don't redirect for guides API failures
      console.error("Failed to load available guides:", error);
      // Set empty guides list so the UI can still function
      setAvailableGuides([]);
      setAssignedGuide(null);
    }
  };

  const assignGuideToTourist = async (guideId: string) => {
    setAssigningGuide(true);
    try {
      const response = await apiService.assignGuide(guideId);
      if (response.success) {
        const guide = availableGuides.find(
          (g) => String(g.id || g._id) === String(guideId),
        );

        if (guide) {
          setAssignedGuide(guide);
          const updatedUser = user ? { ...user, assignedGuide: guideId } : null;

          setUser(updatedUser);
          localStorage.setItem(
            "touristUser",
            JSON.stringify({ ...user, assignedGuide: guideId }),
          );
        }
        setGuidesDialogOpen(false);
        setSnackbar({
          open: true,
          message: `Guide ${response.guide?.name || "assigned"} successfully!`,
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: response.message || "Failed to assign guide",
          severity: "error",
        });
      }
    } catch (error: any) {
      // Handle authentication errors
      if (error.response?.status === 401) {
        // Token is invalid or expired, redirect to login
        navigate("/login");
        return;
      }
      console.error("Error assigning guide:", error);
      setSnackbar({
        open: true,
        message: "Failed to assign guide",
        severity: "error",
      });
    } finally {
      setAssigningGuide(false);
    }
  };

  const verifyBlockchainId = async () => {
    if (!user?.blockchainTokenId) {
      setSnackbar({
        open: true,
        message: "No blockchain token ID found for verification",
        severity: "warning",
      });
      return;
    }

    setVerifyingBlockchain(true);
    try {
      const response = await apiService.verifyTouristId(user.blockchainTokenId);
      if (response.success) {
        setBlockchainVerified(response.verified ?? null);
        setSnackbar({
          open: true,
          message: response.verified
            ? "Tourist ID verified on blockchain! ✅"
            : "Tourist ID verification failed on blockchain",
          severity: response.verified ? "success" : "error",
        });
      } else {
        setBlockchainVerified(false);
        setSnackbar({
          open: true,
          message: response.message || "Blockchain verification failed",
          severity: "error",
        });
      }
    } catch (error: any) {
      // Handle authentication errors
      if (error.response?.status === 401) {
        // Token is invalid or expired, redirect to login
        navigate("/login");
        return;
      }
      console.error("Blockchain verification error:", error);
      setBlockchainVerified(false);
      setSnackbar({
        open: true,
        message: "Error verifying Tourist ID on blockchain",
        severity: "error",
      });
    } finally {
      setVerifyingBlockchain(false);
    }
  };

  const initializeSocket = () => {
    const backendUrl =
      process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
    const token = localStorage.getItem("touristToken");

    const socket = io(backendUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("authenticate", { token, userType: "tourist" });
      setSocketConnected(true);
      setSnackbar({
        open: true,
        message: "Connected to safety network",
        severity: "success",
      });
    });

    socket.on("alert_received", (alert: any) => {
      setAlertHistory((prev) => [
        {
          id: alert.alertId || Date.now().toString(),
          type: alert.type,
          message: alert.message,
          timestamp: alert.timestamp || new Date().toISOString(),
          status: alert.status || "active",
        },
        ...prev,
      ]);
    });

    socket.on("panic_resolved", () => {
      setPanicActive(false);
      setSnackbar({
        open: true,
        message: "Your emergency has been acknowledged by authorities",
        severity: "info",
      });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setSnackbar({
        open: true,
        message: "Connection lost. Reconnecting...",
        severity: "warning",
      });
    });

    socket.on("reconnect", () => {
      setSocketConnected(true);
    });
  };

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };
        setCurrentLocation(newLocation);
        setLocationError(null);

        if (socketRef.current?.connected && settings.autoShareLocation) {
          socketRef.current.emit("location_update", newLocation);
        } else if (!settings.autoShareLocation) {
          console.log("🔇 Auto-share location disabled");
        } else {
          console.log("⚠️ Socket not connected, location not shared");
        }
      },
      (error) => {
        console.error("❌ Location tracking error:", error);
        setLocationError(error.message);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  }, [settings.autoShareLocation]);

  const refreshLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
          setCurrentLocation(newLocation);
          setSnackbar({
            open: true,
            message: "Location updated",
            severity: "success",
          });
        },
        () => {
          setSnackbar({
            open: true,
            message: "Failed to update location",
            severity: "error",
          });
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
  };

  const handlePanicButton = () => {
    console.log("🚨 Panic button pressed - starting countdown");
    setPanicDialogOpen(true);
    setPanicCountdown(5);

    countdownRef.current = setInterval(() => {
      setPanicCountdown((prev) => {
        console.log(`⏰ Panic countdown: ${prev}`);
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          triggerPanicAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelPanic = () => {
    console.log("❌ Panic cancelled");
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    setPanicDialogOpen(false);
    setPanicCountdown(0);
  };

  const triggerPanicAlert = async () => {
    console.log("🚨🚨 TRIGGERING PANIC ALERT 🚨🚨");
    setPanicDialogOpen(false);
    setPanicActive(true);

    const panicData = {
      type: "manual_panic",
      location: currentLocation,
      message: "Emergency panic button activated",
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userName: user?.name,
      userPhone: user?.phone,
    };

    console.log("📡 Sending panic via socket:", panicData);
    if (socketRef.current?.connected) {
      socketRef.current.emit("panic_trigger", panicData);
    } else {
      console.warn("⚠️ Socket not connected, panic alert may not be sent");
    }

    try {
      console.log("🌐 Sending panic via API...");
      const response = await apiService.triggerPanic({
        latitude: currentLocation?.latitude || 0,
        longitude: currentLocation?.longitude || 0,
        message: "Emergency panic button activated",
      });
      console.log("✅ Panic API response:", response);
    } catch (error) {
      console.error("❌ Failed to send panic via API:", error);
    }

    setSnackbar({
      open: true,
      message: "🚨 Emergency alert sent! Help is on the way.",
      severity: "error",
    });

    setAlertHistory((prev) => [
      {
        id: Date.now().toString(),
        type: "manual_panic",
        message: "Emergency panic button activated",
        timestamp: new Date().toISOString(),
        status: "active",
      },
      ...prev,
    ]);
  };

  const cancelActiveAlert = () => {
    setPanicActive(false);
    if (socketRef.current?.connected) {
      socketRef.current.emit("panic_cancel", {
        message: "User cancelled the emergency",
        timestamp: new Date().toISOString(),
        userId: user?.id,
      });
    }

    setSnackbar({
      open: true,
      message: "Emergency alert cancelled",
      severity: "info",
    });

    setAlertHistory((prev) =>
      prev.map((alert, index) =>
        index === 0 && alert.status === "active"
          ? { ...alert, status: "cancelled" }
          : alert,
      ),
    );
  };

  const callEmergency = (number: string) => {
    window.location.href = `tel:${number}`;
    setSnackbar({
      open: true,
      message: `Calling ${number}...`,
      severity: "info",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("touristToken");
    localStorage.removeItem("touristUser");
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    console.log("🔄 Navigating to login page");
    navigate("/login");
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getGoogleMapsLink = () => {
    if (!currentLocation) return "#";
    const { latitude, longitude } = currentLocation;
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };

  // Location Permission Dialog
  if (locationPermissionDialog && !locationGranted) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          p: 2,
        }}
      >
        <Card
          sx={{
            maxWidth: 400,
            width: "100%",
            borderRadius: 4,
            textAlign: "center",
            p: { xs: 2, sm: 3 },
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <GpsFixed sx={{ fontSize: 40, color: "white" }} />
          </Box>

          <Typography variant="h5" fontWeight={700} gutterBottom>
            Enable Location
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            To keep you safe, we need access to your location:
          </Typography>

          <Box sx={{ textAlign: "left", mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <CheckCircle color="success" sx={{ mr: 1.5, fontSize: 20 }} />
              <Typography variant="body2">
                Track your location in real-time
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <CheckCircle color="success" sx={{ mr: 1.5, fontSize: 20 }} />
              <Typography variant="body2">
                Send help to your exact location
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <CheckCircle color="success" sx={{ mr: 1.5, fontSize: 20 }} />
              <Typography variant="body2">
                Show nearby safe zones on map
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CheckCircle color="success" sx={{ mr: 1.5, fontSize: 20 }} />
              <Typography variant="body2">
                Alert authorities within 500m radius
              </Typography>
            </Box>
          </Box>

          {locationError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {locationError}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<MyLocation />}
            onClick={requestLocationPermission}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
              },
            }}
          >
            Allow Location Access
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: "block" }}
          >
            Your location is only shared with emergency services when needed
          </Typography>
        </Card>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 3,
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(20px)",
            borderRadius: 4,
            border: "1px solid rgba(255, 255, 255, 0.3)",
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <CircularProgress
            sx={{
              color: "#64748b",
              width: "48px !important",
              height: "48px !important",
            }}
            size={48}
          />
          <Typography
            variant="body1"
            sx={{
              color: "#374151",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Initializing safety system...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="tourist-dashboard">
      <AppBar position="fixed" elevation={0} className="tourist-appbar">
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1, color: "#fbfcfd" }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            <Shield
              sx={{ mr: 1, fontSize: { xs: 20, sm: 24 }, color: "#fbfcfd" }}
            />
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "0.9rem", sm: "1.25rem" },
                fontWeight: 600,
                color: "#0284c7",
              }}
            >
              Tourist Safety
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton
              color="inherit"
              onClick={refreshLocation}
              size="small"
              sx={{ color: "#fbfcfd" }}
            >
              <Refresh sx={{ fontSize: { xs: 18, sm: 22 } }} />
            </IconButton>

            <Badge
              color={isTracking ? "info" : "default"}
              variant="dot"
              sx={{
                "& .MuiBadge-badge": {
                  width: 8,
                  height: 8,
                  backgroundColor: isTracking ? "#0ea5e9" : "#94a3b8",
                },
              }}
            >
              <MyLocation
                sx={{ fontSize: { xs: 18, sm: 22 }, color: "#fbfcfd" }}
              />
            </Badge>

            <IconButton
              color="inherit"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              size="small"
              sx={{ color: "#fbfcfd" }}
            >
              <Avatar
                sx={{
                  width: { xs: 28, sm: 36 },
                  height: { xs: 28, sm: 36 },
                  background: "rgba(255,255,255,0.3)",
                  border: "1px solid rgba(255,255,255,0.4)",
                  fontSize: { xs: "0.8rem", sm: "1rem" },
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                {user?.name?.charAt(0) || "T"}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>

        {panicActive && (
          <LinearProgress
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "rgba(220, 38, 38, 0.2)",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#dc2626",
              },
            }}
          />
        )}
      </AppBar>

      <Box
        className="tourist-content"
        sx={{
          pt: { xs: 8, sm: 9 },
          pb: { xs: 14, sm: 12 },
          background: "transparent",
          minHeight: "100vh",
        }}
      >
        {/* Welcome Card */}
        <Card
          className="welcome-card"
          sx={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 249, 255, 0.9))",
            backdropFilter: "blur(15px)",
            border: "1px solid rgba(14, 165, 233, 0.2)",
            boxShadow: "0 12px 40px rgba(14, 165, 233, 0.12)",
            mb: 2,
            mt: 1,
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: { xs: 0.5, sm: 1, md: 2 } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
                flexWrap: { xs: "nowrap", sm: "nowrap" },
                gap: { xs: 0, md: 2 },
              }}
            >
              <Avatar
                sx={{
                  width: { xs: 48, sm: 56, md: 64 },
                  height: { xs: 48, sm: 56, md: 64 },
                  background:
                    "linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(56, 189, 248, 0.1))",
                  border: "2px solid rgba(14, 165, 233, 0.3)",
                  mr: 2,
                  flexShrink: 0,
                  fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
                  color: "#0ea5e9",
                  fontWeight: 700,
                }}
              >
                {user?.name?.charAt(0) || "T"}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "#1f2937",
                  }}
                >
                  Hello, {user?.name?.split(" ")[0] || "Tourist"}!
                </Typography>
                <Chip
                  size="small"
                  icon={<CheckCircle sx={{ fontSize: 12 }} />}
                  label={`ID: ${user?.digitalId || "N/A"}`}
                  sx={{
                    height: 22,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    background: "rgba(14, 165, 233, 0.1)",
                    color: "#0ea5e9",
                    border: "1px solid rgba(14, 165, 233, 0.2)",
                    mt: 0.5,
                  }}
                />
                {/* Blockchain Verification */}
                {user?.blockchainTokenId && (
                  <Box
                    sx={{
                      mt: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={verifyBlockchainId}
                      disabled={verifyingBlockchain}
                      sx={{
                        minHeight: 24,
                        fontSize: "0.7rem",
                        borderColor:
                          blockchainVerified === true
                            ? "#0ea5e9"
                            : blockchainVerified === false
                              ? "#dc2626"
                              : "#64748b",
                        color:
                          blockchainVerified === true
                            ? "#0ea5e9"
                            : blockchainVerified === false
                              ? "#dc2626"
                              : "#64748b",
                        "&:hover": {
                          borderColor:
                            blockchainVerified === true
                              ? "#0ea5e9"
                              : blockchainVerified === false
                                ? "#dc2626"
                                : "#64748b",
                          backgroundColor:
                            blockchainVerified === true
                              ? "rgba(14, 165, 233, 0.1)"
                              : blockchainVerified === false
                                ? "rgba(220, 38, 38, 0.1)"
                                : "rgba(100, 116, 139, 0.1)",
                        },
                      }}
                    >
                      {verifyingBlockchain ? (
                        <CircularProgress size={12} sx={{ mr: 0.5 }} />
                      ) : blockchainVerified === true ? (
                        <CheckCircle sx={{ fontSize: 12, mr: 0.5 }} />
                      ) : blockchainVerified === false ? (
                        <Warning sx={{ fontSize: 12, mr: 0.5 }} />
                      ) : (
                        <Info sx={{ fontSize: 12, mr: 0.5 }} />
                      )}
                      {verifyingBlockchain
                        ? "Verifying..."
                        : blockchainVerified === true
                          ? "Verified"
                          : blockchainVerified === false
                            ? "Failed"
                            : "Verify ID"}
                    </Button>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: "0.65rem", color: "#64748b" }}
                    >
                      Token #{user.blockchainTokenId}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {panicActive ? (
              <Alert
                severity="error"
                icon={<Warning sx={{ fontSize: 20, color: "#dc2626" }} />}
                action={
                  <Button
                    sx={{
                      color: "#dc2626",
                      fontWeight: 600,
                      "&:hover": { backgroundColor: "rgba(220, 38, 38, 0.1)" },
                    }}
                    size="small"
                    onClick={cancelActiveAlert}
                  >
                    Cancel
                  </Button>
                }
                sx={{
                  borderRadius: 3,
                  py: 1,
                  background: "rgba(220, 38, 38, 0.1)",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  color: "#1f2937",
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ fontSize: "0.85rem", color: "#dc2626" }}
                >
                  Emergency Alert Active
                </Typography>
              </Alert>
            ) : (
              <Alert
                severity="info"
                icon={<Shield sx={{ fontSize: 20, color: "#0ea5e9" }} />}
                sx={{
                  borderRadius: 3,
                  py: 1,
                  background: "rgba(14, 165, 233, 0.1)",
                  border: "1px solid rgba(14, 165, 233, 0.2)",
                  color: "#1f2937",
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ fontSize: "0.85rem", color: "#0ea5e9" }}
                >
                  You're protected by Tourist Safety System
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Live Map Card - 500m Radius */}
        <Card
          className="map-card"
          sx={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(15px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.08)",
            mb: 2,
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Map sx={{ mr: 0.5, fontSize: 18, color: "primary.main" }} />
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                >
                  Your Location (500m Radius)
                </Typography>
              </Box>
              <Box sx={{ display: "flex" }}>
                <IconButton size="small" onClick={refreshLocation}>
                  <Refresh sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  size="small"
                  component="a"
                  href={getGoogleMapsLink()}
                  target="_blank"
                >
                  <NearMe sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>

            <Box
              className="map-container"
              sx={{
                width: "100%",
                height: { xs: 300, sm: 350, md: 400 },
                borderRadius: 2,
                overflow: "hidden",
                position: "relative",
                background: "#e2e8f0",
              }}
            >
              {currentLocation ? (
                <>
                  <iframe
                    title="Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    style={{ border: 0 }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentLocation.longitude - 0.005},${currentLocation.latitude - 0.005},${currentLocation.longitude + 0.005},${currentLocation.latitude + 0.005}&layer=mapnik&marker=${currentLocation.latitude},${currentLocation.longitude}`}
                  />

                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      right: 8,
                      background: "rgba(255,255,255,0.95)",
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Room color="error" sx={{ fontSize: 16 }} />
                      <Typography
                        variant="caption"
                        fontWeight={500}
                        sx={{ fontSize: "0.7rem" }}
                      >
                        {currentLocation.latitude.toFixed(5)},{" "}
                        {currentLocation.longitude.toFixed(5)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={`±${currentLocation.accuracy?.toFixed(0) || 0}m`}
                      color="primary"
                      sx={{ height: 18, fontSize: "0.6rem" }}
                    />
                  </Box>

                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(102, 126, 234, 0.9)",
                      color: "white",
                      borderRadius: 1,
                      p: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{ fontSize: "0.65rem" }}
                    >
                      500m RADIUS
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.secondary",
                  }}
                >
                  <LocationDisabled
                    sx={{ fontSize: 40, mb: 1, opacity: 0.5 }}
                  />
                  <Typography variant="body2">Acquiring location...</Typography>
                  <CircularProgress size={20} sx={{ mt: 1 }} />
                </Box>
              )}
            </Box>

            <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<NearMe sx={{ fontSize: 14 }} />}
                component="a"
                href={getGoogleMapsLink()}
                target="_blank"
                fullWidth
                sx={{ fontSize: "0.7rem", py: 0.5, textTransform: "none" }}
              >
                Open in Maps
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Refresh sx={{ fontSize: 14 }} />}
                onClick={refreshLocation}
                fullWidth
                sx={{ fontSize: "0.7rem", py: 0.5, textTransform: "none" }}
              >
                Refresh
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Status Cards */}
        <Box
          className="status-grid"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          <Card
            className="status-card"
            sx={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(15px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent sx={{ p: { xs: 0.5, sm: 1 } }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <LocationOn
                  sx={{
                    fontSize: { xs: 18, sm: 20 },
                    color: currentLocation ? "#0ea5e9" : "#94a3b8",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    ml: 0.5,
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    color: "#fbfcfd",
                    fontWeight: 600,
                  }}
                >
                  GPS
                </Typography>
              </Box>
              <Chip
                size="small"
                label={currentLocation ? "Active" : "Off"}
                sx={{
                  fontWeight: 700,
                  height: 22,
                  fontSize: "0.7rem",
                  background: currentLocation
                    ? "rgba(14, 165, 233, 0.1)"
                    : "rgba(148, 163, 184, 0.1)",
                  color: currentLocation ? "#0ea5e9" : "#64748b",
                  border: `1px solid ${currentLocation ? "rgba(14, 165, 233, 0.2)" : "rgba(148, 163, 184, 0.2)"}`,
                }}
              />
            </CardContent>
          </Card>

          <Card
            className="status-card"
            sx={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(15px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent sx={{ p: { xs: 0.5, sm: 1 } }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <NavigationOutlined
                  sx={{
                    fontSize: { xs: 18, sm: 20 },
                    color: isTracking ? "#0ea5e9" : "#94a3b8",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    ml: 0.5,
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  Track
                </Typography>
              </Box>
              <Chip
                size="small"
                label={isTracking ? "On" : "Off"}
                sx={{
                  fontWeight: 700,
                  height: 22,
                  fontSize: "0.7rem",
                  background: isTracking
                    ? "rgba(14, 165, 233, 0.1)"
                    : "rgba(148, 163, 184, 0.1)",
                  color: isTracking ? "#0ea5e9" : "#64748b",
                  border: `1px solid ${isTracking ? "rgba(14, 165, 233, 0.2)" : "rgba(148, 163, 184, 0.2)"}`,
                }}
              />
            </CardContent>
          </Card>

          <Card
            className="status-card"
            sx={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(15px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent sx={{ p: { xs: 0.5, sm: 1 } }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <Speed
                  sx={{
                    fontSize: { xs: 18, sm: 20 },
                    color: socketConnected ? "#0ea5e9" : "#dc2626",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    ml: 0.5,
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  Net
                </Typography>
              </Box>
              <Chip
                size="small"
                label={socketConnected ? "Online" : "Offline"}
                sx={{
                  fontWeight: 700,
                  height: 22,
                  fontSize: "0.7rem",
                  background: socketConnected
                    ? "rgba(14, 165, 233, 0.1)"
                    : "rgba(220, 38, 38, 0.1)",
                  color: socketConnected ? "#0ea5e9" : "#dc2626",
                  border: `1px solid ${socketConnected ? "rgba(14, 165, 233, 0.2)" : "rgba(220, 38, 38, 0.2)"}`,
                }}
              />
            </CardContent>
          </Card>
        </Box>

        {/* Available Guides */}
        <Card
          className="contact-card"
          sx={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(15px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.08)",
            mb: 2,
          }}
        >
          <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 2,
                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                color: "#0ea5e9",
              }}
            >
              <Shield sx={{ mr: 0.75, fontSize: 20 }} />
              Your Admin Guide
            </Typography>
            {assignedGuide ? (
              <Box
                sx={{
                  background:
                    "linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(56, 189, 248, 0.08))",
                  borderRadius: 3,
                  p: 2,
                  color: "white",
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid rgba(14, 165, 233, 0.3)",
                  backdropFilter: "blur(10px)",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 80,
                    height: 80,
                    background:
                      "radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)",
                    borderRadius: "50%",
                    transform: "translate(30px, -30px)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 1.5,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      background: "rgba(255,255,255,0.2)",
                      border: "2px solid rgba(255,255,255,0.4)",
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      color: "#0ea5e9",
                    }}
                  >
                    {assignedGuide.name?.charAt(0) || "G"}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      fontWeight={800}
                      sx={{ fontSize: "1.1rem", mb: 0.5, color: "#1f2937" }}
                    >
                      {assignedGuide.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.85rem",
                        opacity: 0.9,
                        color: "#0ea5e9",
                        fontWeight: 600,
                      }}
                    >
                      Safety Admin Guide
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 0.5,
                    }}
                  >
                    <Chip
                      size="small"
                      label="✓ ASSIGNED"
                      sx={{
                        height: 24,
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        background: "rgba(255,255,255,0.2)",
                        color: "#0ea5e9",
                        border: "1px solid rgba(255,255,255,0.3)",
                        letterSpacing: "0.5px",
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.65rem",
                        opacity: 0.8,
                        color: "#0ea5e9",
                        fontWeight: 600,
                      }}
                    >
                      24/7 Support
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Phone
                      sx={{ fontSize: 16, opacity: 0.9, color: "#0ea5e9" }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.75rem",
                        color: "#374151",
                        fontWeight: 500,
                      }}
                    >
                      {assignedGuide.phone || "Contact Available"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Shield
                      sx={{ fontSize: 16, opacity: 0.9, color: "#0ea5e9" }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.75rem",
                        color: "#0ea5e9",
                        fontWeight: 600,
                      }}
                    >
                      Emergency Ready
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Button
                variant="outlined"
                startIcon={<Shield sx={{ color: "#0ea5e9" }} />}
                fullWidth
                onClick={() => setGuidesDialogOpen(true)}
                sx={{
                  justifyContent: "flex-start",
                  py: 2,
                  textTransform: "none",
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  borderColor: "rgba(14, 165, 233, 0.3)",
                  color: "#0ea5e9",
                  fontWeight: 600,
                  background: "rgba(14, 165, 233, 0.05)",
                  borderRadius: 3,
                  "&:hover": {
                    backgroundColor: "rgba(14, 165, 233, 0.1)",
                    borderColor: "rgba(14, 165, 233, 0.5)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(14, 165, 233, 0.2)",
                  },
                }}
              >
                Select a Guide
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card
          className="contact-card"
          sx={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(15px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.08)",
            mb: 2,
          }}
        >
          <CardContent sx={{ p: { xs: 0.5, sm: 1 } }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 2,
                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                color: "#dc2626",
              }}
            >
              <Phone sx={{ mr: 0.75, fontSize: 20 }} />
              Emergency Contacts
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Button
                variant="contained"
                startIcon={<Phone sx={{ color: "#dc2626" }} />}
                fullWidth
                onClick={() => callEmergency("100")}
                sx={{
                  justifyContent: "flex-start",
                  py: 1.5,
                  textTransform: "none",
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  fontWeight: 600,
                  color: "#dc2626",
                  background:
                    "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  borderRadius: 3,
                  boxShadow: "0 4px 15px rgba(220, 38, 38, 0.3)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(220, 38, 38, 0.4)",
                  },
                }}
              >
                Police Emergency: 100
              </Button>
              <Button
                variant="outlined"
                startIcon={<Phone sx={{ color: "#dc2626" }} />}
                fullWidth
                onClick={() => callEmergency("112")}
                sx={{
                  justifyContent: "flex-start",
                  py: 1.5,
                  textTransform: "none",
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  fontWeight: 600,
                  borderColor: "rgba(220, 38, 38, 0.3)",
                  color: "#dc2626",
                  background: "rgba(220, 38, 38, 0.05)",
                  borderRadius: 3,
                  "&:hover": {
                    backgroundColor: "rgba(220, 38, 38, 0.1)",
                    borderColor: "rgba(220, 38, 38, 0.5)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(220, 38, 38, 0.2)",
                  },
                }}
              >
                Tourist Helpline: 112
              </Button>
              <Button
                variant="outlined"
                startIcon={<Phone sx={{ color: "#dc2626" }} />}
                fullWidth
                onClick={() => callEmergency("108")}
                sx={{
                  justifyContent: "flex-start",
                  py: 1.5,
                  textTransform: "none",
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  fontWeight: 600,
                  borderColor: "rgba(220, 38, 38, 0.3)",
                  color: "#dc2626",
                  background: "rgba(220, 38, 38, 0.05)",
                  borderRadius: 3,
                  "&:hover": {
                    backgroundColor: "rgba(220, 38, 38, 0.1)",
                    borderColor: "rgba(220, 38, 38, 0.5)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(220, 38, 38, 0.2)",
                  },
                }}
              >
                Ambulance: 108
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card
          className="activity-card"
          sx={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(15px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.08)",
            mb: 2,
          }}
        >
          <CardContent sx={{ p: { xs: 0.5, sm: 1 } }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 2,
                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                color: "#64748b",
              }}
            >
              <History sx={{ mr: 0.75, fontSize: 20 }} />
              Recent Activity
            </Typography>
            {alertHistory.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 3, color: "#94a3b8" }}>
                <Info
                  sx={{ fontSize: 40, mb: 1, opacity: 0.6, color: "#cbd5e1" }}
                />
                <Typography
                  variant="body2"
                  sx={{ fontSize: "0.9rem", fontWeight: 500 }}
                >
                  No recent activity
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {alertHistory.slice(0, 5).map((alert) => (
                  <Box
                    key={alert.id}
                    className={`activity-item ${alert.status}`}
                    sx={{ p: 1, borderRadius: 2 }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                    >
                      {alert.type === "manual_panic" ? (
                        <Warning sx={{ fontSize: 18, color: "#dc2626" }} />
                      ) : (
                        <Info sx={{ fontSize: 18, color: "#0ea5e9" }} />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          flex: 1,
                          fontSize: { xs: "0.8rem", sm: "0.85rem" },
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "#374151",
                          fontWeight: 500,
                        }}
                      >
                        {alert.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          fontWeight: 600,
                          background: "rgba(148, 163, 184, 0.1)",
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                        }}
                      >
                        {formatTime(alert.timestamp)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Floating Panic Button */}
      <Fab
        color="error"
        className={`panic-fab ${panicActive ? "active" : ""}`}
        onClick={panicActive ? cancelActiveAlert : handlePanicButton}
        sx={{
          position: "fixed",
          bottom: { xs: 20, sm: 28 },
          left: "50%",
          transform: "translateX(-50%)",
          width: { xs: 64, sm: 72 },
          height: { xs: 64, sm: 72 },
          zIndex: 1000,
        }}
      >
        {panicActive ? (
          <Close sx={{ fontSize: { xs: 28, sm: 32 } }} />
        ) : (
          <Warning sx={{ fontSize: { xs: 28, sm: 32 } }} />
        )}
      </Fab>
      <Typography
        className="panic-label"
        sx={{
          position: "fixed",
          bottom: { xs: 2, sm: 6 },
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: { xs: "0.6rem", sm: "0.7rem" },
          fontWeight: 800,
          color: panicActive ? "#dc2626" : "#ff6b35",
          textAlign: "center",
          letterSpacing: 1,
          textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
        }}
      >
        {panicActive ? "TAP TO CANCEL" : "EMERGENCY"}
      </Typography>

      {/* Side Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: 280, sm: 320 },
            borderRadius: "0 24px 24px 0",
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <Box
          sx={{
            p: 3,
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                background: "rgba(100, 116, 139, 0.2)",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                mr: 2,
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#374151",
              }}
            >
              {user?.name?.charAt(0) || "T"}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                noWrap
                sx={{ color: "#1f2937", fontSize: "1.1rem" }}
              >
                {user?.name || "Tourist"}
              </Typography>
              <Typography
                variant="caption"
                sx={{ opacity: 0.8, color: "#64748b", fontWeight: 500 }}
                noWrap
              >
                {user?.email}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.2)" }} />
        <List dense sx={{ p: 1 }}>
          <ListItemButton
            onClick={() => {
              setDrawerOpen(false);
              setSettingsOpen(true);
            }}
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              "&:hover": {
                background: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#64748b" }}>
              <Settings />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              primaryTypographyProps={{
                fontWeight: 600,
                color: "#374151",
              }}
            />
          </ListItemButton>
          <ListItemButton
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              "&:hover": {
                background: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#64748b" }}>
              <Notifications />
            </ListItemIcon>
            <ListItemText
              primary="Notifications"
              primaryTypographyProps={{
                fontWeight: 600,
                color: "#374151",
              }}
            />
          </ListItemButton>
          <ListItemButton
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              "&:hover": {
                background: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#64748b" }}>
              <History />
            </ListItemIcon>
            <ListItemText
              primary="Alert History"
              primaryTypographyProps={{
                fontWeight: 600,
                color: "#374151",
              }}
            />
          </ListItemButton>
          <ListItemButton
            component="a"
            href={getGoogleMapsLink()}
            target="_blank"
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              "&:hover": {
                background: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#64748b" }}>
              <Map />
            </ListItemIcon>
            <ListItemText
              primary="Full Map View"
              primaryTypographyProps={{
                fontWeight: 600,
                color: "#374151",
              }}
            />
          </ListItemButton>
        </List>
        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.2)" }} />
        <List dense sx={{ p: 1 }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              mx: 1,
              "&:hover": {
                background: "rgba(220, 38, 38, 0.1)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#dc2626" }}>
              <ExitToApp />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{
                fontWeight: 600,
                color: "#dc2626",
              }}
            />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 180,
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ color: "#1f2937" }}
          >
            {user?.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "#64748b", fontWeight: 500 }}
          >
            {user?.email}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.2)" }} />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setSettingsOpen(true);
          }}
          sx={{
            py: 1.5,
            "&:hover": {
              background: "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          <Settings sx={{ mr: 1.5, fontSize: 20, color: "#64748b" }} />
          <Typography fontWeight={600} sx={{ color: "#374151" }}>
            Settings
          </Typography>
        </MenuItem>
        <MenuItem
          onClick={handleLogout}
          sx={{
            py: 1.5,
            "&:hover": {
              background: "rgba(220, 38, 38, 0.1)",
            },
          }}
        >
          <ExitToApp sx={{ mr: 1.5, fontSize: 20, color: "#dc2626" }} />
          <Typography fontWeight={600} sx={{ color: "#dc2626" }}>
            Logout
          </Typography>
        </MenuItem>
      </Menu>

      {/* Panic Countdown Dialog */}
      <Dialog
        open={panicDialogOpen}
        onClose={cancelPanic}
        PaperProps={{
          sx: {
            borderRadius: 4,
            textAlign: "center",
            p: { xs: 2, sm: 3 },
            minWidth: { xs: 280, sm: 320 },
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Warning sx={{ fontSize: 48, mb: 1.5, color: "#ff6b35" }} />
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ color: "#1f2937", fontSize: "1.3rem" }}
          >
            Emergency Alert
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            sx={{
              mb: 3,
              color: "#64748b",
              fontWeight: 500,
              fontSize: "0.9rem",
            }}
          >
            Sending alert in
          </Typography>
          <Box
            sx={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ff6b35 0%, #f97316 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
              boxShadow: "0 4px 20px rgba(255, 107, 53, 0.4)",
            }}
          >
            <Typography variant="h3" sx={{ color: "white", fontWeight: 900 }}>
              {panicCountdown}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ color: "#64748b", fontWeight: 600 }}
          >
            Tap cancel to stop
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2, gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={cancelPanic}
            size="small"
            sx={{
              minWidth: 100,
              py: 1,
              borderColor: "rgba(100, 116, 139, 0.3)",
              color: "#64748b",
              fontWeight: 600,
              borderRadius: 2,
              "&:hover": {
                backgroundColor: "rgba(100, 116, 139, 0.1)",
                borderColor: "rgba(100, 116, 139, 0.5)",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (countdownRef.current) clearInterval(countdownRef.current);
              triggerPanicAlert();
            }}
            size="small"
            sx={{
              minWidth: 100,
              py: 1,
              background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
              fontWeight: 700,
              borderRadius: 2,
              boxShadow: "0 4px 15px rgba(220, 38, 38, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)",
                boxShadow: "0 6px 20px rgba(220, 38, 38, 0.4)",
              },
            }}
          >
            Send Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
          Settings
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.autoShareLocation}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      autoShareLocation: e.target.checked,
                    })
                  }
                />
              }
              label={
                <Typography variant="body2">Auto-share location</Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.notifyEmergencyContact}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifyEmergencyContact: e.target.checked,
                    })
                  }
                />
              }
              label={
                <Typography variant="body2">
                  Notify emergency contact
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.soundAlerts}
                  onChange={(e) =>
                    setSettings({ ...settings, soundAlerts: e.target.checked })
                  }
                />
              }
              label={<Typography variant="body2">Sound alerts</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.showMapAlways}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      showMapAlways: e.target.checked,
                    })
                  }
                />
              }
              label={<Typography variant="body2">Always show map</Typography>}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)} size="small">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Available Guides Dialog */}
      <Dialog
        open={guidesDialogOpen}
        onClose={() => setGuidesDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
          <Shield sx={{ mr: 1, verticalAlign: "middle" }} />
          Select Your Admin Guide
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose an available admin who will monitor your safety and respond
            to your alerts.
          </Typography>
          {availableGuides.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <Shield sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No admin guides available at the moment
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {availableGuides.map((guide) => (
                <Card
                  key={guide.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      boxShadow: 2,
                    },
                  }}
                  onClick={() => assignGuideToTourist(guide.id!)}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}
                      >
                        {guide.name?.charAt(0) || "G"}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {guide.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Admin • {guide.email}
                        </Typography>
                      </Box>
                      {assigningGuide ? (
                        <CircularProgress size={24} />
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ minWidth: 80 }}
                        >
                          Select
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuidesDialogOpen(false)} size="small">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TouristDashboard;
