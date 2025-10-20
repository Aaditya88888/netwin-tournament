import announcementsRouter from "./routes/announcements.js";
// ...existing code...

export function registerRoutes(app) {
  // ...existing code...

  // Register announcements API
  app.use("/api/announcements", announcementsRouter);

  // ...existing code...
}
