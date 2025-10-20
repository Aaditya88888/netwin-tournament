import { storage } from "../storage.js";
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { appCheckMiddleware } from '../middleware/appcheck.js';
import express from "express";

const router = express.Router();

// GET /api/announcements - List all announcements
router.get("/", appCheckMiddleware, authenticateToken, async (req, res) => {
  try {
    const announcements = await storage.getAllAnnouncements();
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/announcements - Create a new announcement
router.post("/", appCheckMiddleware, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const announcement = await storage.createAnnouncement(req.body);
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/announcements/:id - Update an announcement
router.put("/:id", appCheckMiddleware, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await storage.updateAnnouncement(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Announcement not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/announcements/:id - Delete an announcement
router.delete("/:id", appCheckMiddleware, authenticateToken, requireAdmin, async (req, res) => {
  try {
    await storage.deleteAnnouncement(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/announcements/:id - Partial update (e.g., isActive)
router.patch("/:id", appCheckMiddleware, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await storage.updateAnnouncement(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Announcement not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
