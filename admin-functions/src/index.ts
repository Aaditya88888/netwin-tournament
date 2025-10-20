import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";
import fs from "fs";
// @ts-ignore: Allow JS import for deployed backend
import { registerRoutes } from "./server/routes.js";

// Initialize Firebase Admin SDK
admin.initializeApp();

const app = express();

// Log runtime information
console.log("Cloud Function __dirname:", __dirname);
console.log("Cloud Function files:", fs.readdirSync(__dirname));

// Add custom property to Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'https://netwin-tournament-admin.web.app',
    'https://netwin-tournament.web.app'
  ];

  // Always set credentials header
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Set CORS headers based on origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Default to admin app in production
    res.setHeader('Access-Control-Allow-Origin', 'https://netwin-tournament-admin.web.app');
  }

  // Set other CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, X-Requested-With');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Minimal hello world route for sanity check
app.get("/hello", (req, res) => {
  res.json({ message: "Hello from Cloud Function!" });
});

// Register all backend routes (this will add all your real API endpoints)
// Awaiting async route registration causes race conditions in serverless
// environments. Register routes synchronously only.
registerRoutes(app);

// Fallback 404 route for debugging
app.all("*", (req, res) => {
  res.status(404).json({ message: "Route not found", path: req.path });
});

// Expose Express API as a single Cloud Function:
export const api = functions.onRequest({
  timeoutSeconds: 300,
  memory: "1GiB"
}, app);