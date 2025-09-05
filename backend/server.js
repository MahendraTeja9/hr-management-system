const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config({ path: "./config.env" });

const authRoutes = require("./routes/auth");
const hrRoutes = require("./routes/hr");
const hrConfigRoutes = require("./routes/hrConfig");
const employeeRoutes = require("./routes/employee");
const attendanceRoutes = require("./routes/attendance");
const leaveRoutes = require("./routes/leave.js");
const documentsRoutes = require("./routes/documents");
const expensesRoutes = require("./routes/expenses");
const managerRoutes = require("./routes/manager");
const { connectDB } = require("./config/database");

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting - Much more lenient for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "production" ? 100 : 10000, // Much higher limit for development
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests
});
app.use(limiter);

// CORS - Allow all origins for development
app.use(
  cors({
    origin: "*",
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: ["Authorization"],
    optionsSuccessStatus: 200,
    preflightContinue: false,
  })
);

// Handle preflight requests
app.options("*", cors());

// Additional CORS headers for all responses
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  res.header("Access-Control-Allow-Credentials", "false");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours
  next();
});

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  if (req.path.includes("document-collection")) {
    console.log(`🔍 Document collection request: ${req.method} ${req.path}`);
    console.log(`🔍 Request body:`, req.body);
    console.log(`🔍 Request params:`, req.params);
  }
  next();
});

// Static files with proper MIME types and CORS headers for iframe embedding
app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res, path) => {
      // Set proper MIME types for PDF files
      if (path.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        // Allow iframe embedding for PDF files
        res.setHeader("X-Frame-Options", "ALLOWALL");
        res.setHeader("Content-Security-Policy", "frame-ancestors *");
      }
      // Set proper MIME types for image files
      else if (path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        const ext = path.split(".").pop().toLowerCase();
        const mimeTypes = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          bmp: "image/bmp",
          webp: "image/webp",
        };
        res.setHeader(
          "Content-Type",
          mimeTypes[ext] || "application/octet-stream"
        );
        // Allow iframe embedding for image files
        res.setHeader("X-Frame-Options", "ALLOWALL");
        res.setHeader("Content-Security-Policy", "frame-ancestors *");
      }
      // Set proper MIME types for other common file types
      else if (path.endsWith(".docx")) {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
      } else if (path.endsWith(".doc")) {
        res.setHeader("Content-Type", "application/msword");
      } else if (path.endsWith(".xlsx")) {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
      } else if (path.endsWith(".txt")) {
        res.setHeader("Content-Type", "text/plain");
      }
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/hr-config", hrConfigRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/expenses", expensesRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Global error handler caught:", err.message);
  console.error("❌ Error stack:", err.stack);
  console.error("❌ Request path:", req.path);
  console.error("❌ Request method:", req.method);
  console.error("❌ Request headers:", req.headers);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const startServer = async () => {
  try {
    // Temporarily skip database initialization to get server running
    // await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📧 Email configured for: ${process.env.EMAIL_USER}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
