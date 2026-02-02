import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import Dashboard from "./components/Dashboard";
import PanicButtonPage from "./components/PanicButtonPage";
import TouristDashboard from "./components/TouristDashboard";
import "./App.css";

// Create an enhanced professional theme with modern colors
const theme = createTheme({
  palette: {
    primary: {
      main: "#8b9bf5",
      light: "#a0aec0",
      dark: "#667eea",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#9163c2",
      light: "#a78bfa",
      dark: "#764ba2",
      contrastText: "#ffffff",
    },
    success: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#dc2626",
    },
    warning: {
      main: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
    },
    info: {
      main: "#1e40af",
      light: "#3b82f6",
      dark: "#1d4ed8",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#1e293b",
      secondary: "#64748b",
    },
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.5px",
    },
    h5: {
      fontWeight: 600,
      letterSpacing: "-0.3px",
    },
    h6: {
      fontWeight: 600,
      letterSpacing: "-0.2px",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    "none",
    "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 8px 16px rgba(102, 126, 234, 0.2)",
    "0 12px 24px rgba(102, 126, 234, 0.25)",
    "0 16px 32px rgba(102, 126, 234, 0.3)",
    "0 20px 40px rgba(102, 126, 234, 0.35)",
    "0 24px 48px rgba(102, 126, 234, 0.4)",
    "0 28px 56px rgba(102, 126, 234, 0.45)",
    "0 32px 64px rgba(102, 126, 234, 0.5)",
    "0 36px 72px rgba(102, 126, 234, 0.55)",
    "0 40px 80px rgba(102, 126, 234, 0.6)",
    "0 44px 88px rgba(102, 126, 234, 0.65)",
    "0 48px 96px rgba(102, 126, 234, 0.7)",
    "0 52px 104px rgba(102, 126, 234, 0.75)",
    "0 56px 112px rgba(102, 126, 234, 0.8)",
    "0 60px 120px rgba(102, 126, 234, 0.85)",
    "0 64px 128px rgba(102, 126, 234, 0.9)",
    "0 68px 136px rgba(102, 126, 234, 0.95)",
    "0 72px 144px rgba(102, 126, 234, 1)",
    "0 76px 152px rgba(102, 126, 234, 1)",
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "10px 24px",
          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 6px 16px rgba(102, 126, 234, 0.3)",
          },
        },
        contained: {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)",
            transform: "translateY(-4px)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        elevation6: {
          boxShadow: "0 12px 40px rgba(102, 126, 234, 0.15)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            transition: "all 0.3s ease",
            "&:hover fieldset": {
              borderColor: "#667eea",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#764ba2",
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          padding: 8,
        },
      },
    },
  },
});

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const adminToken = localStorage.getItem("adminToken");
  const touristToken = localStorage.getItem("touristToken");

  // Allow access if either admin or tourist token exists
  const token = adminToken || touristToken;

  return token ? <>{children}</> : <Navigate to="/login" />;
};

// Role-based redirect for authenticated users accessing login page
const AuthRedirect: React.FC = () => {
  const adminToken = localStorage.getItem("adminToken");
  const touristToken = localStorage.getItem("touristToken");
  const adminUserStr = localStorage.getItem("adminUser");
  const touristUserStr = localStorage.getItem("touristUser");

  // Check for admin token first
  if (adminToken && adminUserStr) {
    try {
      const user = JSON.parse(adminUserStr);
      const role = user.role?.toLowerCase() || "admin";
      if (role === "tourist") {
        return <Navigate to="/tourist-dashboard" />;
      }
      return <Navigate to="/dashboard" />;
    } catch {
      return <LoginPage />;
    }
  }

  // Check for tourist token
  if (touristToken && touristUserStr) {
    try {
      JSON.parse(touristUserStr);
      return <Navigate to="/tourist-dashboard" />;
    } catch {
      return <LoginPage />;
    }
  }

  return <LoginPage />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<AuthRedirect />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panic-button"
            element={
              <ProtectedRoute>
                <PanicButtonPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tourist-dashboard"
            element={
              <ProtectedRoute>
                <TouristDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
