import {Request, Response, NextFunction} from "express";

export const requireAdminOrModerator = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(403).json({message: "Authentication required"});
  }
  if (req.user.role === "admin" || req.user.role === "moderator") {
    return next();
  }
  return res.status(403).json({message: "Admin or moderator access required"});
};
