// Load environment variables first
import dotenv from "dotenv";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const result = dotenv.config({path: path.resolve(__dirname, "../.env")});

// Import Firebase initialization after env variables are loaded
// Initialize Firebase for Cloud Functions or local development
const isCloudFunction = !!process.env.FUNCTION_TARGET;
import("./firebase.js").catch((error) => {
  console.error("Firebase import failed:", error);
});

// Initialize email service
import {emailService} from "./sendEmail.js";

import express, {type Request, Response, NextFunction} from "express";
import {registerRoutes} from "./routes.js";
import cors from "cors";
import {addAppCheckHeaders} from "./middleware/appcheck.js";

const app = express();

// CORS configuration - temporarily allow all origins for debugging
const corsOptions = {
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Firebase-AppCheck", "X-Firebase-AppCheck-Token"],
};

// Middleware for parsing JSON and handling CORS
app.use(express.json());
app.use(cors(corsOptions));

// Add App Check headers middleware globally
app.use(addAppCheckHeaders);

// Request logging middleware (production-ready)
app.use((req, res, next) => {
  // Only log errors and important requests in production
  if (process.env.NODE_ENV === "development") {
    console.log(`${req.method} ${req.url}`);
  }
  next();
});

// Response logging middleware (development only)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        // Only log errors and slow requests in development
        console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
    });
  }
  next();
});

// Register routes using the app instance
if (typeof registerRoutes !== "function") {
  console.error("❌ registerRoutes is not a function!");
} else {
  // registerRoutes is ready to be called
}

// Create an async initialization function
async function initializeApp() {
  try {
    if (typeof registerRoutes !== "function") {
      throw new Error("registerRoutes is not a function");
    }
    await registerRoutes(app); // Use app directly
    console.log("✅ Routes registered successfully");

    // Initialize and verify email service
    try {
      await emailService.verifyConnection();
    } catch (error) {
      console.warn("⚠️ Email service initialization failed:", error);
    }

    // Essential route count for verification
    const routes = [];
    if (app._router && app._router.stack) {
      app._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods),
          });
        }
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`� Total routes registered: ${routes.length}`);
    }
  } catch (error) {
    console.error("❌ Failed to register routes:", error);
    throw error;
  }
}

// Initialize the application
initializeApp().then(() => {
  if (process.env.NODE_ENV === "development") {
    console.log("✅ App initialized successfully");
  }
}).catch((error) => {
  console.error("❌ Failed to initialize app:", error);
});

// Health check endpoint for Cloud Run
app.get("/_health", (_req, res) => {
  res.status(200).json({status: "healthy", timestamp: new Date().toISOString()});
});

// Root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Netwin Tournament Admin API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({message});
  throw err;
});

// Environment setup for deployment
if (process.env.NODE_ENV === "development") {
  console.log("Environment variables:", {
    FUNCTION_TARGET: process.env.FUNCTION_TARGET,
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
  });
}

// Firebase Cloud Function export
import {onRequest} from "firebase-functions/v2/https";

// Export as Firebase Cloud Function for hosting integration (v2)
export const api = onRequest({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "2GiB",
}, app);

// Export tournament management functions
export {
  tournamentStatusChecker,
  startTournamentManually,
} from "./tournament-scheduler.js";

export {
  tournamentManagement,
  startTournament,
  completeTournament,
} from "./tournament-management.js";

// Export the app for Firebase Functions deployment
export {app};

// For local development only - not for Cloud Functions
const isLocalDev = process.env.NODE_ENV === "development";

if (isLocalDev) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5002; // Admin backend on 5002
  const host = "localhost";

  console.log(`Starting local development server on ${host}:${port}`);
  console.log("Environment:", {
    NODE_ENV: process.env.NODE_ENV,
    FUNCTION_TARGET: process.env.FUNCTION_TARGET,
    isLocalDev,
  });

  app.listen(port, host, () => {
    console.log(`🚀 Server ready at http://${host}:${port}`);
    console.log(`📝 API docs at http://${host}:${port}/api-docs`);
  });
} else {
  console.log("Running in production mode or as Cloud Function");
}
