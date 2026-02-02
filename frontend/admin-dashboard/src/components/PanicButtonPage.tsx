import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Dialog,
  Snackbar,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  TextField,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  Refresh,
  LocationOn,
  CheckCircle,
  Settings,
  Close,
  ArrowBack,
  Warning,
  Schedule,
  TrendingUp,
  Person,
  Email,
  NotificationsActive,
} from "@mui/icons-material";
import {
  apiService,
  PanicEvent,
  PanicStats,
  PanicButtonSettings,
  User,
} from "../services/api";
import "./PanicButtonPage.css";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const PanicButtonPage: React.FC = () => {
  const [activeEvents, setActiveEvents] = useState<PanicEvent[]>([]);
  const [allEvents, setAllEvents] = useState<PanicEvent[]>([]);
  const [stats, setStats] = useState<PanicStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<PanicEvent | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSettings, setUserSettings] = useState<PanicButtonSettings>({
    autoTriggerLostTracking: true,
    autoTriggerGeofence: true,
    autoTriggerStaticLocation: true,
    autoTriggerAccident: true,
    staticLocationThresholdMinutes: 60,
    notifyEmergencyContact: true,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info",
  });

  const navigate = useNavigate();

  useEffect(() => {
    checkAuthenticationAndLoadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuthenticationAndLoadData = async () => {
    try {
      // First check if we have a token
      const token = localStorage.getItem("adminToken");
      if (!token) {
        setSnackbar({
          open: true,
          message: "Please log in to access panic button management",
          severity: "error",
        });
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate("/login");
        }, 2000);
        return;
      }

      // Try to load data
      await loadData();
    } catch (error) {
      console.error("Authentication check failed:", error);
      // Don't treat all errors as session expiration - loadData handles its own errors
      setSnackbar({
        open: true,
        message: "Failed to load data. Please try refreshing the page.",
        severity: "error",
      });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsRes, allEventsRes, statsRes, usersRes] = await Promise.all([
        apiService.getActivePanicEvents(),
        apiService.getAllPanicEvents(),
        apiService.getPanicStats(),
        apiService.getAllUsers(),
      ]);

      if (eventsRes.success) {
        setActiveEvents(eventsRes.data || []);
      }
      if (allEventsRes.success) {
        setAllEvents(allEventsRes.data || []);
      }
      if (statsRes.success) {
        setStats(statsRes.data || null);
      }
      if (usersRes.success) {
        setUsers(usersRes.users || []);
      }
    } catch (error: any) {
      console.error("Error loading panic button data:", error);

      // Check if it's an authentication error
      if (error.response?.status === 401) {
        // Don't redirect - just show error message
        setSnackbar({
          open: true,
          message: "Authentication failed. Please refresh the page.",
          severity: "error",
        });
        return;
      }

      // For other errors, show a generic message
      setSnackbar({
        open: true,
        message: "Failed to load panic button data. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveEvent = async (eventId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await apiService.resolvePanicEvent(eventId);
      if (response.success) {
        setActiveEvents(activeEvents.filter((e) => e.eventId !== eventId));
        setSnackbar({
          open: true,
          message: "Panic event resolved successfully",
          severity: "success",
        });
        loadData(); // Refresh data
      }
    } catch (error) {
      console.error("Error resolving panic event:", error);
      setSnackbar({
        open: true,
        message: "Failed to resolve panic event",
        severity: "error",
      });
    }
    setResolveDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getEventTypeInfo = (type: string) => {
    const types: {
      [key: string]: { label: string; icon: string; color: string };
    } = {
      manual_panic: { label: "Manual Panic", icon: "🚨", color: "#c0392b" },
      lost_tracking: { label: "Lost Tracking", icon: "📍", color: "#e67e22" },
      geofence_breach: {
        label: "Geofence Breach",
        icon: "🚧",
        color: "#f39c12",
      },
      static_location: {
        label: "Static Location",
        icon: "⏸️",
        color: "#27ae60",
      },
      anomalous_movement: {
        label: "Anomalous Movement",
        icon: "⚠️",
        color: "#e74c3c",
      },
      accident: { label: "Accident Detection", icon: "🚗", color: "#8e44ad" },
    };
    return types[type] || { label: type, icon: "❓", color: "#7f8c8d" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const openResolveDialog = (event: PanicEvent) => {
    setSelectedEvent(event);
    setResolveDialogOpen(true);
  };

  const openSettingsDialog = async (user: User) => {
    setSelectedUser(user);
    try {
      const response = await apiService.getUserPanicSettings(user.id);
      if (response.success && response.data) {
        setUserSettings(response.data);
      }
    } catch (error) {
      console.error("Error loading user settings:", error);
    }
    setSettingsDialogOpen(true);
  };

  const saveUserSettings = async () => {
    if (!selectedUser) return;

    try {
      const response = await apiService.updateUserPanicSettings(
        selectedUser.id,
        userSettings,
      );
      if (response.success) {
        setSnackbar({
          open: true,
          message: "User settings updated successfully",
          severity: "success",
        });
        setSettingsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error updating user settings:", error);
      setSnackbar({
        open: true,
        message: "Failed to update user settings",
        severity: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="panic-wrapper">
        <div className="loading-container">
          <CircularProgress sx={{ color: "#0ea5e9" }} />
          <Typography sx={{ color: "#0369a1", mt: 2 }}>
            Loading panic data...
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="panic-wrapper">
      {/* Header */}
      <header className="panic-header">
        <div className="header-left">
          <Button className="back-btn" onClick={() => navigate("/")}>
            <ArrowBack />
          </Button>
          <div className="header-logo">
            <div className="header-logo-icon">🆘</div>
            <div>
              <div className="header-title">Panic Button Center</div>
              <div className="header-subtitle">
                Emergency Response Management
              </div>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <Button className="nav-btn" onClick={loadData}>
            <Refresh className="nav-btn-icon" />
            <span>Refresh</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="panic-main">
        {/* Stats Row */}
        {stats && (
          <div className="stats-row">
            <div className="stat-card active-events">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-label">Active Events</div>
                  <div className="stat-value">{stats.activeEvents}</div>
                  <div className="stat-trend danger">
                    <Warning sx={{ fontSize: "1rem" }} /> Requires attention
                  </div>
                </div>
                <div className="stat-icon-wrapper danger">
                  <NotificationsActive />
                </div>
              </div>
            </div>

            <div className="stat-card total-events">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-label">Total Events</div>
                  <div className="stat-value">{stats.totalEvents}</div>
                  <div className="stat-trend up">
                    <TrendingUp sx={{ fontSize: "1rem" }} /> All time
                  </div>
                </div>
                <div className="stat-icon-wrapper">
                  <Schedule />
                </div>
              </div>
            </div>

            <div className="stat-card resolved-events">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-label">Resolved Today</div>
                  <div className="stat-value">{stats.resolvedEvents}</div>
                  <div className="stat-trend success">
                    <CheckCircle sx={{ fontSize: "1rem" }} /> Handled
                  </div>
                </div>
                <div className="stat-icon-wrapper success">
                  <CheckCircle />
                </div>
              </div>
            </div>

            <div className="stat-card last-event">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-label">Last Event</div>
                  <div className="stat-value-small">
                    {stats.lastEvent
                      ? formatDate(stats.lastEvent.timestamp)
                      : "None"}
                  </div>
                  <div className="stat-trend">
                    <Schedule sx={{ fontSize: "1rem" }} /> Latest
                  </div>
                </div>
                <div className="stat-icon-wrapper">
                  <Schedule />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events by Type */}
        {stats && stats.eventsByType && (
          <div className="glass-card events-type-card">
            <div className="card-header">
              <div className="card-header-icon">📊</div>
              <div className="card-header-title">Events by Type (Last 24h)</div>
            </div>
            <div className="card-body">
              <div className="events-type-grid">
                {Object.entries(stats.eventsByType).map(([type, count]) => {
                  const typeInfo = getEventTypeInfo(type);
                  return (
                    <div className="event-type-item" key={type}>
                      <span className="event-type-icon">{typeInfo.icon}</span>
                      <span className="event-type-label">{typeInfo.label}</span>
                      <span
                        className="event-type-count"
                        style={{ color: typeInfo.color }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="tabs-container">
          <div className="tabs-nav">
            <button
              className={`tab-btn ${tabValue === 0 ? "active" : ""}`}
              onClick={() => setTabValue(0)}
            >
              <Warning sx={{ fontSize: "1.1rem" }} />
              Active ({activeEvents.length})
            </button>
            <button
              className={`tab-btn ${tabValue === 1 ? "active" : ""}`}
              onClick={() => setTabValue(1)}
            >
              <Schedule sx={{ fontSize: "1.1rem" }} />
              All Events ({allEvents.length})
            </button>
            <button
              className={`tab-btn ${tabValue === 2 ? "active" : ""}`}
              onClick={() => setTabValue(2)}
            >
              <Settings sx={{ fontSize: "1.1rem" }} />
              Settings
            </button>
          </div>

          {/* Active Events Tab */}
          {tabValue === 0 && (
            <div className="tab-content">
              {activeEvents.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✓</div>
                  <div className="empty-text">No active panic events</div>
                  <div className="empty-subtext">
                    All emergencies have been resolved
                  </div>
                </div>
              ) : (
                <div className="events-grid">
                  {activeEvents.map((event) => {
                    const typeInfo = getEventTypeInfo(event.type);
                    return (
                      <div className="event-card active" key={event.eventId}>
                        <div className="event-card-header">
                          <div className="event-type">
                            <span
                              className="event-type-badge"
                              style={{ background: typeInfo.color }}
                            >
                              {typeInfo.icon} {typeInfo.label}
                            </span>
                          </div>
                          <span className="event-status active">🔴 Active</span>
                        </div>
                        <div className="event-card-body">
                          <div className="event-detail">
                            <Person
                              sx={{ fontSize: "1rem", color: "#0284c7" }}
                            />
                            <span>{event.digitalId}</span>
                          </div>
                          {event.location && (
                            <div className="event-detail">
                              <LocationOn
                                sx={{ fontSize: "1rem", color: "#0284c7" }}
                              />
                              <Tooltip
                                title={`${event.location.latitude}, ${event.location.longitude}`}
                              >
                                <span>Location available</span>
                              </Tooltip>
                            </div>
                          )}
                          <div className="event-detail">
                            <Schedule
                              sx={{ fontSize: "1rem", color: "#0284c7" }}
                            />
                            <span>{formatDate(event.timestamp)}</span>
                          </div>
                          {event.message && (
                            <div className="event-message">{event.message}</div>
                          )}
                        </div>
                        <div className="event-card-actions">
                          <Button
                            className="btn-resolve"
                            onClick={() => openResolveDialog(event)}
                          >
                            <CheckCircle sx={{ fontSize: "1rem" }} /> Resolve
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* All Events Tab */}
          {tabValue === 1 && (
            <div className="tab-content">
              <div className="table-wrapper">
                <table className="events-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>User</th>
                      <th>Message</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>ML Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEvents.slice(0, 100).map((event) => {
                      const typeInfo = getEventTypeInfo(event.type);
                      return (
                        <tr key={event.eventId}>
                          <td>
                            <span
                              className="type-badge"
                              style={{
                                background: `${typeInfo.color}20`,
                                color: typeInfo.color,
                              }}
                            >
                              {typeInfo.icon} {typeInfo.label}
                            </span>
                          </td>
                          <td>{event.digitalId}</td>
                          <td className="message-cell">
                            {event.message || "-"}
                          </td>
                          <td>{formatDate(event.timestamp)}</td>
                          <td>
                            <span className={`status-badge ${event.status}`}>
                              {event.status === "active"
                                ? "🔴 Active"
                                : "✅ Resolved"}
                            </span>
                          </td>
                          <td>
                            {event.mlConfidence ? (
                              <span className="ml-score">
                                {(event.mlConfidence * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="ml-na">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {tabValue === 2 && (
            <div className="tab-content">
              <div className="table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Digital ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Settings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <span className="digital-id-badge">
                            {user.digitalId}
                          </span>
                        </td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          <IconButton
                            className="settings-btn"
                            onClick={() => openSettingsDialog(user)}
                          >
                            <Settings />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Resolve Event Dialog */}
      <Dialog
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
        PaperProps={{ className: "glass-dialog" }}
        maxWidth="sm"
        fullWidth
      >
        <div className="dialog-header">
          <span className="dialog-header-icon">🔒</span>
          <span className="dialog-title">Resolve Panic Event</span>
          <IconButton
            className="dialog-close-btn"
            onClick={() => setResolveDialogOpen(false)}
          >
            <Close />
          </IconButton>
        </div>
        <div className="dialog-content">
          <Typography sx={{ color: "#075985", mb: 2 }}>
            Are you sure you want to resolve this panic event? This will mark it
            as handled and notify the user.
          </Typography>
          {selectedEvent && (
            <div className="resolve-event-info">
              <div className="info-row">
                <span className="info-label">Type:</span>
                <span className="info-value">
                  {getEventTypeInfo(selectedEvent.type).icon}{" "}
                  {getEventTypeInfo(selectedEvent.type).label}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">User:</span>
                <span className="info-value">{selectedEvent.digitalId}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Time:</span>
                <span className="info-value">
                  {formatDate(selectedEvent.timestamp)}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="dialog-actions">
          <Button
            onClick={() => setResolveDialogOpen(false)}
            className="btn-action outline"
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              selectedEvent && handleResolveEvent(selectedEvent.eventId)
            }
            className="btn-action success"
          >
            <CheckCircle sx={{ mr: 0.5 }} /> Resolve Event
          </Button>
        </div>
      </Dialog>

      {/* User Settings Dialog */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        PaperProps={{ className: "glass-dialog" }}
        maxWidth="sm"
        fullWidth
      >
        <div className="dialog-header">
          <span className="dialog-header-icon">⚙️</span>
          <span className="dialog-title">User Panic Settings</span>
          <IconButton
            className="dialog-close-btn"
            onClick={() => setSettingsDialogOpen(false)}
          >
            <Close />
          </IconButton>
        </div>
        <div className="dialog-content">
          {selectedUser && (
            <>
              <div className="user-settings-header">
                <div className="user-avatar">
                  {selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">{selectedUser.name}</div>
                  <div className="user-digital-id">
                    {selectedUser.digitalId}
                  </div>
                </div>
              </div>

              <div className="settings-list">
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">
                      Auto-trigger on Lost Tracking
                    </div>
                    <div className="setting-desc">
                      Alert when location tracking is lost for 5+ minutes
                    </div>
                  </div>
                  <Switch
                    checked={userSettings.autoTriggerLostTracking}
                    onChange={(e) =>
                      setUserSettings({
                        ...userSettings,
                        autoTriggerLostTracking: e.target.checked,
                      })
                    }
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#0ea5e9",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        { backgroundColor: "#0ea5e9" },
                    }}
                  />
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">
                      Auto-trigger on Geofence Breach
                    </div>
                    <div className="setting-desc">
                      Alert when entering restricted areas
                    </div>
                  </div>
                  <Switch
                    checked={userSettings.autoTriggerGeofence}
                    onChange={(e) =>
                      setUserSettings({
                        ...userSettings,
                        autoTriggerGeofence: e.target.checked,
                      })
                    }
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#0ea5e9",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        { backgroundColor: "#0ea5e9" },
                    }}
                  />
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">
                      Auto-trigger on Static Location
                    </div>
                    <div className="setting-desc">
                      Alert when stationary for extended periods
                    </div>
                  </div>
                  <Switch
                    checked={userSettings.autoTriggerStaticLocation}
                    onChange={(e) =>
                      setUserSettings({
                        ...userSettings,
                        autoTriggerStaticLocation: e.target.checked,
                      })
                    }
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#0ea5e9",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        { backgroundColor: "#0ea5e9" },
                    }}
                  />
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">
                      Auto-trigger on Accident Detection (AI)
                    </div>
                    <div className="setting-desc">
                      Use AI to detect potential accidents via sensor data
                    </div>
                  </div>
                  <Switch
                    checked={userSettings.autoTriggerAccident}
                    onChange={(e) =>
                      setUserSettings({
                        ...userSettings,
                        autoTriggerAccident: e.target.checked,
                      })
                    }
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#0ea5e9",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        { backgroundColor: "#0ea5e9" },
                    }}
                  />
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">
                      Notify Emergency Contact
                    </div>
                    <div className="setting-desc">
                      Send alerts to emergency contacts during panic events
                    </div>
                  </div>
                  <Switch
                    checked={userSettings.notifyEmergencyContact}
                    onChange={(e) =>
                      setUserSettings({
                        ...userSettings,
                        notifyEmergencyContact: e.target.checked,
                      })
                    }
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#0ea5e9",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        { backgroundColor: "#0ea5e9" },
                    }}
                  />
                </div>

                <div className="setting-item threshold">
                  <TextField
                    label="Static Location Threshold (minutes)"
                    type="number"
                    value={userSettings.staticLocationThresholdMinutes}
                    onChange={(e) =>
                      setUserSettings({
                        ...userSettings,
                        staticLocationThresholdMinutes:
                          parseInt(e.target.value) || 60,
                      })
                    }
                    fullWidth
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        "&.Mui-focused fieldset": { borderColor: "#0ea5e9" },
                      },
                      "& .MuiInputLabel-root.Mui-focused": { color: "#0ea5e9" },
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="dialog-actions">
          <Button
            onClick={() => setSettingsDialogOpen(false)}
            className="btn-action outline"
          >
            Cancel
          </Button>
          <Button onClick={saveUserSettings} className="btn-action primary">
            Save Settings
          </Button>
        </div>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            borderRadius: "14px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.15)",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default PanicButtonPage;
