import { auth } from "./firebase.js";
// Get all users with moderator or admin role
export async function listModerators(req, res) {
    try {
        const list = await auth.listUsers();
        const moderators = list.users.filter(user => {
            const claims = user.customClaims || {};
            return claims.role === "moderator" || claims.role === "admin";
        }).map(user => ({
            uid: user.uid,
            email: user.email,
            role: user.customClaims?.role,
            permissions: user.customClaims?.permissions || [],
        }));
        res.json({ moderators });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to list moderators" });
    }
}
// Remove moderator/admin access (set role to null)
export async function removeModerator(req, res) {
    const { uid } = req.body;
    if (!uid)
        return res.status(400).json({ message: "User ID is required" });
    try {
        await auth.setCustomUserClaims(uid, { role: null, permissions: [] });
        res.json({ success: true, message: "Access removed" });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to remove access" });
    }
}
