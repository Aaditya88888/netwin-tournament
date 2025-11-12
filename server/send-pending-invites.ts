import {config} from "dotenv";
import {firestore} from "./firebase.js";
import nodemailer from "nodemailer";

// Load environment variables
config();

/**
 * Utility to send pending moderator invitations
 * This can be run manually or scheduled to run periodically
 */
async function sendPendingInvites() {
  console.log("Checking for pending moderator invites...");

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.zoho.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection verified!");

    // Get pending notifications
    const snapshot = await firestore.collection("pending_notifications")
      .where("status", "==", "pending")
      .where("type", "==", "moderator_invite")
      .limit(10)
      .get();

    if (snapshot.empty) {
      console.log("No pending moderator invites found.");
      return;
    }

    console.log(`Found ${snapshot.size} pending moderator invites.`);

    // Process each pending invite
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const {email, permissions, adminUrl, passwordLink} = data;

      try {
        // Check if email domain matches our sending domain to avoid relay issues
        const senderDomain = process.env.EMAIL_FROM_ADDRESS?.split("@")[1];
        const recipientDomain = email.split("@")[1];

        if (senderDomain && recipientDomain && senderDomain === recipientDomain) {
          // Same domain - can send directly
          await sendModeratorInviteEmail(email, permissions, passwordLink, adminUrl);
          console.log(`✅ Sent invite to ${email}`);

          // Update status
          await doc.ref.update({
            status: "sent",
            sentAt: new Date(),
          });
        } else {
          console.log(`⚠️ Cannot send to ${email}: domain ${recipientDomain} differs from sender domain ${senderDomain}`);
          await doc.ref.update({
            status: "failed",
            error: "Domain relay restriction",
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error(`❌ Failed to send invite to ${email}:`, error);
        await doc.ref.update({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          updatedAt: new Date(),
        });
      }
    }

    console.log("Finished processing pending moderator invites.");
  } catch (error) {
    console.error("❌ Error processing pending invites:", error);
  }
}

/**
 * Send moderator invitation email
 */
async function sendModeratorInviteEmail(email: string, permissions: string[], passwordLink?: string, adminUrl?: string): Promise<void> {
  const permissionLabels: Record<string, string> = {
    manage_users: "Manage Users",
    edit_tournaments: "Edit Tournaments",
    view_reports: "View Reports",
    manage_announcements: "Manage Announcements",
    distribute_prizes: "Distribute Prizes",
    review_kyc: "Review KYC Documents",
  };

  const permissionList = permissions.map((p) => permissionLabels[p] || p).join(", ");

  // Use provided adminUrl or fallback to environment variable
  const loginUrl = adminUrl || process.env.ADMIN_URL || "http://localhost:3000";

  let passwordSection = "";
  if (passwordLink) {
    passwordSection = `
      <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #856404; margin-top: 0;">Set Your Password</h3>
        <p style="color: #856404;">Click the button below to set your password and activate your moderator account:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${passwordLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px;">Set Password</a>
        </div>
      </div>
    `;
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #6f42c1; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Moderator Invitation</h1>
      </div>
      
      <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">You've been invited as a Moderator!</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Congratulations! You have been granted moderator access to the Netwin Tournament admin panel.
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Your Permissions:</h3>
          <p style="color: #666; margin-bottom: 0; font-weight: bold;">
            ${permissionList}
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="display: inline-block; background-color: #6f42c1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Access Admin Panel
          </a>
        </div>
        
        ${passwordSection}
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #0c5460; font-size: 14px;">
            <strong>Next Steps:</strong>
          </p>
          <ol style="color: #0c5460; font-size: 14px; margin: 10px 0 0 0;">
            <li>Click the "Access Admin Panel" button above to go to the login page</li>
            <li>Log in with your existing account or set your password if you are new</li>
            <li>Your moderator permissions are now active</li>
            <li>Contact the admin if you need additional permissions</li>
          </ol>
        </div>
        
        <p style="color: #666; text-align: center; margin-top: 30px;">
          Welcome to the team!<br>
          <strong>The Netwin Tournament Admin Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>© 2025 Netwin Tournament. All rights reserved.</p>
        <p>This email was sent to ${email}</p>
      </div>
    </div>
  `;

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.zoho.com",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Send the email
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: "Moderator Access Granted - Netwin Tournament",
    html: emailContent,
  });
}

// Run if called directly
if (require.main === module) {
  sendPendingInvites()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to send pending invites:", err);
      process.exit(1);
    });
}
