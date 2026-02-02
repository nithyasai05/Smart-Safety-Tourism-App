import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if it exists
apiClient.interceptors.request.use(
  (config) => {
    // Check for admin token first, then tourist token
    const adminToken = localStorage.getItem("adminToken");
    const touristToken = localStorage.getItem("touristToken");
    const token = adminToken || touristToken;

    console.log(
      "API Request:",
      config.url,
      "Token present:",
      !!token,
      "Admin token:",
      !!adminToken,
      "Tourist token:",
      !!touristToken,
    );

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Added Authorization header to request");
    } else {
      console.log("No token found in localStorage");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log(
      "API Response Error:",
      error.response?.status,
      error.response?.data,
      "URL:",
      error.config?.url,
    );
    if (error.response?.status === 401) {
      // Token is invalid or expired, clear tokens and redirect to login
      localStorage.removeItem("adminToken");
      localStorage.removeItem("touristToken");
      localStorage.removeItem("adminUser");
      localStorage.removeItem("touristUser");
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  digitalId: string;
  createdAt: string;
  assignedGuide?: string; // ID of assigned guide/admin
  blockchainTokenId?: number;
  blockchainTxHash?: string;
  blockchainContractAddress?: string;
  blockchainData?: {
    tokenId: number;
    txHash: string;
    contractAddress: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  [x: string]: any;
  success: boolean;
  message: string;
  data?: T;
  token?: string;
  user?: User;
  users?: User[];
  count?: number;
  demo?: boolean;
  stats?: AlertStats;
  alerts?: EmergencyAlert[];
  guides?: User[]; // For available guides response
  tourists?: User[]; // For assigned tourists response
  guide?: User; // For guide assignment response
  verified?: boolean; // For blockchain verification response
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  lastAlert: EmergencyAlert | null;
}

export interface EmergencyAlert {
  alertId: string;
  userId: string;
  digitalId: string;
  type: string;
  emergencyType?: string;
  priority?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  status: string;
  message: string;
  resolvedAt?: string;
}

export interface PanicEvent {
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
  userId: string;
  digitalId: string;
}

export interface PanicButtonSettings {
  autoTriggerLostTracking: boolean;
  autoTriggerGeofence: boolean;
  autoTriggerStaticLocation: boolean;
  autoTriggerAccident: boolean;
  staticLocationThresholdMinutes: number;
  notifyEmergencyContact: boolean;
}

export interface PanicStats {
  totalEvents: number;
  activeEvents: number;
  resolvedEvents: number;
  lastEvent: PanicEvent | null;
  eventsByType: {
    manual_panic: number;
    lost_tracking: number;
    geofence_breach: number;
    static_location: number;
    anomalous_movement: number;
    accident: number;
  };
}

// API functions
export const apiService = {
  // Authentication
  login: async (credentials: LoginCredentials): Promise<ApiResponse<User>> => {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  },

  // Get current user profile
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  // Get all users/tourists
  getAllUsers: async (): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get("/auth/users");
    return response.data;
  },

  // Register new user (for admin use)
  registerUser: async (userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role?: string;
  }): Promise<ApiResponse<User>> => {
    const response = await apiClient.post("/auth/register", userData);
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<any> => {
    const response = await apiClient.get("/health");
    return response.data;
  },

  // Alert management
  getAlertStats: async (): Promise<ApiResponse<AlertStats>> => {
    const response = await apiClient.get("/alerts/stats");
    return response.data;
  },

  getEmergencyAlerts: async (): Promise<ApiResponse<EmergencyAlert[]>> => {
    const response = await apiClient.get("/alerts/emergency");
    return response.data;
  },

  resolveAlert: async (alertId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/alerts/${alertId}/resolve`);
    return response.data;
  },

  // Panic Button Management
  getPanicStats: async (): Promise<ApiResponse<PanicStats>> => {
    const response = await apiClient.get("/panic/stats");
    return response.data;
  },

  getActivePanicEvents: async (): Promise<ApiResponse<PanicEvent[]>> => {
    const response = await apiClient.get("/panic/active-events");
    return response.data;
  },

  getAllPanicEvents: async (): Promise<ApiResponse<PanicEvent[]>> => {
    const response = await apiClient.get("/panic/all-events");
    return response.data;
  },

  resolvePanicEvent: async (
    eventId: string,
    resolutionDetails?: any,
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/panic/resolve-event`, {
      eventId,
      resolutionDetails: resolutionDetails || {
        userConfirmed: false,
        adminResolved: true,
        resolvedAt: new Date(),
      },
    });
    return response.data;
  },

  getUserPanicSettings: async (
    userId: string,
  ): Promise<ApiResponse<PanicButtonSettings>> => {
    const response = await apiClient.get(`/panic/user-settings/${userId}`);
    return response.data;
  },

  updateUserPanicSettings: async (
    userId: string,
    settings: PanicButtonSettings,
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(
      `/panic/user-settings/${userId}`,
      settings,
    );
    return response.data;
  },

  // Delete a user by id
  deleteUser: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/auth/users/${id}`);
    return response.data;
  },

  // Socket stats
  getSocketStats: async (): Promise<any> => {
    const response = await apiClient.get("/socket/stats");
    return response.data;
  },

  // Blockchain Tourist ID verification
  verifyTouristId: async (tokenId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post("/auth/verify-tourist-id", {
      tokenId,
    });
    return response.data;
  },

  // Trigger Manual Panic Alert (for tourist)
  triggerPanic: async (data: {
    latitude: number;
    longitude: number;
    message?: string;
    emergencyType?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post("/panic/trigger-manual", {
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
      message: data.message || "Emergency panic button activated",
      emergencyType: data.emergencyType || "panic",
    });
    return response.data;
  },

  // Cancel Active Panic Alert (for tourist)
  cancelPanic: async (eventId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post("/panic/cancel-event", { eventId });
    return response.data;
  },

  // Get User's Active Panic Events
  getUserPanicEvents: async (): Promise<ApiResponse<PanicEvent[]>> => {
    const response = await apiClient.get("/panic/my-events");
    return response.data;
  },

  // Update user location
  updateLocation: async (data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post("/location/update", data);
    return response.data;
  },

  // Guide assignment system
  getAvailableGuides: async (): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get("/auth/guides");
    return response.data;
  },

  assignGuide: async (guideId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post("/auth/assign-guide", { guideId });
    return response.data;
  },

  getMyTourists: async (): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get("/auth/my-tourists");
    return response.data;
  },
};

export default apiService;
