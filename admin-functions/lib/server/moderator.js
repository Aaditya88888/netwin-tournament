import { auth } from "./firebase.js";
import { sendModeratorInviteEmail } from "./sendEmail.js";
// POST /moderator/invite
export async function inviteModerator(req, res) {
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
        // Generate password reset link for new users
        let passwordLink = '';
        if (isNewUser) {
            passwordLink = await auth.generatePasswordResetLink(email);
        }
        // Send invite email (include password link if new user)
        try {
            await sendModeratorInviteEmail(email, permissions, passwordLink);
            return res.status(200).json({ success: true, message: "Moderator invited successfully" });
        }
        catch (mailErr) {
            return res.status(200).json({ success: true, message: `Moderator invited, but failed to send email: ${mailErr.message}` });
        }
    }
    catch (error) {
        return res.status(500).json({ message: error.message || "Failed to invite moderator" });
    }
}
