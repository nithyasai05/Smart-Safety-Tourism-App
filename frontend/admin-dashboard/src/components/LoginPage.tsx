import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Link,
  InputAdornment,
  IconButton,
  useMediaQuery,
  useTheme,
  Fade,
  Grow,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  SecurityOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiService.login({ email, password });

      if (response.success && response.token && response.user) {
        // Clear any old tokens before storing new ones
        localStorage.clear();

        // Role-based navigation
        const userRole = response.user.role?.toLowerCase() || "tourist";

        // Store token and user info with role-specific keys
        if (userRole === "tourist") {
          localStorage.setItem("touristToken", response.token);
          localStorage.setItem("touristUser", JSON.stringify(response.user));
        } else {
          localStorage.setItem("adminToken", response.token);
          localStorage.setItem("adminUser", JSON.stringify(response.user));
        }

        if (userRole === "tourist") {
          navigate("/tourist-dashboard");
        } else {
          // Admin, operator, supervisor go to admin dashboard
          navigate("/dashboard");
        }
      } else {
        setError(response.message || "Login failed");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #87ceeb 0%, #e0f7ff 50%, #ffffff 100%)",
        padding: { xs: 2, sm: 3 },
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle at 20% 30%, rgba(135, 206, 235, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)",
        },
      }}
    >
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Paper
            elevation={24}
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", sm: 450 },
              margin: "0 auto",
              borderRadius: { xs: 3, sm: 4 },
              overflow: "hidden",
              position: "relative",
              zIndex: 1,
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(16px) saturate(180%)",
              border: "1px solid rgba(135, 206, 235, 0.35)",
              boxShadow: "0 8px 32px rgba(135, 206, 235, 0.25)",
            }}
          >
            <Box
              sx={{
                p: { xs: 3, sm: 4, md: 5 },
              }}
            >
              <Grow in timeout={1000}>
                <Box sx={{ textAlign: "center", mb: 4 }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: { xs: 70, sm: 80 },
                      height: { xs: 70, sm: 80 },
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
                      mb: 2,
                      boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4)",
                    }}
                  >
                    <SecurityOutlined
                      sx={{ fontSize: { xs: 35, sm: 40 }, color: "white" }}
                    />
                  </Box>
                  <Typography
                    variant={isMobile ? "h5" : "h4"}
                    component="h1"
                    gutterBottom
                    sx={{
                      background:
                        "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      fontWeight: 700,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    Welcome Back
                  </Typography>
                  <Typography
                    variant={isMobile ? "body1" : "h6"}
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    Smart Tourist Safety System
                  </Typography>
                </Box>
              </Grow>

              {error && (
                <Fade in>
                  <Alert
                    severity="error"
                    sx={{
                      mb: 3,
                      borderRadius: 2,
                      "& .MuiAlert-icon": {
                        fontSize: { xs: 20, sm: 22 },
                      },
                    }}
                    onClose={() => setError("")}
                  >
                    {error}
                  </Alert>
                </Fade>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      transition: "all 0.3s ease",
                    },
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size={isMobile ? "small" : "medium"}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      transition: "all 0.3s ease",
                    },
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size={isMobile ? "medium" : "large"}
                  sx={{
                    mt: 3,
                    mb: 2,
                    py: { xs: 1.2, sm: 1.5 },
                    fontSize: { xs: "0.95rem", sm: "1rem" },
                    fontWeight: 600,
                    color: "#299ee2",
                    background:
                      "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
                    boxShadow: "0 4px 16px rgba(14, 165, 233, 0.4)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 20px rgba(14, 165, 233, 0.5)",
                    },
                    "&:active": {
                      transform: "translateY(0)",
                    },
                  }}
                  disabled={loading}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </Box>

              <Box sx={{ textAlign: "center", mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{" "}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => navigate("/register")}
                    sx={{
                      cursor: "pointer",
                      fontWeight: 600,
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      textDecoration: "none",
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Register Here
                  </Link>
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 4,
                  p: { xs: 2, sm: 2.5 },
                  bgcolor: "rgba(102, 126, 234, 0.05)",
                  borderRadius: 2,
                  border: "1px solid rgba(102, 126, 234, 0.1)",
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
                >
                  <strong style={{ color: theme.palette.primary.main }}>
                    Demo Credentials:
                  </strong>
                  <br />
                  Admin: admin@smartsafety.com / admin123
                  <br />
                  Tourist: tourist@example.com / tourist123
                  <br />
                  <br />
                  Tourist users → Tourist Dashboard
                  <br />
                  Admin/Operator → Admin Dashboard
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default LoginPage;
