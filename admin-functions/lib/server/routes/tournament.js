import { storage } from "../lib/storage.js";
import { appCheckMiddleware } from "../lib/middleware/appcheck.js";
import { authenticateToken, requireAdmin } from "../lib/middleware/auth.js";
const asyncHandler = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((error) => res.status(500).json({ message: error.message || "Internal Server Error" }));
export function registerTournamentRoutes(app, apiPrefix) {
    // Tournament creation
    app.post(`${apiPrefix}/tournaments`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        try {
            const tournamentData = {
                ...req.body,
                roomId: req.body.roomId || null,
                roomPassword: req.body.roomPassword || null,
                companyCommissionPercentage: req.body.companyCommissionPercentage || 10,
                firstPrizePercentage: req.body.firstPrizePercentage || 60,
                secondPrizePercentage: req.body.secondPrizePercentage || 30,
                perKillRewardPercentage: req.body.perKillRewardPercentage || 10,
                gameMode: req.body.gameMode || 'squad',
                teamSize: req.body.teamSize || 4,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const tournament = await storage.createTournament(tournamentData);
            res.status(201).json(tournament);
        }
        catch (error) {
            console.error('Error creating tournament:', error);
            if (error.name === 'ZodError') {
                res.status(400).json({ message: "Validation failed", errors: error.errors, details: error.message });
            }
            else {
                res.status(500).json({ message: "Failed to create tournament", error: error.message });
            }
        }
    }));
    // Tournament update
    app.patch(`${apiPrefix}/tournaments/:id`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        const id = req.params.id;
        const tournament = await storage.getTournament(id);
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }
        const updatedTournament = await storage.updateTournament(id, req.body);
        res.json(updatedTournament);
    }));
    // Tournament delete
    app.delete(`${apiPrefix}/tournaments/:id`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        const id = req.params.id;
        const tournament = await storage.getTournament(id);
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }
        const success = await storage.deleteTournament(id);
        if (success) {
            res.status(204).send();
        }
        else {
            res.status(500).json({ message: "Failed to delete tournament" });
        }
    }));
    // Get all tournaments
    app.get(`${apiPrefix}/tournaments`, asyncHandler(async (req, res) => {
        try {
            const tournaments = await storage.getAllTournaments();
            res.json(tournaments);
        }
        catch (error) {
            res.status(500).json({ message: 'Failed to fetch tournaments' });
        }
    }));
    // Add other tournament endpoints as needed
    // Tournament endpoints (moved from routes.ts)
    app.post(`${apiPrefix}/tournaments`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // ...existing tournament creation logic from routes.ts...
    }));
    app.patch(`${apiPrefix}/tournaments/:id`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // ...existing tournament update logic from routes.ts...
    }));
    app.delete(`${apiPrefix}/tournaments/:id`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // ...existing tournament delete logic from routes.ts...
    }));
    app.get(`${apiPrefix}/tournaments`, asyncHandler(async (req, res) => {
        // ...existing get tournaments logic from routes.ts...
    }));
    // Add all other tournament-related endpoints here as needed
    // ... add tournament-related routes here, using app.get/post/put/delete etc ...
}
