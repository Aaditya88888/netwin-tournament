import { auth } from "./firebase.js";
import { firestore } from "./firebase.js";
// Get all users with moderator or admin role
export async function listModerators(req, res) {
    try {
        // Get from Firestore collection for better data management
        const moderatorDocs = await firestore.collection('moderator_access').get();
        const moderators = [];
        for (const doc of moderatorDocs.docs) {
            const data = doc.data();
            try {
                const user = await auth.getUser(doc.id);
                moderators.push({
                    uid: user.uid,
                    email: user.email,
                    role: data.role || user.customClaims?.role,
                    permissions: data.permissions || user.customClaims?.permissions || [],
                    createdAt: user.metadata?.creationTime || null,
                    lastSignIn: user.metadata?.lastSignInTime || null,
                    disabled: user.disabled || false,
                    invitedAt: data.invitedAt?.toDate?.() || null,
                    invitedBy: data.invitedBy || null,
                    status: data.status || 'active'
                });
            }
            catch (userError) {
                // User might be deleted from Auth but still in Firestore
                console.warn(`User ${doc.id} not found in Auth:`, userError);
            }
        }
        res.json({ moderators });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to list moderators" });
    }
}
// Update moderator permissions
export async function updateModeratorPermissions(req, res) {
    const { uid, permissions } = req.body;
    if (!uid)
        return res.status(400).json({ message: "User ID is required" });
    if (!Array.isArray(permissions))
        return res.status(400).json({ message: "Permissions must be an array" });
    const ALLOWED_PERMISSIONS = [
        "manage_users",
        "edit_tournaments",
        "view_reports",
        "manage_announcements",
        "distribute_prizes",
        "review_kyc"
    ];
    const filteredPermissions = permissions.filter((p) => ALLOWED_PERMISSIONS.includes(p));
    try {
        // Get current user claims
        const user = await auth.getUser(uid);
        const currentClaims = user.customClaims || {};
        // Update Auth claims
        await auth.setCustomUserClaims(uid, {
            ...currentClaims,
            permissions: filteredPermissions
        });
        // Update Firestore collection
        await firestore.collection('moderator_access').doc(uid).update({
            permissions: filteredPermissions,
            updatedAt: new Date()
        });
        res.json({ success: true, message: "Permissions updated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to update permissions" });
    }
}
// Remove moderator/admin access (set role to null)
export async function removeModerator(req, res) {
    const { uid } = req.body;
    if (!uid)
        return res.status(400).json({ message: "User ID is required" });
    try {
        // Remove from Auth claims
        await auth.setCustomUserClaims(uid, { role: null, permissions: [] });
        // Remove from Firestore collection
        await firestore.collection('moderator_access').doc(uid).delete();
        res.json({ success: true, message: "Access removed" });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to remove access" });
    }
}
// Toggle moderator status (enable/disable)
export async function toggleModeratorStatus(req, res) {
    const { uid, disabled } = req.body;
    if (!uid)
        return res.status(400).json({ message: "User ID is required" });
    if (typeof disabled !== 'boolean')
        return res.status(400).json({ message: "Disabled status must be a boolean" });
    try {
        await auth.updateUser(uid, { disabled });
        res.json({ success: true, message: `Moderator ${disabled ? 'disabled' : 'enabled'} successfully` });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to update moderator status" });
    }
}
