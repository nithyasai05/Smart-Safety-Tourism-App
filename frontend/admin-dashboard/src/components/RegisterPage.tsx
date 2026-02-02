import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  MenuItem,
  Link,
  InputAdornment,
  IconButton,
  useMediaQuery,
  useTheme,
  Fade,
  Grow,
  LinearProgress,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  Phone,
  ContactEmergency,
  AdminPanelSettings,
  TravelExplore,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    emergencyContact: "",
    role: "tourist",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getPasswordStrength = () => {
    const { password } = formData;
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  const getPasswordColor = () => {
    const strength = getPasswordStrength();
    if (strength <= 25) return "error";
    if (strength <= 50) return "warning";
    if (strength <= 75) return "info";
    return "success";
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (formData.phone.length < 10) {
      setError("Phone number must be at least 10 digits");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        emergencyContact: formData.emergencyContact,
        role: formData.role,
      };

      const response = await apiService.registerUser(registrationData);

      if (response.success) {
        setSuccess("Registration successful! You can now login.");
        // Clear form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          emergencyContact: "",
          role: "tourist",
        });

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(response.message || "Registration failed");
        // Clear password fields on error for security
        setFormData((prev) => ({
          ...prev,
          password: "",
          confirmPassword: "",
        }));
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
      // Clear password fields on error for security
      setFormData((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
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
              maxWidth: { xs: "100%", sm: 500 },
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
                p: { xs: 3, sm: 4 },
              }}
            >
              <Grow in timeout={1000}>
                <Box sx={{ textAlign: "center", mb: 3 }}>
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
                    <TravelExplore
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
                    Create Account
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
                      mb: 2,
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

              {success && (
                <Fade in>
                  <Alert
                    severity="success"
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      "& .MuiAlert-icon": {
                        fontSize: { xs: 20, sm: 22 },
                      },
                    }}
                  >
                    {success}
                  </Alert>
                </Fade>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="name"
                  label="Full Name"
                  name="name"
                  autoComplete="name"
                  autoFocus
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={loading}
                  size={isMobile ? "small" : "medium"}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={loading}
                  size={isMobile ? "small" : "medium"}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="primary" />
                      </InputAdornment>
                    ),
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
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading}
                  size={isMobile ? "small" : "medium"}
                  helperText="Minimum 6 characters"
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
                />
                {formData.password && (
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={getPasswordStrength()}
                      color={getPasswordColor()}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      Password strength: {getPasswordStrength()}%
                    </Typography>
                  </Box>
                )}
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  size={isMobile ? "small" : "medium"}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          edge="end"
                          size={isMobile ? "small" : "medium"}
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="phone"
                  label="Phone Number"
                  type="tel"
                  id="phone"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={loading}
                  size={isMobile ? "small" : "medium"}
                  helperText="Include country code (e.g., +91XXXXXXXXXX)"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="emergencyContact"
                  label="Emergency Contact"
                  type="tel"
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  disabled={loading}
                  size={isMobile ? "small" : "medium"}
                  helperText="Emergency contact phone number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ContactEmergency color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="role"
                  label="Account Type"
                  select
                  id="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  disabled={loading}
                  size={isMobile ? "small" : "medium"}
                  helperText="Select your account type"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AdminPanelSettings color="primary" />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="tourist">Tourist</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="operator">Operator</MenuItem>
                  <MenuItem value="supervisor">Supervisor</MenuItem>
                </TextField>

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
                    color: "#0284c7",
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
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </Box>

              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{" "}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => navigate("/login")}
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
                    Sign In
                  </Link>
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 3,
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
                    Demo Info:
                  </strong>
                  <br />
                  Tourist → Personal Safety Dashboard
                  <br />
                  Admin/Operator → Control Center
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default RegisterPage;
