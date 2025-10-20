"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions/v2/https"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
// @ts-ignore: Allow JS import for deployed backend
const routes_js_1 = require("./server/routes.js");
// Initialize Firebase Admin SDK
admin.initializeApp();
const app = (0, express_1.default)();
// Log runtime information
console.log("Cloud Function __dirname:", __dirname);
console.log("Cloud Function files:", fs_1.default.readdirSync(__dirname));
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
    }
    else {
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
(0, routes_js_1.registerRoutes)(app);
// Fallback 404 route for debugging
app.all("*", (req, res) => {
    res.status(404).json({ message: "Route not found", path: req.path });
});
// Expose Express API as a single Cloud Function:
exports.api = functions.onRequest({
    timeoutSeconds: 300,
    memory: "1GiB"
}, app);
//# sourceMappingURL=index.js.map