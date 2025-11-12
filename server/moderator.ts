import {Request, Response} from "express";
import {auth, firestore} from "./firebase.js";
import {sendModeratorInviteEmail} from "./sendEmail.js";
import {AuthRequest} from "./middleware/auth.js";

// POST /moderator/invite
export async function inviteModerator(req: Request, res: Response) {
  const {email, manual, permissions} = req.body;
  if (!email) return res.status(400).json({message: "Email is required"});
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({message: "At least one permission is required"});
  }
  // Validate permissions
  const ALLOWED_PERMISSIONS = [
    "manage_users",
    "edit_tournaments",
    "view_reports",
    "manage_announcements",
    "distribute_prizes",
    "review_kyc",
  ];
  const filteredPermissions = permissions.filter((p: string) => ALLOWED_PERMISSIONS.includes(p));
  if (filteredPermissions.length === 0) {
    return res.status(400).json({message: "No valid permissions provided"});
  }

  // Determine admin URL based on request origin
  const origin = req.get("origin") || req.get("referer");
  let adminUrl = process.env.ADMIN_URL || "http://localhost:3000";

  if (origin) {
    // Extract base URL from origin
    try {
      const url = new URL(origin);
      adminUrl = `${url.protocol}//${url.host}`;
    } catch (e) {
      // Use default if URL parsing fails
    }
  }

  try {
    let user;
    let isNewUser = false;
    try {
      user = await auth.getUserByEmail(email);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        // Create user with random password
        user = await auth.createUser({email});
        isNewUser = true;
      } else {
        throw err;
      }
    }
    // Set custom claim
    await auth.setCustomUserClaims(user.uid, {role: "moderator", permissions: filteredPermissions});
    // Generate admin-specific password reset link for new users
    let passwordLink = "";
    if (isNewUser) {
      const actionCodeSettings = {
        url: `${adminUrl}/auth/reset-password?email=${encodeURIComponent(email)}`,
        handleCodeInApp: true,
      };
      passwordLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
    }

    // Store moderator access in Firestore
    await firestore.collection("moderator_access").doc(user.uid).set({
      email: user.email,
      role: "moderator",
      permissions: filteredPermissions,
      invitedAt: new Date(),
      invitedBy: "admin",
      status: "active",
      adminAppAccess: true,
    }, {merge: true});
    // Store moderator email in a separate collection for notification
    await firestore.collection("pending_notifications").doc().set({
      type: "moderator_invite",
      email: email,
      permissions: filteredPermissions,
      adminUrl: adminUrl,
      passwordLink: passwordLink || "",
      createdAt: new Date(),
      status: "pending",
    });

    // Send invite email (include password link if new user and dynamic admin URL)
    try {
      // Debug email configuration
      console.log("Email configuration:", {
        EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_HOST: process.env.SMTP_HOST,
        recipient: email,
      });

      // Send email regardless of domain
      await sendModeratorInviteEmail(email, permissions, passwordLink, adminUrl);
      return res.status(200).json({success: true, message: "Moderator invited successfully and email sent"});
    } catch (mailErr: any) {
      console.error("Failed to send moderator invite email:", mailErr);
      // Log SMTP configuration for debugging (without exposing full credentials)
      console.log(`SMTP Config: Host=${process.env.SMTP_HOST}, Port=${process.env.SMTP_PORT}, User=${process.env.SMTP_USER?.substring(0, 3)}***`);
      return res.status(200).json({
        success: true,
        message: `Moderator invited, but failed to send email: ${mailErr.message}`,
        emailError: true,
      });
    }
  } catch (error: any) {
    return res.status(500).json({message: error.message || "Failed to invite moderator"});
  }
}
