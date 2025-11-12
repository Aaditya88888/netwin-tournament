import {Request, Response, NextFunction} from "express";

// Server-side App Check service
export class ServerAppCheckService {
  private static token: string | null = null;

  static initialize() {
    // Get the App Check token from environment
    const envToken = process.env.FB_APP_CHECK_TOKEN || process.env.VITE_FB_APP_CHECK_TOKEN;

    if (envToken && envToken !== "your-firebase-app-check-token-here") {
      this.token = envToken;
      console.log("Server App Check token loaded from environment");
      return true;
    }

    console.warn("No App Check token found in environment variables");
    return false;
  }

  static getToken(): string | null {
    return this.token;
  }

  static setToken(token: string): void {
    this.token = token;
  }

  static isTokenValid(): boolean {
    return !!(this.token && this.token.length > 0);
  }

  static isConfigured(): boolean {
    return this.isTokenValid();
  }
}

// Middleware to validate App Check token
export const appCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip App Check validation in development mode
  if (process.env.NODE_ENV === "development") {
    console.log("App Check validation skipped in development mode");
    next();
    return;
  }

  try {
    // Get the expected token from server configuration
    const expectedToken = ServerAppCheckService.getToken();

    if (!expectedToken) {
      console.warn("App Check not configured on server");
      next(); // Continue without validation if not configured
      return;
    }

    // Get the token from request headers
    const clientToken = req.headers["x-firebase-appcheck"] ||
                       req.headers["x-firebase-appcheck-token"] ||
                       req.headers["X-Firebase-AppCheck"] ||
                       req.headers["X-Firebase-AppCheck-Token"];

    if (!clientToken) {
      console.warn("No App Check token provided in request");
      // In production, you might want to reject the request here
      // For now, we'll just log a warning and continue
      next();
      return;
    }

    // Validate the token (in a real implementation, you'd verify this with Firebase)
    if (clientToken === expectedToken) {
      console.log("App Check token validated successfully");
      next();
    } else {
      console.warn("Invalid App Check token provided");
      // In production, you might want to reject the request here
      // For now, we'll just log a warning and continue
      next();
    }
  } catch (error) {
    console.error("App Check validation error:", error);
    next(); // Continue even if there's an error
  }
};

// Middleware to add App Check token to outgoing requests
export const addAppCheckHeaders = (req: Request, res: Response, next: NextFunction) => {
  const token = ServerAppCheckService.getToken();

  if (token) {
    // Add token to response headers for client to use
    res.setHeader("X-Firebase-AppCheck-Available", "true");
  }

  next();
};

// Initialize the service when this module is loaded
ServerAppCheckService.initialize();
