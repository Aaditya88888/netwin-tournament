import { storage } from "../lib/storage.js";
import { appCheckMiddleware } from "../lib/middleware/appcheck.js";
import { authenticateToken, requireAdmin } from "../lib/middleware/auth.js";
const asyncHandler = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((error) => res.status(500).json({ message: error.message || "Internal Server Error" }));
export function registerUserRoutes(app, apiPrefix) {
    // User Routes (moved from routes.ts)
    app.get(`${apiPrefix}/users`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        const users = await storage.getAllUsers();
        res.json(users);
    }));
    app.post(`${apiPrefix}/users/:userId/kyc`, appCheckMiddleware, authenticateToken, asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const authUserId = req.user?.uid;
        if (!authUserId || (authUserId !== userId && req.user?.role !== 'admin')) {
            return res.status(403).json({ message: "You don't have permission to submit KYC for this user" });
        }
        const kycData = {
            userId,
            type: req.body.type,
            documentNumber: req.body.documentNumber,
            frontImageUrl: req.body.frontImageUrl,
            backImageUrl: req.body.backImageUrl || null,
            selfieUrl: req.body.selfieUrl || null,
            status: 'pending',
            submittedAt: new Date(),
            createdAt: new Date()
        };
        const kycDocument = await storage.createKycDocument(kycData);
        await storage.updateUser(userId, { kycStatus: 'pending' });
        res.status(201).json(kycDocument);
    }));
    app.get(`${apiPrefix}/users/stats`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        const allUsers = (await storage.getAllUsers());
        const pendingKyc = (await storage.getPendingKycUsers());
        const countByStatus = (users, status) => users.filter((u) => u.status === status).length;
        const countByKycStatus = (users, status) => users.filter((u) => u.kycStatus === status).length;
        const stats = {
            total: allUsers.length,
            active: countByStatus(allUsers, 'active'),
            inactive: countByStatus(allUsers, 'inactive'),
            banned: countByStatus(allUsers, 'banned'),
            pendingKyc: pendingKyc.length,
            verified: countByKycStatus(allUsers, 'approved'),
            rejected: countByKycStatus(allUsers, 'rejected'),
            newUsersThisMonth: allUsers.filter((u) => {
                const userDate = u.createdAt ? new Date(u.createdAt) : null;
                const now = new Date();
                return userDate && userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
            }).length
        };
        res.json(stats);
    }));
    app.get(`${apiPrefix}/users/search`, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, search = '', status = '', kycStatus = '' } = req.query;
        const allUsers = await storage.getAllUsers();
        let filteredUsers = allUsers.map((user) => ({
            ...user,
            email: user.email || undefined,
            phone: user.phone || undefined,
            profileImage: user.profileImage || undefined,
            fcmToken: null,
            status: user.status || 'active',
            createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(),
            lastLogin: user.lastLogin instanceof Date ? user.lastLogin : undefined
        }));
        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = filteredUsers.filter((user) => {
                const userName = user.name || '';
                const userUsername = user.username || '';
                const userEmail = user.email || '';
                return userName.toLowerCase().includes(searchLower) ||
                    userUsername.toLowerCase().includes(searchLower) ||
                    userEmail.toLowerCase().includes(searchLower);
            });
        }
        if (status) {
            filteredUsers = filteredUsers.filter((user) => user.status === status);
        }
        if (kycStatus) {
            filteredUsers = filteredUsers.filter((user) => user.kycStatus === kycStatus);
        }
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
        res.json({
            users: paginatedUsers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: filteredUsers.length,
                totalPages: Math.ceil(filteredUsers.length / Number(limit))
            }
        });
    }));
    app.get(`${apiPrefix}/users/kyc/pending`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        const users = await storage.getPendingKycUsers();
        res.json(users);
    }));
    app.delete(`${apiPrefix}/users/:userId`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        const { userId } = req.params;
        try {
            const success = await storage.deleteUser(userId);
            if (success) {
                res.json({ success: true, message: "User deleted successfully" });
            }
            else {
                res.status(404).json({ message: "User not found or could not be deleted" });
            }
        }
        catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ message: "Failed to delete user" });
        }
    }));
    app.get(`${apiPrefix}/users/:userId/kyc`, appCheckMiddleware, authenticateToken, asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const authUserId = req.user?.uid;
        if (!authUserId || (authUserId !== userId && req.user?.role !== 'admin')) {
            return res.status(403).json({ message: "You don't have permission to access KYC documents for this user" });
        }
        try {
            const documents = await storage.getKycDocumentsByUserId(userId);
            res.json(documents);
        }
        catch (error) {
            console.error('Error fetching KYC documents:', error);
            res.status(500).json({ message: "Failed to fetch KYC documents" });
        }
    }));
    app.patch(`${apiPrefix}/users/:userId/kyc`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { kycStatus, docId, rejectionReason } = req.body;
        if (!kycStatus) {
            return res.status(400).json({ message: "KYC status is required" });
        }
        try {
            if (docId) {
                await storage.updateKycDocumentStatus(docId, {
                    status: kycStatus,
                    rejectionReason: kycStatus === 'rejected' ? (rejectionReason || 'Document rejected by admin') : undefined,
                    verifiedAt: kycStatus === 'approved' ? new Date() : undefined
                });
            }
            await storage.updateUserKycStatus(userId, kycStatus);
            res.json({ message: "KYC status updated successfully" });
        }
        catch (error) {
            console.error('Error updating KYC status:', error);
            res.status(500).json({ message: "Failed to update KYC status" });
        }
    }));
}
