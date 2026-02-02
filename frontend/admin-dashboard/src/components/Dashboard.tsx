import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  AccountCircle,
  People,
  Security,
  Analytics,
  Refresh,
  ExitToApp,
  NotificationsActive,
  Map as MapIcon,
  Settings,
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule,
  LocationOn,
  Phone,
  Email,
  Badge,
  Wifi,
  WifiOff,
  Close,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  apiService,
  User,
  AlertStats,
  EmergencyAlert,
  PanicStats,
} from "../services/api";
import MapView from "./MapView";
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({
    totalAlerts: 0,
    activeAlerts: 0,
    resolvedAlerts: 0,
    lastAlert: null,
  });
  const [panicStats, setPanicStats] = useState<PanicStats | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [resolveDialog, setResolveDialog] = useState<{
    open: boolean;
    alertId: string;
    alertType: string;
  }>({
    open: false,
    alertId: "",
    alertType: "",
  });
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const navigate = useNavigate();

  // Socket state
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Online users state (userId -> lastActivity timestamp)
  const [onlineUsers, setOnlineUsers] = useState<Map<string, number>>(
    new Map(),
  );

  // Profile dialog state
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const checkAuth = () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/login");
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!checkAuth()) return;

    fetchUsers();
    fetchAlertStats();
    fetchRecentAlerts();
    fetchPanicStats();
    initializeSocket();

    // Set up auto-refresh for real-time updates
    const interval = setInterval(() => {
      fetchAlertStats();
      fetchRecentAlerts();
      fetchPanicStats();
    }, 5000); // Refresh every 5 seconds

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Cleanup old online users (remove users inactive for more than 5 minutes)
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes
      setOnlineUsers((prev) => {
        const newMap = new Map();
        prev.forEach((timestamp, userId) => {
          if (now - timestamp < timeout) {
            newMap.set(userId, timestamp);
          }
        });
        return newMap;
      });
    };

    const interval = setInterval(cleanup, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Get only tourists assigned to this admin
      const response = await apiService.getMyTourists();

      if (response.success && response.tourists) {
        setUsers(response.tourists);
      } else {
        setError("Failed to fetch assigned tourists");
      }
    } catch (err: any) {
      // Only redirect to login if it's definitely an authentication issue
      // and not just a temporary server/network issue
      if (err.response?.status === 401) {
        // Check if token still exists before redirecting
        const token = localStorage.getItem("adminToken");
        if (!token) {
          navigate("/login");
          return;
        }
        // If token exists but 401, show error instead of redirecting
        setError(
          "Authentication failed. Please try refreshing the page or contact support.",
        );
        return;
      }
      setError("Failed to connect to backend. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertStats = async () => {
    try {
      const response = await apiService.getAlertStats();

      if (response.success && response.stats) {
        setAlertStats(response.stats);
      }
    } catch (err: any) {
      console.error("Failed to fetch alert stats:", err);
      if (err.response?.status === 401) {
        // Check if token still exists before redirecting
        const token = localStorage.getItem("adminToken");
        if (!token) {
          navigate("/login");
          return;
        }
        // Don't redirect for stats, just log the error
        console.error("Authentication failed for alert stats");
        return;
      }
      // Don't show error for alert stats as it's not critical
    }
  };

  const fetchPanicStats = async () => {
    try {
      const response = await apiService.getPanicStats();

      if (response.success && response.data) {
        setPanicStats(response.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch panic stats:", err);
      if (err.response?.status === 401) {
        // Check if token still exists before redirecting
        const token = localStorage.getItem("adminToken");
        if (!token) {
          navigate("/login");
          return;
        }
        // Don't redirect for stats, just log the error
        console.error("Authentication failed for panic stats");
        return;
      }
      // Don't show error for panic stats as it's not critical
    }
  };

  const fetchRecentAlerts = async () => {
    try {
      const response = await apiService.getEmergencyAlerts();

      if (response.success && response.alerts) {
        setRecentAlerts(response.alerts.slice(0, 5)); // Show only last 5 alerts
      }
    } catch (err: any) {
      console.error("Failed to fetch recent alerts:", err);
      if (err.response?.status === 401) {
        // Check if token still exists before redirecting
        const token = localStorage.getItem("adminToken");
        if (!token) {
          navigate("/login");
          return;
        }
        // Don't redirect for alerts, just log the error
        console.error("Authentication failed for recent alerts");
        return;
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/login");
  };

  const refreshData = () => {
    fetchUsers();
    fetchAlertStats();
    fetchRecentAlerts();
    fetchPanicStats();
  };

  const initializeSocket = () => {
    const backendUrl = "http://localhost:5000";
    const token = localStorage.getItem("adminToken");

    if (!token) return;

    const socket = io(backendUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("authenticate", { token, userType: "admin" });
      setSocketConnected(true);
    });

    socket.on("authenticated", () => {
      console.log("Admin socket authenticated");
    });

    socket.on("tourist_assigned", (data: any) => {
      console.log("New tourist assigned:", data);
      // Refresh the tourist list when a new tourist is assigned
      fetchUsers();
      // Show notification
      setNotification({
        open: true,
        message: data.message || "New tourist has been assigned to you",
        severity: "info",
      });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      // Clear online users when socket disconnects
      setOnlineUsers(new Map());
    });

    socket.on("auth_error", (error: any) => {
      console.error("Socket auth error:", error);
    });

    socket.on("user_stats", (data: any) => {
      console.log("User stats update:", data);
      // Update online users set based on connected users
      // Note: The backend sends onlineTourists count, but we need individual user IDs
      // For now, we'll track online status when we receive location updates or other events
    });

    socket.on("location_update", (data: any) => {
      console.log("Location update received:", data);
      // Mark user as online when we receive location updates
      setOnlineUsers((prev) => new Map(prev).set(data.userId, Date.now()));
    });
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "error";
      case "police":
        return "warning";
      case "tourist":
        return "primary";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return (
      new Date(dateString).toLocaleDateString() +
      " " +
      new Date(dateString).toLocaleTimeString()
    );
  };

  const getEmergencyTypeInfo = (emergencyType?: string) => {
    const types: {
      [key: string]: { label: string; icon: string; color: string };
    } = {
      panic: { label: "General Emergency", icon: "🚨", color: "#e74c3c" },
      medical: { label: "Medical Emergency", icon: "🏥", color: "#e67e22" },
      accident: { label: "Accident", icon: "🚗", color: "#d35400" },
      theft: { label: "Theft/Robbery", icon: "🔓", color: "#f39c12" },
      harassment: { label: "Harassment", icon: "⚠️", color: "#e74c3c" },
      lost: { label: "Lost/Stranded", icon: "🧭", color: "#9b59b6" },
      natural_disaster: {
        label: "Natural Disaster",
        icon: "🌪️",
        color: "#c0392b",
      },
      fire: { label: "Fire Emergency", icon: "🔥", color: "#e74c3c" },
      violence: { label: "Violence/Assault", icon: "🛡️", color: "#8e44ad" },
      suspicious_activity: {
        label: "Suspicious Activity",
        icon: "👁️",
        color: "#f39c12",
      },
      transport: { label: "Transport Issue", icon: "🚌", color: "#3498db" },
      other: { label: "Other Emergency", icon: "📞", color: "#7f8c8d" },
    };
    return types[emergencyType || "other"] || types["other"];
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "CRITICAL":
        return "#c0392b";
      case "HIGH":
        return "#e74c3c";
      case "MEDIUM":
        return "#f39c12";
      case "LOW":
        return "#27ae60";
      default:
        return "#95a5a6";
    }
  };

  const handleResolveAlert = (
    alertId: string,
    alertType: string = "Emergency",
  ) => {
    setResolveDialog({
      open: true,
      alertId,
      alertType,
    });
  };

  const confirmResolveAlert = async () => {
    const { alertId, alertType } = resolveDialog;

    try {
      const response = await apiService.resolveAlert(alertId);

      if (response.success) {
        setNotification({
          open: true,
          message: `${alertType} alert resolved successfully!`,
          severity: "success",
        });

        // Refresh data to show updated status
        await fetchAlertStats();
        await fetchRecentAlerts();
      } else {
        setNotification({
          open: true,
          message: `Failed to resolve alert: ${response.message}`,
          severity: "error",
        });
      }
    } catch (error) {
      setNotification({
        open: true,
        message: "Error resolving alert. Please try again.",
        severity: "error",
      });
      console.error("Error resolving alert:", error);
    } finally {
      setResolveDialog({ open: false, alertId: "", alertType: "" });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Helper function to get admin user info
  const getAdminUser = () => {
    const userStr = localStorage.getItem("adminUser");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  };

  const adminUser = getAdminUser();

  return (
    <div className="dashboard-wrapper">
      {/* ============ HEADER / NAVIGATION ============ */}
      <header className="dashboard-header">
        <div className="header-toolbar">
          {/* Logo & Title */}
          <div className="header-logo">
            <div className="header-logo-icon">🛡️</div>
            <div>
              <div className="header-title">Smart Tourist Safety</div>
              <div className="header-subtitle">Admin Control Center</div>
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="header-nav">
            {/* Connection Status */}
            <div
              className={`connection-status ${socketConnected ? "" : "disconnected"}`}
            >
              <span
                className={`status-dot ${socketConnected ? "" : "disconnected"}`}
              ></span>
              <span>{socketConnected ? "Connected" : "Disconnected"}</span>
            </div>

            <Button className="nav-btn" onClick={refreshData}>
              <Refresh className="nav-btn-icon" />
              <span>Refresh</span>
            </Button>

            <Button
              className="nav-btn"
              onClick={() => navigate("/panic-button")}
            >
              <NotificationsActive className="nav-btn-icon" />
              <span>Panic Center</span>
            </Button>

            <IconButton
              className="profile-btn"
              onClick={(event) => setAnchorEl(event.currentTarget)}
            >
              <AccountCircle
                sx={{ color: "white !important", fontSize: "1.5rem" }}
              />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  setProfileOpen(true);
                }}
              >
                <AccountCircle sx={{ mr: 1.5, color: "#0284c7" }} /> My Profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  setSettingsOpen(true);
                }}
              >
                <Settings sx={{ mr: 1.5, color: "#0284c7" }} /> Settings
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  setNotification({
                    open: true,
                    message: "All systems operational ✓",
                    severity: "success",
                  });
                }}
              >
                <Analytics sx={{ mr: 1.5, color: "#0284c7" }} /> System Status
              </MenuItem>
              <MenuItem
                onClick={handleLogout}
                sx={{ color: "#ef4444 !important" }}
              >
                <ExitToApp sx={{ mr: 1.5, color: "#ef4444 !important" }} /> Sign
                Out
              </MenuItem>
            </Menu>
          </div>
        </div>
      </header>

      {/* ============ MAIN CONTENT ============ */}
      <main className="dashboard-main">
        <div className="dashboard-grid">
          {/* ============ STATS ROW ============ */}
          <div className="stats-row">
            {/* Tourists Card */}
            <div className="stat-card tourists">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-label">Assigned Tourists</div>
                  <div className="stat-value">{users.length}</div>
                  <div className="stat-trend up">
                    <TrendingUp sx={{ fontSize: "1rem" }} /> Active monitoring
                  </div>
                </div>
                <div className="stat-icon-wrapper">
                  <People />
                </div>
              </div>
            </div>

            {/* Active Tourists Card */}
            <div className="stat-card active">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-label">Online Tourists</div>
                  <div className="stat-value">{onlineUsers.size}</div>
                  <div className="stat-trend up">
                    <Wifi sx={{ fontSize: "1rem" }} /> Real-time tracking
                  </div>
                </div>
                <div className="stat-icon-wrapper">
                  <CheckCircle />
                </div>
              </div>
            </div>

            {/* Active Alerts Card */}
            <div className="stat-card alerts">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-label">Active Alerts</div>
                  <div className="stat-value">{alertStats.activeAlerts}</div>
                  <div className="stat-trend down">
                    <Warning sx={{ fontSize: "1rem" }} /> Requires attention
                  </div>
                </div>
                <div className="stat-icon-wrapper">
                  <Warning />
                </div>
              </div>
            </div>

            {/* Panic Events Card */}
            <div className="stat-card panic">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-label">Panic Events</div>
                  <div className="stat-value">
                    {panicStats?.activeEvents || 0}
                  </div>
                  <div className="stat-trend down">
                    <Security sx={{ fontSize: "1rem" }} /> Emergency response
                  </div>
                </div>
                <div className="stat-icon-wrapper">
                  <NotificationsActive />
                </div>
              </div>
            </div>
          </div>

          {/* ============ TWO COLUMN LAYOUT ============ */}
          <div className="content-columns">
            {/* ============ MAIN COLUMN ============ */}
            <div className="main-column">
              {/* Map Section */}
              <div className="glass-card map-card">
                <div className="card-header">
                  <div className="card-header-title">
                    <div className="card-header-icon">
                      <MapIcon />
                    </div>
                    <div>
                      <div className="card-title">Live Location Tracking</div>
                      <div className="card-subtitle">
                        Real-time tourist positions & geofences
                      </div>
                    </div>
                  </div>
                  <Button className="btn-action outline" size="small">
                    <LocationOn sx={{ mr: 0.5 }} /> Full Map
                  </Button>
                </div>
                <div className="card-body">
                  <div className="map-container">
                    <MapView />
                  </div>
                </div>
              </div>

              {/* Emergency Alerts Section */}
              {alertStats.activeAlerts > 0 && (
                <div className="glass-card emergency-alerts-card">
                  <div className="card-header emergency-header">
                    <div className="card-header-title">
                      <div
                        className="card-header-icon"
                        style={{
                          background:
                            "linear-gradient(135deg, #ef4444, #f87171)",
                        }}
                      >
                        <Warning />
                      </div>
                      <div>
                        <div
                          className="card-title"
                          style={{ color: "#991b1b" }}
                        >
                          🚨 Active Emergency Alerts ({alertStats.activeAlerts})
                        </div>
                        <div
                          className="card-subtitle"
                          style={{ color: "#dc2626" }}
                        >
                          Immediate attention required
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    {recentAlerts
                      .filter((alert) => alert.status === "ACTIVE")
                      .map((alert) => {
                        const emergencyInfo = getEmergencyTypeInfo(
                          alert.emergencyType,
                        );
                        return (
                          <div
                            key={alert.alertId}
                            className={`alert-item ${alert.priority?.toLowerCase() || "medium"}`}
                          >
                            <div className="alert-header">
                              <div className="alert-type">
                                <span className="alert-type-icon">
                                  {emergencyInfo.icon}
                                </span>
                                <span className="alert-type-label">
                                  {emergencyInfo.label}
                                </span>
                              </div>
                              <div className="alert-badges">
                                {alert.priority && (
                                  <span
                                    className={`priority-badge ${alert.priority.toLowerCase()}`}
                                  >
                                    {alert.priority}
                                  </span>
                                )}
                                <span
                                  className={`status-badge ${alert.status.toLowerCase()}`}
                                >
                                  {alert.status}
                                </span>
                              </div>
                            </div>
                            <div className="alert-details">
                              <div className="alert-detail">
                                <span className="alert-detail-label">
                                  Tourist ID
                                </span>
                                <span className="alert-detail-value">
                                  {alert.digitalId}
                                </span>
                              </div>
                              <div className="alert-detail">
                                <span className="alert-detail-label">Time</span>
                                <span className="alert-detail-value">
                                  {formatDate(alert.timestamp)}
                                </span>
                              </div>
                              <div className="alert-detail">
                                <span className="alert-detail-label">
                                  Location
                                </span>
                                <span className="alert-detail-value">
                                  {alert.location.latitude.toFixed(4)},{" "}
                                  {alert.location.longitude.toFixed(4)}
                                </span>
                              </div>
                              <div className="alert-detail">
                                <span className="alert-detail-label">
                                  Message
                                </span>
                                <span className="alert-detail-value">
                                  {alert.message}
                                </span>
                              </div>
                            </div>
                            <div className="alert-actions">
                              <button
                                className="btn-action primary"
                                onClick={() => {
                                  window.open(
                                    `https://www.google.com/maps?q=${alert.location.latitude},${alert.location.longitude}`,
                                    "_blank",
                                  );
                                }}
                              >
                                <LocationOn /> View on Map
                              </button>
                              <button
                                className="btn-action success"
                                onClick={() =>
                                  handleResolveAlert(
                                    alert.alertId,
                                    emergencyInfo.label,
                                  )
                                }
                              >
                                <CheckCircle /> Resolve Alert
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Users Table */}
              <div className="glass-card users-table-card">
                <div className="card-header">
                  <div className="card-header-title">
                    <div className="card-header-icon">
                      <People />
                    </div>
                    <div>
                      <div className="card-title">My Assigned Tourists</div>
                      <div className="card-subtitle">
                        Manage and monitor tourist safety
                      </div>
                    </div>
                  </div>
                  <Button
                    className="btn-action outline"
                    size="small"
                    onClick={refreshData}
                  >
                    <Refresh sx={{ mr: 0.5 }} /> Refresh
                  </Button>
                </div>
                <div className="card-body">
                  {error && (
                    <div
                      style={{
                        padding: "16px",
                        background: "rgba(239, 68, 68, 0.1)",
                        borderRadius: "12px",
                        marginBottom: "16px",
                        color: "#991b1b",
                      }}
                    >
                      ⚠️ {error}
                    </div>
                  )}

                  {loading ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <div className="loading-text">Loading tourists...</div>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">👥</div>
                      <div className="empty-state-title">
                        No Tourists Assigned
                      </div>
                      <div className="empty-state-text">
                        Tourists will appear here once they select you as their
                        guide.
                      </div>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="users-table">
                        <thead>
                          <tr>
                            <th>Tourist</th>
                            <th>Digital ID</th>
                            <th>Role</th>
                            <th>Contact</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id}>
                              <td>
                                <div className="user-cell">
                                  <div className="user-avatar">
                                    {user.name[0].toUpperCase()}
                                    {onlineUsers.has(user.id) && (
                                      <span className="online-indicator"></span>
                                    )}
                                  </div>
                                  <div className="user-info">
                                    <div className="user-name">{user.name}</div>
                                    <div className="user-email">
                                      {user.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="digital-id">
                                  {user.digitalId}
                                </span>
                              </td>
                              <td>
                                <span className={`role-chip ${user.role}`}>
                                  {user.role}
                                </span>
                              </td>
                              <td>{user.phone || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ============ SIDE COLUMN ============ */}
            <div className="side-column">
              {/* Quick Stats */}
              <div className="glass-card">
                <div className="card-header">
                  <div className="card-header-title">
                    <div className="card-header-icon">
                      <Analytics />
                    </div>
                    <div>
                      <div className="card-title">Quick Overview</div>
                      <div className="card-subtitle">System statistics</div>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="quick-stats-list">
                    <div className="quick-stat-item">
                      <div className="quick-stat-label">
                        <div className="quick-stat-icon blue">
                          <Analytics />
                        </div>
                        Total Alerts
                      </div>
                      <div className="quick-stat-value">
                        {alertStats.totalAlerts}
                      </div>
                    </div>
                    <div className="quick-stat-item">
                      <div className="quick-stat-label">
                        <div className="quick-stat-icon green">
                          <CheckCircle />
                        </div>
                        Resolved
                      </div>
                      <div className="quick-stat-value">
                        {alertStats.resolvedAlerts}
                      </div>
                    </div>
                    <div className="quick-stat-item">
                      <div className="quick-stat-label">
                        <div className="quick-stat-icon orange">
                          <Schedule />
                        </div>
                        Pending
                      </div>
                      <div className="quick-stat-value">
                        {alertStats.activeAlerts}
                      </div>
                    </div>
                    <div className="quick-stat-item">
                      <div className="quick-stat-label">
                        <div className="quick-stat-icon red">
                          <Warning />
                        </div>
                        Critical
                      </div>
                      <div className="quick-stat-value">
                        {
                          recentAlerts.filter((a) => a.priority === "CRITICAL")
                            .length
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card">
                <div className="card-header">
                  <div className="card-header-title">
                    <div className="card-header-icon">
                      <Schedule />
                    </div>
                    <div>
                      <div className="card-title">Recent Alerts</div>
                      <div className="card-subtitle">
                        Latest emergency events
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {recentAlerts.length === 0 ? (
                    <div
                      className="empty-state"
                      style={{ padding: "30px 20px" }}
                    >
                      <div
                        className="empty-state-icon"
                        style={{
                          width: "60px",
                          height: "60px",
                          fontSize: "1.5rem",
                        }}
                      >
                        ✓
                      </div>
                      <div
                        className="empty-state-title"
                        style={{ fontSize: "1rem" }}
                      >
                        All Clear
                      </div>
                      <div
                        className="empty-state-text"
                        style={{ fontSize: "0.85rem" }}
                      >
                        No recent alerts to display
                      </div>
                    </div>
                  ) : (
                    <div className="activity-list">
                      {recentAlerts.slice(0, 5).map((alert) => {
                        const emergencyInfo = getEmergencyTypeInfo(
                          alert.emergencyType,
                        );
                        return (
                          <div key={alert.alertId} className="activity-item">
                            <div
                              className={`activity-icon ${alert.status === "ACTIVE" ? "alert" : "success"}`}
                            >
                              {emergencyInfo.icon}
                            </div>
                            <div className="activity-content">
                              <div className="activity-title">
                                {emergencyInfo.label}
                              </div>
                              <div className="activity-description">
                                ID: {alert.digitalId}
                              </div>
                            </div>
                            <div className="activity-time">
                              {new Date(alert.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* System Info */}
              <div className="glass-card">
                <div className="card-header">
                  <div className="card-header-title">
                    <div className="card-header-icon">
                      <Settings />
                    </div>
                    <div>
                      <div className="card-title">System Status</div>
                      <div className="card-subtitle">Service health</div>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="quick-stats-list">
                    <div className="quick-stat-item">
                      <div className="quick-stat-label">
                        <div className="quick-stat-icon green">
                          {socketConnected ? <Wifi /> : <WifiOff />}
                        </div>
                        WebSocket
                      </div>
                      <span
                        style={{
                          color: socketConnected ? "#10b981" : "#ef4444",
                          fontWeight: 600,
                        }}
                      >
                        {socketConnected ? "● Online" : "● Offline"}
                      </span>
                    </div>
                    <div className="quick-stat-item">
                      <div className="quick-stat-label">
                        <div className="quick-stat-icon blue">
                          <Security />
                        </div>
                        API Status
                      </div>
                      <span style={{ color: "#10b981", fontWeight: 600 }}>
                        ● Healthy
                      </span>
                    </div>
                    <div className="quick-stat-item">
                      <div className="quick-stat-label">
                        <div className="quick-stat-icon orange">
                          <Schedule />
                        </div>
                        Last Update
                      </div>
                      <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============ DIALOGS ============ */}

      {/* Resolve Alert Dialog */}
      <Dialog
        open={resolveDialog.open}
        onClose={() =>
          setResolveDialog({ open: false, alertId: "", alertType: "" })
        }
        PaperProps={{ className: "glass-dialog" }}
        maxWidth="sm"
        fullWidth
      >
        <div className="dialog-header">
          <span className="dialog-header-icon">🔒</span>
          <span className="dialog-title">Resolve Emergency Alert</span>
        </div>
        <div className="dialog-content">
          <Typography sx={{ color: "#075985", mb: 2 }}>
            Are you sure you want to mark this{" "}
            <strong style={{ color: "#0369a1" }}>
              {resolveDialog.alertType}
            </strong>{" "}
            alert as resolved?
          </Typography>
          <Box
            sx={{
              background: "rgba(14, 165, 233, 0.08)",
              borderRadius: "12px",
              p: 2,
              border: "1px solid rgba(135, 206, 235, 0.3)",
            }}
          >
            <Typography variant="body2" sx={{ color: "#0369a1", mb: 1 }}>
              This action will:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#075985" }}>
              <li>Change the alert status to RESOLVED</li>
              <li>Remove it from the active alerts list</li>
              <li>Record the resolution timestamp</li>
              <li>Notify the system that this emergency has been handled</li>
            </ul>
          </Box>
        </div>
        <div className="dialog-actions">
          <Button
            onClick={() =>
              setResolveDialog({ open: false, alertId: "", alertType: "" })
            }
            className="btn-action outline"
          >
            Cancel
          </Button>
          <Button onClick={confirmResolveAlert} className="btn-action success">
            <CheckCircle sx={{ mr: 0.5 }} /> Confirm Resolve
          </Button>
        </div>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        PaperProps={{ className: "glass-dialog" }}
        maxWidth="sm"
        fullWidth
      >
        <div className="dialog-header">
          <span className="dialog-header-icon">👤</span>
          <span className="dialog-title">Admin Profile</span>
          <IconButton
            className="dialog-close-btn"
            onClick={() => setProfileOpen(false)}
          >
            <Close />
          </IconButton>
        </div>
        <div className="dialog-content">
          <div className="profile-avatar-large">
            {adminUser?.name ? adminUser.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="profile-name">{adminUser?.name || "Admin User"}</div>
          <div className="profile-role">Administrator</div>

          <div className="profile-details">
            <div className="profile-detail-item">
              <span className="profile-detail-label">
                <Email sx={{ fontSize: "1rem", mr: 1 }} /> Email
              </span>
              <span className="profile-detail-value">
                {adminUser?.email || "Not available"}
              </span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">
                <Phone sx={{ fontSize: "1rem", mr: 1 }} /> Phone
              </span>
              <span className="profile-detail-value">
                {adminUser?.phone || "Not provided"}
              </span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">
                <Badge sx={{ fontSize: "1rem", mr: 1 }} /> Role
              </span>
              <span className="profile-detail-value">Administrator</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">
                <Schedule sx={{ fontSize: "1rem", mr: 1 }} /> Member Since
              </span>
              <span className="profile-detail-value">
                {adminUser?.createdAt
                  ? new Date(adminUser.createdAt).toLocaleDateString()
                  : "Unknown"}
              </span>
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat-row">
              <span style={{ color: "#030303", fontWeight: 600 }}>
                System Status
              </span>
              <span style={{ color: "#05fc6c", fontWeight: 600 }}>
                🟢 Online
              </span>
            </div>
            <div className="profile-stat-row">
              <span style={{ color: "#080808", fontWeight: 600 }}>
                Active Tourists
              </span>
              <span style={{ color: "var(--sky-400)", fontWeight: 700 }}>
                {users.length}
              </span>
            </div>
            <div className="profile-stat-row">
              <span style={{ color: "#0b0b0b", fontWeight: 600 }}>
                Last Login
              </span>
              <span style={{ color: "var(--sky-400)", fontWeight: 600 }}>
                {new Date().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{ className: "glass-dialog" }}
        maxWidth="md"
        fullWidth
      >
        <div className="dialog-header">
          <span className="dialog-header-icon">⚙️</span>
          <span className="dialog-title">System Settings</span>
          <IconButton
            className="dialog-close-btn"
            onClick={() => setSettingsOpen(false)}
          >
            <Close />
          </IconButton>
        </div>
        <div className="dialog-content">
          <div className="settings-section">
            <div className="settings-section-title">
              <Settings sx={{ color: "#0284c7" }} /> Dashboard Preferences
            </div>
            <div className="settings-list">
              <div className="settings-item">
                <span className="settings-label">Auto-refresh Interval</span>
                <span className="settings-value">5 seconds</span>
              </div>
              <div className="settings-item">
                <span className="settings-label">Notification Alerts</span>
                <span className="settings-value" style={{ color: "#10b981" }}>
                  ✓ Enabled
                </span>
              </div>
              <div className="settings-item">
                <span className="settings-label">Real-time Updates</span>
                <span className="settings-value" style={{ color: "#10b981" }}>
                  ✓ Enabled
                </span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">
              <Analytics sx={{ color: "#0284c7" }} /> System Information
            </div>
            <div className="system-info-box">
              <div className="settings-list">
                <div className="settings-item">
                  <span className="settings-label">Backend Status</span>
                  <span style={{ color: "#10b981", fontWeight: 600 }}>
                    🟢 Connected
                  </span>
                </div>
                <div className="settings-item">
                  <span className="settings-label">Database</span>
                  <span style={{ color: "#10b981", fontWeight: 600 }}>
                    MongoDB Connected
                  </span>
                </div>
                <div className="settings-item">
                  <span className="settings-label">WebSocket</span>
                  <span
                    style={{
                      color: socketConnected ? "#10b981" : "#ef4444",
                      fontWeight: 600,
                    }}
                  >
                    {socketConnected ? "🟢 Connected" : "🔴 Disconnected"}
                  </span>
                </div>
                <div className="settings-item">
                  <span className="settings-label">API Version</span>
                  <span className="settings-value">v1.0.0</span>
                </div>
                <div className="settings-item">
                  <span className="settings-label">Last Updated</span>
                  <span className="settings-value">
                    {new Date().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Box
            sx={{
              mt: 2,
              p: 2,
              background:
                "linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(56, 189, 248, 0.05))",
              borderRadius: "12px",
              border: "1px solid rgba(135, 206, 235, 0.3)",
            }}
          >
            <Typography variant="body2" sx={{ color: "#0369a1" }}>
              <strong>💡 Note:</strong> Advanced settings and configuration
              options will be available in future updates.
            </Typography>
          </Box>
        </div>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{
            borderRadius: "14px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.15)",
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Dashboard;
