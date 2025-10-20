import { auth } from "./firebase.js";
import { sendModeratorInviteEmail } from "./lib/sendEmail.js";
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
        // Find user by email
        const user = await auth.getUserByEmail(email);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Set custom claim
        await auth.setCustomUserClaims(user.uid, { role: "moderator", permissions: filteredPermissions });
        // Send invite email
        try {
            const authReq = req;
            await sendModeratorInviteEmail({
                to: email,
                invitedBy: authReq.user?.username || "Netwin Admin",
                permissions: filteredPermissions,
            });
        }
        catch (mailErr) {
            return res.status(200).json({ success: true, message: `Moderator invited, but failed to send email: ${mailErr.message}` });
        }
        return res.json({ success: true, message: manual ? `Manual access granted to ${email}` : `Moderator invite processed and email sent to ${email}` });
    }
    catch (error) {
        return res.status(500).json({ message: error.message || "Failed to invite moderator" });
    }
}
