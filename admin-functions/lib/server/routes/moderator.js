import { appCheckMiddleware } from "../lib/middleware/appcheck.js";
import { authenticateToken, requireAdmin } from "../lib/middleware/auth.js";
const asyncHandler = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((error) => res.status(500).json({ message: error.message || "Internal Server Error" }));
export function registerModeratorRoutes(app, apiPrefix) {
    // Moderator endpoints
    app.post(`${apiPrefix}/moderator/invite`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // This should call your inviteModerator logic
        // Example: await inviteModerator(req, res);
        res.json({ message: 'Moderator invited (placeholder)' });
    }));
    app.get(`${apiPrefix}/moderator/list`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // This should call your listModerators logic
        res.json({ moderators: [] });
    }));
    app.post(`${apiPrefix}/moderator/remove`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // This should call your removeModerator logic
        res.json({ message: 'Moderator removed (placeholder)' });
    }));
    // Moderator endpoints (moved from routes.ts)
    app.post(`${apiPrefix}/moderator/invite`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // ...existing inviteModerator logic from routes.ts...
    }));
    app.get(`${apiPrefix}/moderator/list`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // ...existing listModerators logic from routes.ts...
    }));
    app.post(`${apiPrefix}/moderator/remove`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // ...existing removeModerator logic from routes.ts...
    }));
    // ... add moderator-related routes here, using app.get/post/put/delete etc ...
}
