import nodemailer from "nodemailer";
import {config} from "dotenv";

// Load environment variables
config();

// Email service class
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
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
  }

  // Verify email configuration
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("✅ Email service is ready to send emails");
      return true;
    } catch (error) {
      console.error("❌ Email service verification failed:", error);
      // Log detailed error information for debugging
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}, Message: ${error.message}`);
        console.error(`SMTP Configuration: Host=${process.env.SMTP_HOST}, Port=${process.env.SMTP_PORT}, User=${process.env.SMTP_USER?.substring(0, 3)}***`);
      }
      return false;
    }
  }

  // Send welcome email with email verification
  async sendWelcomeEmail(email: string, username: string, verificationLink?: string): Promise<void> {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #1a1a1a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #00ff88;">Welcome to Netwin Tournament!</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${username}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Thank you for joining Netwin Tournament! We're excited to have you as part of our gaming community.
          </p>
          
          ${verificationLink ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Please verify your email address:</strong>
            </p>
            <a href="${verificationLink}" style="display: inline-block; background-color: #00ff88; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-top: 10px; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          ` : ""}
          
          <div style="margin: 25px 0;">
            <h3 style="color: #333;">What's Next?</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Complete your profile setup</li>
              <li>Add your gaming credentials</li>
              <li>Join your first tournament</li>
              <li>Connect with other players</li>
            </ul>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #333; margin-top: 0;">Need Help?</h4>
            <p style="color: #666; margin-bottom: 0;">
              If you have any questions, feel free to reach out to our support team at 
              <a href="mailto:support@netwin.com" style="color: #00ff88;">support@netwin.com</a>
            </p>
          </div>
          
          <p style="color: #666; text-align: center; margin-top: 30px;">
            Happy Gaming!<br>
            <strong>The Netwin Tournament Team</strong>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© 2025 Netwin Tournament. All rights reserved.</p>
          <p>This email was sent to ${email}</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: "Welcome to Netwin Tournament! 🎮",
      html: emailContent,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Send email verification
  async sendEmailVerification(email: string, verificationLink: string): Promise<void> {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #1a1a1a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #00ff88;">Verify Your Email</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Email Verification Required</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Please verify your email address to complete your account setup and start using Netwin Tournament.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="display: inline-block; background-color: #00ff88; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 3px; word-break: break-all; font-size: 12px; color: #666;">
            ${verificationLink}
          </p>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Security Note:</strong> This verification link will expire in 24 hours for your security.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© 2025 Netwin Tournament. All rights reserved.</p>
          <p>This email was sent to ${email}</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: "Verify Your Email - Netwin Tournament",
      html: emailContent,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Password Reset Request</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
          
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password for your Netwin Tournament account. If you didn't make this request, you can safely ignore this email.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 3px; word-break: break-all; font-size: 12px; color: #666;">
            ${resetLink}
          </p>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #155724; font-size: 14px;">
              <strong>Security Tips:</strong>
            </p>
            <ul style="color: #155724; font-size: 14px; margin: 10px 0 0 0;">
              <li>This link will expire in 1 hour</li>
              <li>Use a strong, unique password</li>
              <li>Don't share your password with anyone</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© 2025 Netwin Tournament. All rights reserved.</p>
          <p>This email was sent to ${email}</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: "Password Reset - Netwin Tournament",
      html: emailContent,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Send moderator invitation email with dynamic login URL
  async sendModeratorInviteEmail(email: string, permissions: string[], passwordLink?: string, adminUrl?: string): Promise<void> {
    const permissionLabels = {
      manage_users: "Manage Users",
      edit_tournaments: "Edit Tournaments",
      view_reports: "View Reports",
      manage_announcements: "Manage Announcements",
      distribute_prizes: "Distribute Prizes",
      review_kyc: "Review KYC Documents",
    };
    const permissionList = permissions.map((p) => permissionLabels[p as keyof typeof permissionLabels] || p).join(", ");

    // Use provided adminUrl or fallback to environment variable
    const loginUrl = adminUrl || process.env.ADMIN_URL || "http://localhost:3000";

    let passwordSection = "";
    if (passwordLink) {
      passwordSection = `
        <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style=\"color: #856404; margin-top: 0;\">Set Your Password</h3>
          <p style=\"color: #856404;\">Click the button below to set your password and activate your moderator account:</p>
          <div style=\"text-align: center; margin: 20px 0;\">
            <a href=\"${passwordLink}\" style=\"display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px;\">Set Password</a>
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

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: "Moderator Access Granted - Netwin Tournament",
      html: emailContent,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Send tournament notification
  async sendTournamentNotification(email: string, subject: string, message: string): Promise<void> {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #00ff88; color: #1a1a1a; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Tournament Update</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">${subject}</h2>
          
          <div style="color: #666; line-height: 1.6;">
            ${message}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL}" style="display: inline-block; background-color: #00ff88; color: #1a1a1a; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              View Tournaments
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© 2025 Netwin Tournament. All rights reserved.</p>
          <p>This email was sent to ${email}</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: `${subject} - Netwin Tournament`,
      html: emailContent,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // Send OTP verification email
  async sendOtpEmail(email: string, otp: string, purpose: "registration" | "password-reset" = "registration"): Promise<void> {
    const purposeText = purpose === "registration" ? "account registration" : "password reset";
    const titleColor = purpose === "registration" ? "#00ff88" : "#dc3545";

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: ${titleColor}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Email Verification</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
          
          <p style="color: #666; line-height: 1.6;">
            We received a request for ${purposeText} using this email address. Please use the verification code below to complete the process.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f9fa; border: 2px solid ${titleColor}; padding: 20px; border-radius: 8px; display: inline-block;">
              <p style="margin: 0; color: #333; font-size: 14px; font-weight: bold;">Your Verification Code:</p>
              <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: ${titleColor}; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </p>
            </div>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Important:</strong>
            </p>
            <ul style="color: #856404; font-size: 14px; margin: 10px 0 0 0;">
              <li>This code will expire in 5 minutes</li>
              <li>Don't share this code with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            If you have any issues, please contact our support team.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© 2025 Netwin Tournament. All rights reserved.</p>
          <p>This email was sent to ${email}</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: `${otp} - Your Netwin Tournament verification code`,
      html: emailContent,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

// Create singleton instance
export const emailService = new EmailService();

// Legacy exports for backward compatibility
export async function sendModeratorInviteEmail(email: string, permissions: string[], passwordLink?: string, adminUrl?: string): Promise<void> {
  console.log("Sending moderator invite email to:", email);
  console.log("Using EMAIL_FROM_ADDRESS:", process.env.EMAIL_FROM_ADDRESS);
  return emailService.sendModeratorInviteEmail(email, permissions, passwordLink, adminUrl);
}

export async function sendWelcomeEmail(email: string, username: string, verificationLink?: string): Promise<void> {
  return emailService.sendWelcomeEmail(email, username, verificationLink);
}

export async function sendEmailVerification(email: string, verificationLink: string): Promise<void> {
  return emailService.sendEmailVerification(email, verificationLink);
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  return emailService.sendPasswordResetEmail(email, resetLink);
}
