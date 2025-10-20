import { appCheckMiddleware } from "../lib/middleware/appcheck.js";
import { authenticateToken, requireAdmin } from "../lib/middleware/auth.js";
const asyncHandler = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((error) => res.status(500).json({ message: error.message || "Internal Server Error" }));
export function registerTicketRoutes(app, apiPrefix) {
    // Support ticket endpoint
    app.get(`${apiPrefix}/support-tickets`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        res.json({ tickets: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0, hasNext: false, hasPrev: false } });
    }));
    // Support ticket endpoints (moved from routes.ts)
    app.get(`${apiPrefix}/support-tickets`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // ...existing support tickets logic from routes.ts...
    }));
    // ... add support ticket-related routes here, using app.get/post/put/delete etc ...
}
