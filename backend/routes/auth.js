import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import memoryStore from "../utils/memoryStore.js";
import { auth } from "../middleware/auth.js";
import blockchainService from "../services/blockchainService.js";

const router = express.Router();

// JWT Secret (in production, use environment variable)
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "your-super-secret-jwt-key-change-in-production-please";

// Check if we should use in-memory store (when MongoDB is not available)
let useMemoryStore = false;

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

// Normalize phone numbers to E.164. Default country code +91 when missing.
function normalizePhone(phone) {
  if (!phone) return phone;
  let p = String(phone).trim();
  // remove common separators
  p = p.replace(/[^0-9+]/g, "");
  if (p.startsWith("+")) return p;
  // if 10 digits, assume Indian number
  if (/^\d{10}$/.test(p)) return `+91${p}`;
  // if starts with 0, strip leading zeros and prefix +91
  if (/^0+\d+$/.test(p)) return `+91${p.replace(/^0+/, "")}`;
  // default prefix +91 if no plus provided
  return `+91${p}`;
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  [
    body("name")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("phone")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Phone number must be at least 10 characters"),
    body("emergencyContact")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Emergency contact must be at least 10 characters"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        name,
        email,
        password,
        phone,
        emergencyContact,
        role = "tourist",
      } = req.body;
      const normalizedPhone = normalizePhone(phone);

      // Try MongoDB first, fallback to memory store
      let existingUser;
      let savedUser;

      try {
        // Try MongoDB
        existingUser = await User.findOne({ email });
      } catch (mongoError) {
        console.log("📊 MongoDB not available, using in-memory store for demo");
        useMemoryStore = true;
        existingUser = await memoryStore.findOne({ email });
      }

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this email",
        });
      }

      // Generate digital ID
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const digitalId = `TID${timestamp}${random}`;

      if (useMemoryStore) {
        // For in-memory store, we need to hash manually
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
          name,
          email,
          password: hashedPassword,
          phone: normalizedPhone,
          emergencyContact,
          role,
          digitalId,
        };
        savedUser = await memoryStore.save(userData);
      } else {
        // For MongoDB, let the model handle password hashing
        const user = new User({
          name,
          email,
          password, // Don't hash here - let the model do it
          phone: normalizedPhone,
          emergencyContact,
          role,
          digitalId,
        });

        savedUser = await user.save();
      }

      // Mint Tourist ID NFT on blockchain (minimal integration)
      let blockchainData = null;
      try {
        // Use a dummy wallet address for now (in production, get from user wallet)
        const dummyWalletAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; // Replace with actual user wallet
        const mintResult = await blockchainService.mintTouristID(
          dummyWalletAddress,
          savedUser.name,
          savedUser.digitalId,
        );
        if (mintResult.success) {
          blockchainData = {
            tokenId: mintResult.tokenId,
            txHash: mintResult.txHash,
            contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
          };
          // Update user with blockchain data
          if (!useMemoryStore) {
            await User.findByIdAndUpdate(savedUser._id, {
              blockchainTokenId: mintResult.tokenId,
              blockchainTxHash: mintResult.txHash,
            });
          }
        }
      } catch (blockchainError) {
        console.warn(
          "Blockchain minting failed, continuing without:",
          blockchainError.message,
        );
      }

      // Generate JWT token
      const token = generateToken(savedUser.id || savedUser._id);

      // Return user data (without password)
      const responseUser = {
        id: savedUser.id || savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        emergencyContact: savedUser.emergencyContact,
        role: savedUser.role,
        digitalId: savedUser.digitalId,
        blockchainData,
        createdAt: savedUser.createdAt || new Date(),
      };

      res.status(201).json({
        success: true,
        message: useMemoryStore
          ? "User registered successfully (using demo mode - no database)"
          : "User registered successfully",
        token,
        user: responseUser,
        demo: useMemoryStore,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during registration",
      });
    }
  },
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").exists().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;
      console.log("Login attempt:", { email, passwordLength: password.length });

      // Try to find user (MongoDB or memory store)
      let user;
      try {
        user = await User.findOne({ email });
      } catch (mongoError) {
        console.log("📊 Using in-memory store for login");
        useMemoryStore = true;
        user = await memoryStore.findOne({ email });
      }

      if (!user) {
        console.log("User not found:", email);
        return res.status(400).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      console.log("User found:", {
        id: user.id || user._id,
        email: user.email,
      });

      // Check password
      let isPasswordValid;
      if (useMemoryStore) {
        // For in-memory store, compare with bcrypt
        console.log("Comparing password with bcrypt (memory store)");
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        // For MongoDB, use the model method
        console.log("Comparing password with model method (MongoDB)");
        isPasswordValid = await user.comparePassword(password);
      }

      console.log("Password valid:", isPasswordValid);

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Generate JWT token
      const token = generateToken(user.id || user._id);

      // Return user data (without password)
      const userData = {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        emergencyContact: user.emergencyContact,
        role: user.role,
        digitalId: user.digitalId,
        createdAt: user.createdAt || user.createdAt || new Date(),
      };

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: userData,
        demo: useMemoryStore,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login",
      });
    }
  },
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", async (req, res) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is not valid",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Auth verification error:", error);
    res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (for testing/demo purposes)
