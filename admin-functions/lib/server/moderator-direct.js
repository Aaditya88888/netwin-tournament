import { auth } from "./firebase.js";
import { firestore } from "./firebase.js";
import nodemailer from 'nodemailer';
import { config } from 'dotenv';
// Load environment variables
config();
// POST /moderator/invite-direct
export async function inviteModeratorDirect(req, res) {
    const { email, manual, permissions } = req.body;
    if (!email)
        return res.status(400).json({ message: "Email is required" });
    if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({ message: "At least one permission is required" });
    }
    // Validate permissions
    const ALLOWED_PERMISSIONS = [
        "manage_users",
        "edit_tournaments",
        "view_reports",
        "manage_announcements",
        "distribute_prizes",
        "review_kyc"
    ];
    const filteredPermissions = permissions.filter((p) => ALLOWED_PERMISSIONS.includes(p));
    if (filteredPermissions.length === 0) {
        return res.status(400).json({ message: "No valid permissions provided" });
    }
    // Determine admin URL based on request origin
    const origin = req.get('origin') || req.get('referer');
    let adminUrl = process.env.ADMIN_URL || 'http://localhost:3000';
    if (origin) {
        // Extract base URL from origin
        try {
            const url = new URL(origin);
            adminUrl = `${url.protocol}//${url.host}`;
        }
        catch (e) {
            // Use default if URL parsing fails
        }
    }
    try {
        let user;
        let isNewUser = false;
        try {
            user = await auth.getUserByEmail(email);
        }
        catch (err) {
            if (err.code === 'auth/user-not-found') {
                // Create user with random password
                user = await auth.createUser({ email });
                isNewUser = true;
            }
            else {
                throw err;
            }
        }
        // Set custom claim
        await auth.setCustomUserClaims(user.uid, { role: "moderator", permissions: filteredPermissions });
        // Generate admin-specific password reset link for all users
        let passwordLink = '';
        // Always generate a password link, even for existing users
        const actionCodeSettings = {
            url: `${adminUrl}/auth/reset-password?email=${encodeURIComponent(email)}`,
            handleCodeInApp: true
        };
        console.log('Generating password reset link with settings:', actionCodeSettings);
        try {
            passwordLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
            console.log('Generated password reset link:', passwordLink);
            if (!passwordLink || passwordLink.trim() === '') {
                console.error('WARNING: Empty password reset link generated');
                // Use a fallback link if Firebase doesn't generate one
                passwordLink = `${adminUrl}/auth/reset-password?email=${encodeURIComponent(email)}&oobCode=requestPasswordReset`;
                console.log('Using fallback password reset link:', passwordLink);
            }
        }
        catch (error) {
            console.error('Error generating password reset link:', error);
            // Use a fallback link if Firebase fails
            passwordLink = `${adminUrl}/auth/reset-password?email=${encodeURIComponent(email)}&oobCode=requestPasswordReset`;
            console.log('Using fallback password reset link after error:', passwordLink);
        }
        // Store moderator access in Firestore
        await firestore.collection('moderator_access').doc(user.uid).set({
            email: user.email,
            role: 'moderator',
            permissions: filteredPermissions,
            invitedAt: new Date(),
            invitedBy: 'admin',
            status: 'active',
            adminAppAccess: true
        }, { merge: true });
        // Skip email if manual mode is enabled
        if (manual) {
            return res.status(200).json({
                success: true,
                message: "Moderator access granted successfully. No email sent (manual mode)."
            });
        }
        // Send invite email directly using nodemailer
        try {
            // Create permission labels
            const permissionLabels = {
                manage_users: 'Manage Users',
                edit_tournaments: 'Edit Tournaments',
                view_reports: 'View Reports',
                manage_announcements: 'Manage Announcements',
                distribute_prizes: 'Distribute Prizes',
                review_kyc: 'Review KYC Documents'
            };
            const permissionList = permissions
                .map(p => permissionLabels[p] || p)
                .join(', ');
            // Create password section - always include it
            // Fix HTML escaping issues with backticks
            const passwordSection = `
        <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">Set Your Password</h3>
          <p style="color: #856404;">Click the button below to set your password or reset it if you've forgotten it:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${passwordLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px;">Set Password</a>
          </div>
        </div>
      `;
            // Create email content with password section first for visibility
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
            
            <!-- Password Section - Placed prominently at the top -->
            <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #856404; margin-top: 0;">Set Your Password</h3>
              <p style="color: #856404;">Click the button below to set your password or reset it if you've forgotten it:</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${passwordLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px;">Set Password</a>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Your Permissions:</h3>
              <p style="color: #666; margin-bottom: 0; font-weight: bold;">
                ${permissionList}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${adminUrl}" style="display: inline-block; background-color: #6f42c1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Access Admin Panel
              </a>
            </div>
            
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #0c5460; font-size: 14px;">
                <strong>Next Steps:</strong>
              </p>
              <ol style="color: #0c5460; font-size: 14px; margin: 10px 0 0 0;">
                <li>Click the "Set Password" button above to set your password</li>
                <li>After setting your password, use the "Access Admin Panel" button to log in</li>
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
            // Log email configuration
            console.log('Direct email configuration:', {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                user: process.env.SMTP_USER?.substring(0, 3) + '***',
                from: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER,
                to: email
            });
            // Create transporter
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.zoho.com',
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                }
            });
            // Send email
            await transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME || 'Netwin Tournament'}" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Moderator Access Granted - Netwin Tournament',
                html: emailContent,
            });
            return res.status(200).json({
                success: true,
                message: "Moderator invited successfully and email sent directly"
            });
        }
        catch (mailErr) {
            console.error('Failed to send direct moderator invite email:', mailErr);
            return res.status(200).json({
                success: true,
                message: `Moderator invited, but failed to send email: ${mailErr.message}`,
                emailError: true
            });
        }
    }
    catch (error) {
        return res.status(500).json({ message: error.message || "Failed to invite moderator" });
    }
}