// @access  Public (in production, make this admin-only)
router.get("/users", async (req, res) => {
  try {
    let users;

    if (useMemoryStore) {
      users = memoryStore.getAllUsers();
    } else {
      users = await User.find({}).select("-password");
    }

    res.json({
      success: true,
      count: users.length,
      users: users.map((user) => ({
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        digitalId: user.digitalId,
        createdAt: user.createdAt,
        lastSms: user.lastSms || null,
      })),
      demo: useMemoryStore,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching users",
    });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user by id (supports demo in-memory store)
// @access  Public (for demo) - in production should be admin-only
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    let deleted;
    try {
      deleted = await User.findByIdAndDelete(id);
    } catch (mongoError) {
      console.log("📊 MongoDB not available, using in-memory store for delete");
      useMemoryStore = true;
      deleted = await memoryStore.deleteById(id);
    }

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error deleting user" });
  }
});

// @route   GET /api/auth/guides
// @desc    Get all available guides (admins)
// @access  Private
router.get("/guides", auth, async (req, res) => {
  try {
    let guides;

    if (useMemoryStore) {
      guides = memoryStore
        .getAllUsers()
        .filter((user) => user.role && user.role.toLowerCase() === "admin");
    } else {
      guides = await User.find({
        role: "admin",
      }).select("-password");
    }

    res.json({
      success: true,
      count: guides.length,
      guides: guides.map((guide) => ({
        id: guide.id || guide._id,
        _id: guide._id,
        name: guide.name,
        email: guide.email,
        phone: guide.phone,
        role: guide.role,
        digitalId: guide.digitalId,
        createdAt: guide.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get guides error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching guides",
    });
  }
});

// @route   POST /api/auth/assign-guide
// @desc    Assign a guide to a tourist
// @access  Private
router.post("/assign-guide", auth, async (req, res) => {
  try {
    const { guideId } = req.body;
    const touristId = req.user.id || req.user._id;

    if (!guideId) {
      return res.status(400).json({
        success: false,
        message: "Guide ID is required",
      });
    }

    // Verify the guide exists and is not a tourist
    let guide;
    if (useMemoryStore) {
      guide = memoryStore.findById(guideId);
    } else {
      guide = await User.findById(guideId);
    }

    if (!guide || guide.role === "tourist") {
      return res.status(400).json({
        success: false,
        message: "Invalid guide selected",
      });
    }

    // Update the tourist's assigned guide
    if (useMemoryStore) {
      const updated = await memoryStore.updateById(touristId, {
        assignedGuide: guideId,
      });
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Tourist not found",
        });
      }
    } else {
      const updated = await User.findByIdAndUpdate(
        touristId,
        { assignedGuide: guideId },
        { new: true },
      );
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Tourist not found",
        });
      }
    }

    res.json({
      success: true,
      message: "Guide assigned successfully",
      guide: {
        id: guide.id || guide._id,
        name: guide.name,
        email: guide.email,
        role: guide.role,
      },
    });

    // Notify the assigned admin about the new tourist
    const socketHandler = req.app?.locals?.socketHandler;
    if (socketHandler && typeof socketHandler.sendToUser === "function") {
      // Get tourist details for notification
      let tourist;
      if (useMemoryStore) {
        tourist = memoryStore.findById(touristId);
      } else {
        tourist = await User.findById(touristId);
      }

      if (tourist) {
        socketHandler.sendToUser(guideId, "tourist_assigned", {
          tourist: {
            id: tourist.id || tourist._id,
            name: tourist.name,
            email: tourist.email,
            phone: tourist.phone,
            digitalId: tourist.digitalId,
            assignedAt: new Date(),
          },
          message: `New tourist ${tourist.name} has been assigned to you`,
        });
      }
    }
  } catch (error) {
    console.error("Assign guide error:", error);
    res.status(500).json({
      success: false,
      message: "Server error assigning guide",
    });
  }
});

// @route   GET /api/auth/my-tourists
// @desc    Get tourists assigned to the logged-in guide
// @access  Private
router.get("/my-tourists", auth, async (req, res) => {
  try {
    const guideId = req.user.id || req.user._id;
    let tourists;

    if (useMemoryStore) {
      tourists = memoryStore
        .getAllUsers()
        .filter(
          (user) => user.assignedGuide === guideId && user.role === "tourist",
        );
    } else {
      tourists = await User.find({
        assignedGuide: guideId,
        role: "tourist",
      }).select("-password");
    }

    res.json({
      success: true,
      count: tourists.length,
      tourists: tourists.map((tourist) => ({
        id: tourist.id || tourist._id,
        name: tourist.name,
        email: tourist.email,
        phone: tourist.phone,
        role: tourist.role,
        digitalId: tourist.digitalId,
        lastLocation: tourist.lastLocation,
        lastLocationUpdateTime: tourist.lastLocationUpdateTime,
        createdAt: tourist.createdAt,
        assignedGuide: tourist.assignedGuide,
      })),
    });
  } catch (error) {
    console.error("Get my tourists error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching tourists",
    });
  }
});

// @route   POST /api/auth/verify-tourist-id
// @desc    Verify Tourist ID on blockchain
// @access  Public
router.post("/verify-tourist-id", async (req, res) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: "Token ID is required",
      });
    }

    const verification = await blockchainService.verifyTouristID(tokenId);

    if (verification.success) {
      res.json({
        success: true,
        verified: verification.isValid,
        data: {
          owner: verification.owner,
          name: verification.name,
          digitalId: verification.digitalId,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: verification.error || "Verification failed",
      });
    }
  } catch (error) {
    console.error("Tourist ID verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during verification",
    });
  }
});

export default router;
