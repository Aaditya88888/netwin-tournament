import { storage } from "./storage.js";
import { firestore } from './firebase.js';
import { EmailService } from './sendEmail.js';
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { authenticateToken, requirePermission } from './middleware/auth.js';
import { inviteModerator } from "./moderator.js";
import { listModerators, removeModerator } from "./moderator-management.js";
// Use the initialized Firestore instance
const db = firestore;
import { appCheckMiddleware } from './middleware/appcheck.js';
console.log("registerRoutes called");
export function registerRoutes(app) {
    // Check if running in Cloud Functions environment
    const isCloudFunction = !!(process.env.FUNCTION_TARGET ||
        process.env.FUNCTIONS_EMULATOR ||
        process.env.GCP_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.K_SERVICE ||
        process.env.GCLOUD_PROJECT ||
        process.env.FIREBASE_CONFIG);
    // Use /api prefix only when NOT running in Cloud Functions
    const apiPrefix = isCloudFunction ? "" : "/api";
    // Helper function to register routes with conditional /api prefix
    const registerRoute = (method, path, ...handlers) => {
        const fullPath = `${apiPrefix}${path}`;
        app[method](fullPath, ...handlers);
        // In Cloud Functions, also register with /api prefix AND without any prefix
        if (isCloudFunction) {
            // Register with /api prefix (for Firebase Hosting rewrites)
            const apiPath = `/api${path}`;
            app[method](apiPath, ...handlers);
            // Register without any prefix (direct Cloud Function calls)
            if (path !== '/') {
                app[method](path, ...handlers);
            }
        }
    };
    // Helper function to handle errors
    const handleError = (res, error) => {
        console.error('API Error:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: "Validation error",
                errors: fromZodError(error).message
            });
        }
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
        return res.status(500).json({ message: "An unknown error occurred" });
    };
    // Helper function to calculate tournament points
    const calculatePoints = (kills, position) => {
        let points = 0;
        // Points for kills (1 point per kill)
        points += kills;
        // Points for placement
        if (position === 1)
            points += 10; // Winner gets 10 points
        else if (position === 2)
            points += 6; // Second place gets 6 points
        else if (position === 3)
            points += 4; // Third place gets 4 points
        else if (position && position <= 10)
            points += 2; // Top 10 gets 2 points
        return points;
    };
    // Middleware to handle async routes
    const asyncHandler = (fn) => (req, res) => {
        Promise.resolve(fn(req, res)).catch(error => handleError(res, error));
    };
    // Debug route to list all registered routes
    registerRoute('get', '/debug/routes', (req, res) => {
        const routes = [];
        // Extract routes from Express app
        function extractRoutes(app) {
            if (!app._router || !app._router.stack)
                return [];
            app._router.stack.forEach((middleware) => {
                if (middleware.route) {
                    // This is a route directly on the app
                    const path = middleware.route.path;
                    const methods = Object.keys(middleware.route.methods)
                        .filter((method) => middleware.route.methods[method])
                        .map((method) => method.toUpperCase());
                    routes.push({ path, methods });
                }
                else if (middleware.name === 'router' && middleware.handle.stack) {
                    // This is a router middleware
                    middleware.handle.stack.forEach((handler) => {
                        if (handler.route) {
                            const path = handler.route.path;
                            const methods = Object.keys(handler.route.methods)
                                .filter((method) => handler.route.methods[method])
                                .map((method) => method.toUpperCase());
                            routes.push({ path: path, methods });
                        }
                    });
                }
            });
        }
        extractRoutes(app);
        // Sort routes by path for easier reading
        routes.sort((a, b) => a.path.localeCompare(b.path));
        res.json({
            prefix: apiPrefix,
            routes,
            routesCount: routes.length,
            isCloudFunction
        });
    });
    // Root health check route
    registerRoute('get', '/', asyncHandler(async (req, res) => {
        res.json({
            success: true,
            message: 'Netwin Tournament Admin API',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'production',
            isCloudFunction
        });
    }));
    // Auth Routes
    // Health check route
    registerRoute('get', '/health', asyncHandler(async (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    }));
    // Simple test route
    registerRoute('get', '/test', asyncHandler(async (req, res) => {
        res.json({ message: 'API is working!' });
    }));
    // Debug endpoint to check users and KYC data (no auth required for testing)
    registerRoute('get', '/debug/users-kyc', asyncHandler(async (req, res) => {
        try {
            const allUsers = await storage.getAllUsers();
            const usersWithKyc = allUsers.filter(user => user.kycStatus && user.kycStatus !== 'not_submitted');
            const kycStats = {
                totalUsers: allUsers.length,
                usersWithKyc: usersWithKyc.length,
                kycStatuses: {
                    pending: allUsers.filter(u => u.kycStatus === 'pending').length,
                    approved: allUsers.filter(u => u.kycStatus === 'approved').length,
                    rejected: allUsers.filter(u => u.kycStatus === 'rejected').length,
                    verified: allUsers.filter(u => u.kycStatus === 'verified').length,
                    not_submitted: allUsers.filter(u => !u.kycStatus || u.kycStatus === 'not_submitted').length
                }
            };
            const sampleUsers = usersWithKyc.slice(0, 3).map(user => ({
                id: user.id || user.uid,
                name: user.name || user.displayName || user.username,
                email: user.email,
                kycStatus: user.kycStatus,
                kycDocuments: user.kycDocuments,
                createdAt: user.createdAt
            }));
            res.json({
                success: true,
                stats: kycStats,
                sampleUsers: sampleUsers
            });
        }
        catch (error) {
            console.error('Debug endpoint error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }));
    // Debug version of admin/kyc endpoint (no auth required for testing)
    registerRoute('get', '/debug/admin-kyc', asyncHandler(async (req, res) => {
        const { status, search, sortBy = 'kycSubmittedAt', sortOrder = 'desc', page = 1, limit = 50 } = req.query;
        try {
            // Get all users
            const allUsers = (await storage.getAllUsers());
            // Filter users to only include those with KYC information
            let kycUsers = allUsers.filter(user => user.kycStatus && user.kycStatus !== 'not_submitted');
            // Apply status filter
            if (status && status !== 'all') {
                kycUsers = kycUsers.filter(user => user.kycStatus === status);
            }
            // Apply search filter
            if (search) {
                const searchLower = search.toLowerCase();
                kycUsers = kycUsers.filter(user => user.name?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower) ||
                    user.username?.toLowerCase().includes(searchLower) ||
                    user.phoneNumber?.toLowerCase().includes(searchLower));
            }
            // Sort users
            if (sortBy && sortOrder) {
                kycUsers.sort((a, b) => {
                    let aValue = a[sortBy];
                    let bValue = b[sortBy];
                    // Handle date fields
                    if (sortBy === 'kycSubmittedAt' || sortBy === 'createdAt' || sortBy === 'lastLogin') {
                        aValue = aValue ? new Date(aValue).getTime() : 0;
                        bValue = bValue ? new Date(bValue).getTime() : 0;
                    }
                    if (sortOrder === 'desc') {
                        return bValue > aValue ? 1 : -1;
                    }
                    else {
                        return aValue > bValue ? 1 : -1;
                    }
                });
            }
            // Apply pagination
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const paginatedUsers = kycUsers.slice(startIndex, endIndex);
            // Transform users to match frontend interface
            const formattedUsers = paginatedUsers.map(user => {
                // Helper function to safely convert date to ISO string
                const safeToISOString = (dateValue) => {
                    if (!dateValue)
                        return null;
                    try {
                        const date = new Date(dateValue);
                        if (isNaN(date.getTime()))
                            return null;
                        return date.toISOString();
                    }
                    catch (error) {
                        return null;
                    }
                };
                return {
                    id: user.id || user.uid,
                    name: user.name || user.displayName || user.username || 'Unknown',
                    email: user.email || '',
                    phone: user.phoneNumber || '',
                    walletBalance: user.walletBalance || 0,
                    kycStatus: user.kycStatus || 'not_submitted',
                    kycDocuments: user.kycDocuments || null,
                    kycSubmittedAt: safeToISOString(user.createdAt), // Assuming this is when KYC was submitted
                    kycVerifiedAt: user.kycStatus === 'verified' ? safeToISOString(user.createdAt) : null,
                    kycRejectedAt: user.kycStatus === 'rejected' ? safeToISOString(user.createdAt) : null,
                    kycRejectionReason: null, // TODO: Add this field to schema if needed
                    verificationNotes: null, // TODO: Add this field to schema if needed
                    riskScore: 0, // TODO: Calculate risk score
                    status: user.status === 'banned' ? 'banned' : (user.status || 'active'),
                    location: user.location || '',
                    createdAt: safeToISOString(user.createdAt) || new Date().toISOString(),
                    updatedAt: safeToISOString(user.createdAt) || new Date().toISOString(),
                    lastLogin: safeToISOString(user.lastLogin),
                    avatar: user.profileImage || null
                };
            });
            res.json({
                users: formattedUsers,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(kycUsers.length / limitNum),
                    totalCount: kycUsers.length,
                    hasNext: endIndex < kycUsers.length,
                    hasPrev: pageNum > 1
                }
            });
        }
        catch (error) {
            console.error('Error fetching KYC users:', error);
            res.status(500).json({ message: "Failed to fetch KYC users" });
        }
    }));
    // User Routes
    registerRoute('get', '/users', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), asyncHandler(async (req, res) => {
        const users = await storage.getAllUsers();
        res.json(users);
    }));
    // KYC Document Submission Endpoint
    registerRoute('post', '/users/:userId/kyc', appCheckMiddleware, authenticateToken, asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const authUserId = req.user?.uid;
        // Verify the authenticated user is either an admin or the owner of this KYC document
        if (!authUserId || (authUserId !== userId && req.user?.role !== 'admin')) {
            return res.status(403).json({ message: "You don't have permission to submit KYC for this user" });
        }
        // Validate input data
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
        // Store KYC document
        const kycDocument = await storage.createKycDocument(kycData);
        // Update user's KYC status
        await storage.updateUser(userId, { kycStatus: 'pending' });
        res.status(201).json(kycDocument);
    })); // Get user statistics for dashboard
    // Admin User Stats (for dashboard)
    // Register both /api/admin/users/stats and /admin/users/stats for compatibility
    const adminUserStatsHandler = asyncHandler(async (req, res) => {
        const allUsers = (await storage.getAllUsers());
        const pendingKyc = (await storage.getPendingKycUsers());
        // Helper function to safely count users by status
        const countByStatus = (users, status) => users.filter(u => u.status === status).length;
        // Helper function to safely count users by KYC status
        const countByKycStatus = (users, status) => users.filter(u => u.kycStatus === status).length;
        // Calculate balances
        const balances = allUsers.map(u => typeof u.walletBalance === 'number' ? u.walletBalance : 0);
        const totalBalance = balances.reduce((sum, b) => sum + b, 0);
        const averageBalance = balances.length > 0 ? totalBalance / balances.length : 0;
        // Calculate new users this week
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const newUsersThisWeek = allUsers.filter(u => {
            const userDate = u.createdAt ? new Date(u.createdAt) : null;
            return userDate && userDate >= startOfWeek && userDate <= now;
        }).length;
        const stats = {
            totalUsers: allUsers.length,
            activeUsers: countByStatus(allUsers, 'active'),
            newUsersThisWeek,
            newUsersThisMonth: allUsers.filter(u => {
                const userDate = u.createdAt ? new Date(u.createdAt) : null;
                return userDate && userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
            }).length,
            verifiedUsers: countByKycStatus(allUsers, 'approved'),
            suspendedUsers: countByStatus(allUsers, 'inactive'),
            bannedUsers: countByStatus(allUsers, 'banned'),
            averageBalance,
            totalBalance,
            kycPendingCount: pendingKyc.length
        };
        res.json(stats);
    });
    registerRoute('get', '/users/stats', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), adminUserStatsHandler);
    registerRoute('get', '/api/admin/users/stats', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), adminUserStatsHandler);
    // Bulk User Actions (delete, ban, etc)
    registerRoute('post', '/api/admin/users/bulk', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), asyncHandler(async (req, res) => {
        const { action, userIds, value } = req.body;
        if (!action || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'Action and userIds are required' });
        }
        try {
            const result = await storage.bulkUserAction(action, userIds, value);
            res.json({ success: true, result });
        }
        catch (error) {
            console.error('Bulk user action error:', error);
            res.status(500).json({ message: 'Bulk user action failed' });
        }
    }));
    registerRoute('get', '/admin/users/stats', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), adminUserStatsHandler);
    // Get users with pagination and filtering
    registerRoute('get', '/users/search', authenticateToken, requirePermission('manage_users'), asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, search = '', status = '', kycStatus = '' } = req.query;
        const allUsers = await storage.getAllUsers();
        let filteredUsers = allUsers.map(user => ({
            ...user,
            email: user.email || undefined,
            phone: user.phone || undefined,
            profileImage: user.profileImage || undefined,
            fcmToken: null, // Will be populated when FCM is implemented
            status: user.status || 'active',
            createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(),
            lastLogin: user.lastLogin instanceof Date ? user.lastLogin : undefined
        }));
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = filteredUsers.filter(user => {
                const userName = user.name || '';
                const userUsername = user.username || '';
                const userEmail = user.email || '';
                return userName.toLowerCase().includes(searchLower) ||
                    userUsername.toLowerCase().includes(searchLower) ||
                    userEmail.toLowerCase().includes(searchLower);
            });
        }
        // Apply status filter
        if (status) {
            filteredUsers = filteredUsers.filter(user => user.status === status);
        }
        // Apply KYC status filter
        if (kycStatus) {
            filteredUsers = filteredUsers.filter(user => user.kycStatus === kycStatus);
        }
        // Pagination
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
    registerRoute('get', '/users/kyc/pending', appCheckMiddleware, authenticateToken, requirePermission('review_kyc'), asyncHandler(async (req, res) => {
        const users = await storage.getPendingKycUsers();
        res.json(users);
    }));
    // Delete a user by ID
    registerRoute('delete', '/users/:userId', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), asyncHandler(async (req, res) => {
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
    // Get KYC documents for a specific user
    registerRoute('get', '/users/:userId/kyc', appCheckMiddleware, authenticateToken, asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const authUserId = req.user?.uid;
        // Verify the authenticated user is either an admin or the owner of this KYC document
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
    // Update KYC status for a specific user
    // Update KYC status for a user (APPROVED/REJECTED)
    registerRoute('patch', '/users/:userId/kyc', appCheckMiddleware, authenticateToken, requirePermission('review_kyc'), asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { kycStatus, docId, rejectionReason } = req.body;
        console.log(`KYC status update request for user ${userId}:`, { kycStatus, docId, rejectionReason });
        console.log(`Request body:`, req.body);
        if (!kycStatus) {
            return res.status(400).json({ message: "KYC status is required" });
        }
        try {
            // Update the KYC document's status
            if (docId) {
                await storage.updateKycDocumentStatus(docId, {
                    status: kycStatus,
                    rejectionReason: kycStatus.toLowerCase() === 'rejected' ? (rejectionReason || 'Document rejected by admin') : undefined,
                    verifiedAt: kycStatus.toLowerCase() === 'approved' ? new Date() : undefined
                });
            }
            // Update the user's KYC status
            await storage.updateUserKycStatus(userId, kycStatus);
            console.log(`Successfully updated KYC status for user ${userId} to ${kycStatus}`);
            res.json({ message: "KYC status updated successfully" });
        }
        catch (error) {
            console.error('Error updating KYC status:', error);
            res.status(500).json({ message: "Failed to update KYC status" });
        }
    }));
    // Get all users with KYC information for admin review
    registerRoute('get', '/admin/kyc', appCheckMiddleware, authenticateToken, requirePermission('review_kyc'), asyncHandler(async (req, res) => {
        const { status, search, sortBy = 'kycSubmittedAt', sortOrder = 'desc', page = 1, limit = 50 } = req.query;
        try {
            // Get all users AND all KYC documents
            const [allUsers, allKycDocuments] = await Promise.all([
                storage.getAllUsers(),
                storage.getAllKycDocuments()
            ]);
            // Create a map of userId to KYC documents
            const kycDocumentsByUser = new Map();
            allKycDocuments.forEach(doc => {
                if (!kycDocumentsByUser.has(doc.userId)) {
                    kycDocumentsByUser.set(doc.userId, []);
                }
                kycDocumentsByUser.get(doc.userId).push(doc);
            });
            // Filter users to ONLY include those with actual KYC documents submitted
            let kycUsers = allUsers.filter(user => {
                const hasKycDocuments = kycDocumentsByUser.has(user.id || user.uid);
                return hasKycDocuments; // Only show users who have actually submitted KYC documents
            });
            // Apply status filter (handle both uppercase and lowercase)
            if (status && status !== 'all') {
                const statusStr = typeof status === 'string' ? status : String(status);
                kycUsers = kycUsers.filter((user) => {
                    const userKycDocs = kycDocumentsByUser.get(user.id || user.uid) || [];
                    const latestKycDoc = userKycDocs.sort((a, b) => {
                        const aTime = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime();
                        const bTime = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime();
                        return bTime - aTime;
                    })[0];
                    const docStatus = latestKycDoc?.status?.toLowerCase() || user.kycStatus?.toLowerCase();
                    return docStatus === statusStr.toLowerCase();
                });
            }
            // Apply search filter
            if (search) {
                const searchLower = search.toLowerCase();
                kycUsers = kycUsers.filter(user => user.name?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower) ||
                    user.username?.toLowerCase().includes(searchLower) ||
                    user.phoneNumber?.toLowerCase().includes(searchLower));
            }
            // Sort users
            if (sortBy && sortOrder) {
                kycUsers.sort((a, b) => {
                    let aValue = a[sortBy];
                    let bValue = b[sortBy];
                    // Handle date fields
                    if (sortBy === 'kycSubmittedAt' || sortBy === 'createdAt' || sortBy === 'lastLogin') {
                        aValue = aValue ? new Date(aValue).getTime() : 0;
                        bValue = bValue ? new Date(bValue).getTime() : 0;
                    }
                    if (sortOrder === 'desc') {
                        return bValue > aValue ? 1 : -1;
                    }
                    else {
                        return aValue > bValue ? 1 : -1;
                    }
                });
            }
            // Apply pagination
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const paginatedUsers = kycUsers.slice(startIndex, endIndex);
            // Transform users to match frontend interface
            const formattedUsers = paginatedUsers.map(user => {
                // Helper function to safely convert date to ISO string
                const safeToISOString = (dateValue) => {
                    if (!dateValue)
                        return null;
                    try {
                        const date = new Date(dateValue);
                        if (isNaN(date.getTime()))
                            return null;
                        return date.toISOString();
                    }
                    catch (error) {
                        return null;
                    }
                };
                // Get KYC documents for this user
                const userKycDocs = kycDocumentsByUser.get(user.id || user.uid) || [];
                const latestKycDoc = userKycDocs.sort((a, b) => {
                    const aTime = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime();
                    const bTime = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime();
                    return bTime - aTime;
                })[0];
                return {
                    id: user.id || user.uid,
                    name: user.name || user.displayName || user.username || 'Unknown',
                    email: user.email || '',
                    phone: user.phoneNumber || '',
                    walletBalance: user.walletBalance || 0,
                    kycStatus: latestKycDoc?.status?.toLowerCase() || user.kycStatus || 'not_submitted',
                    kycDocuments: latestKycDoc ? {
                        docId: latestKycDoc.id, // Include the document ID
                        idProof: latestKycDoc.frontImageUrl ? {
                            url: latestKycDoc.frontImageUrl,
                            fileName: `front_${latestKycDoc.documentType || 'id'}.jpg`,
                            uploadedAt: safeToISOString(typeof latestKycDoc.createdAt === 'number' ? new Date(latestKycDoc.createdAt) : latestKycDoc.createdAt),
                            docId: latestKycDoc.id
                        } : null,
                        addressProof: latestKycDoc.backImageUrl ? {
                            url: latestKycDoc.backImageUrl,
                            fileName: `back_${latestKycDoc.documentType || 'id'}.jpg`,
                            uploadedAt: safeToISOString(typeof latestKycDoc.createdAt === 'number' ? new Date(latestKycDoc.createdAt) : latestKycDoc.createdAt),
                            docId: latestKycDoc.id
                        } : null,
                        selfie: latestKycDoc.selfieUrl ? {
                            url: latestKycDoc.selfieUrl,
                            fileName: 'selfie.jpg',
                            uploadedAt: safeToISOString(typeof latestKycDoc.createdAt === 'number' ? new Date(latestKycDoc.createdAt) : latestKycDoc.createdAt),
                            docId: latestKycDoc.id
                        } : null
                    } : (user.kycDocuments || null),
                    kycSubmittedAt: safeToISOString(typeof latestKycDoc?.createdAt === 'number' ? new Date(latestKycDoc.createdAt) : (latestKycDoc?.createdAt || user.createdAt)),
                    kycVerifiedAt: latestKycDoc?.verifiedAt ? safeToISOString(typeof latestKycDoc.verifiedAt === 'number' ? new Date(latestKycDoc.verifiedAt) : latestKycDoc.verifiedAt) : null,
                    kycRejectedAt: latestKycDoc?.status?.toLowerCase() === 'rejected' ? safeToISOString(typeof latestKycDoc.updatedAt === 'number' ? new Date(latestKycDoc.updatedAt) : (latestKycDoc.updatedAt || latestKycDoc.createdAt)) : null,
                    kycRejectionReason: latestKycDoc?.rejectionReason || null,
                    verificationNotes: latestKycDoc?.notes || null,
                    riskScore: 0, // TODO: Calculate risk score
                    status: user.status === 'banned' ? 'banned' : (user.status || 'active'),
                    location: user.location || '',
                    createdAt: safeToISOString(user.createdAt) || new Date().toISOString(),
                    updatedAt: safeToISOString(user.createdAt) || new Date().toISOString(),
                    lastLogin: safeToISOString(user.lastLogin),
                    avatar: user.profileImage || null
                };
            });
            // Return in the format expected by frontend: {users: [...], pagination: {...}}
            res.json({
                users: formattedUsers,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(kycUsers.length / limitNum),
                    totalCount: kycUsers.length,
                    hasNext: endIndex < kycUsers.length,
                    hasPrev: pageNum > 1
                }
            });
        }
        catch (error) {
            console.error('Error fetching KYC users:', error);
            res.status(500).json({ message: "Failed to fetch KYC users" });
        }
    }));
    // Moderator Invite/Manual Access Endpoint
    registerRoute('post', '/moderator/invite', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), asyncHandler(inviteModerator));
    registerRoute('get', '/moderator/list', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), asyncHandler(listModerators));
    registerRoute('post', '/moderator/remove', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), asyncHandler(removeModerator));
    // Individual User Routes
    registerRoute('get', '/users/:id', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        try {
            const user = await storage.getUserByUid(id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json(user);
        }
        catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ message: "Failed to fetch user" });
        }
    }));
    // Update user status
    registerRoute('patch', '/users/:id/status', appCheckMiddleware, authenticateToken, requirePermission('manage_users'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }
        try {
            await storage.updateUser(id, { status });
            res.json({ message: "User status updated successfully" });
        }
        catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({ message: "Failed to update user status" });
        }
    }));
    // Add bonus to user wallet
    registerRoute('post', '/users/:id/add-bonus', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { amount, reason } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Valid bonus amount is required" });
        }
        if (!reason) {
            return res.status(400).json({ message: "Reason is required" });
        }
        try {
            // Get current user
            const user = await storage.getUserByUid(id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            // Update wallet balance
            const newBalance = (user.walletBalance || 0) + amount;
            await storage.updateUser(id, { walletBalance: newBalance });
            // Create transaction record
            await storage.createTransaction({
                userId: id,
                type: 'credit',
                amount: amount,
                description: `Admin Bonus: ${reason}`,
                status: 'completed',
                createdAt: new Date()
            });
            res.json({
                message: "Bonus added successfully",
                newBalance: newBalance
            });
        }
        catch (error) {
            console.error('Error adding bonus:', error);
            res.status(500).json({ message: "Failed to add bonus" });
        }
    }));
    // Get user tournaments
    registerRoute('get', '/users/:id/tournaments', appCheckMiddleware, authenticateToken, requirePermission('edit_tournaments'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        try {
            // For now return empty array - this would need implementation in storage
            const tournaments = [];
            res.json(tournaments);
        }
        catch (error) {
            console.error('Error fetching user tournaments:', error);
            res.status(500).json({ message: "Failed to fetch user tournaments" });
        }
    }));
    // Get user transactions
    registerRoute('get', '/users/:id/transactions', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        try {
            const transactions = await storage.getUserAllTransactions(id);
            res.json(transactions);
        }
        catch (error) {
            console.error('Error fetching user transactions:', error);
            res.status(500).json({ message: "Failed to fetch user transactions" });
        }
    }));
    // Debug endpoint to create test tournament registrations
    registerRoute('post', '/debug/create-test-registrations/:tournamentId', asyncHandler(async (req, res) => {
        try {
            const { tournamentId } = req.params;
            const { count = 5 } = req.body;
            const batch = db.batch();
            const registrations = [];
            for (let i = 1; i <= count; i++) {
                const registrationRef = db.collection('tournament_registrations').doc();
                const registrationData = {
                    tournamentId,
                    userId: `test-user-${i}`,
                    userName: `Test Player ${i}`,
                    teamName: `Team ${i}`,
                    gameId: `PLAYER${i.toString().padStart(3, '0')}`,
                    isTeamLeader: true,
                    paymentStatus: 'completed',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                batch.set(registrationRef, registrationData);
                registrations.push({ id: registrationRef.id, ...registrationData });
            }
            await batch.commit();
            res.json({
                success: true,
                message: `Created ${count} test registrations for tournament ${tournamentId}`,
                registrations
            });
        }
        catch (error) {
            console.error('Error creating test registrations:', error);
            res.status(500).json({ message: 'Failed to create test registrations' });
        }
    }));
    // Debug endpoint to create test tournament results
    registerRoute('post', '/debug/create-test-results/:tournamentId', asyncHandler(async (req, res) => {
        try {
            const { tournamentId } = req.params;
            // Get registrations first
            const registrationsSnapshot = await db.collection('tournament_registrations')
                .where('tournamentId', '==', tournamentId)
                .get();
            if (registrationsSnapshot.empty) {
                return res.status(400).json({ message: 'No registrations found for this tournament' });
            }
            const registrations = registrationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            const batch = db.batch();
            registrations.forEach((reg, index) => {
                // Update the registration with test result data
                const registrationRef = db.collection('tournament_registrations').doc(reg.id);
                const updateData = {
                    position: index === 0 ? 1 : index === 1 ? 2 : null, // First two get positions
                    kills: Math.floor(Math.random() * 10) + 1, // Random kills 1-10
                    resultSubmitted: true,
                    resultVerified: true, // Auto-verify for testing
                    resultImageUrl: 'https://example.com/test-screenshot.jpg', // Test URL
                    updatedAt: new Date()
                };
                batch.update(registrationRef, updateData);
            });
            await batch.commit();
            res.json({
                success: true,
                message: `Created test results for ${registrations.length} players in tournament ${tournamentId}`
            });
        }
        catch (error) {
            console.error('Error creating test results:', error);
            res.status(500).json({ message: 'Failed to create test results' });
        }
    }));
    // Tournament Routes - Protected Admin Routes
    registerRoute('post', '/tournaments', appCheckMiddleware, authenticateToken, requirePermission('edit_tournaments'), asyncHandler(async (req, res) => {
        try {
            // Ensure room credentials are included in the tournament data
            const tournamentData = {
                ...req.body,
                roomId: req.body.roomId || null,
                roomPassword: req.body.roomPassword || null,
                companyCommissionPercentage: req.body.companyCommissionPercentage || 10,
                firstPrizePercentage: req.body.firstPrizePercentage || 60,
                secondPrizePercentage: req.body.secondPrizePercentage || 30,
                perKillRewardPercentage: req.body.perKillRewardPercentage || 10,
                gameMode: req.body.gameMode || 'squad',
                teamSize: req.body.teamSize || 4,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const tournament = await storage.createTournament(tournamentData);
            res.status(201).json(tournament);
        }
        catch (error) {
            console.error('Error creating tournament:', error);
            if (error.name === 'ZodError') {
                res.status(400).json({
                    message: "Validation failed",
                    errors: error.errors,
                    details: error.message
                });
            }
            else {
                res.status(500).json({
                    message: "Failed to create tournament",
                    error: error.message
                });
            }
        }
    }));
    registerRoute('patch', '/tournaments/:id', appCheckMiddleware, authenticateToken, requirePermission('edit_tournaments'), asyncHandler(async (req, res) => {
        const id = req.params.id;
        const tournament = await storage.getTournament(id);
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }
        const updatedTournament = await storage.updateTournament(id, req.body);
        res.json(updatedTournament);
    }));
    registerRoute('delete', '/tournaments/:id', appCheckMiddleware, authenticateToken, requirePermission('edit_tournaments'), asyncHandler(async (req, res) => {
        const id = req.params.id;
        const tournament = await storage.getTournament(id);
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }
        const success = await storage.deleteTournament(id);
        if (success) {
            res.status(204).send();
        }
        else {
            res.status(500).json({ message: "Failed to delete tournament" });
        }
    }));
    // Public Tournament Routes
    registerRoute('get', '/tournaments', asyncHandler(async (req, res) => {
        console.log('API: GET /tournaments called');
        try {
            console.log('Firestore instance:', db ? 'OK' : 'NOT INITIALIZED');
            const tournaments = await storage.getAllTournaments();
            if (!tournaments || tournaments.length === 0) {
                console.log('No tournaments found or Firestore returned empty array.');
            }
            else {
                console.log('Tournaments found:', tournaments.length);
            }
            res.json(tournaments);
        }
        catch (error) {
            console.error('Error in /tournaments:', error);
            res.status(500).json({ message: error.message || 'Failed to fetch tournaments', error: error.message });
        }
    }));
    registerRoute('get', '/tournaments/upcoming', asyncHandler(async (req, res) => {
        const tournaments = await storage.getUpcomingTournaments();
        res.json(tournaments);
    }));
    registerRoute('get', '/tournaments/active', asyncHandler(async (req, res) => {
        const tournaments = await storage.getActiveTournaments();
        res.json(tournaments);
    }));
    registerRoute('get', '/tournaments/completed', asyncHandler(async (req, res) => {
        const tournaments = await storage.getCompletedTournaments();
        res.json(tournaments);
    }));
    registerRoute('get', '/tournaments/:id', asyncHandler(async (req, res) => {
        const id = req.params.id;
        const tournament = await storage.getTournament(id);
        if (!tournament) {
            return res.status(404).json({ message: "Tournament not found" });
        }
        res.json({ data: tournament });
    }));
    // Tournament Result Submission Endpoint
    registerRoute('post', '/tournaments/:id/submit-result', appCheckMiddleware, authenticateToken, asyncHandler(async (req, res) => {
        try {
            const { id: tournamentId } = req.params;
            const { screenshot, kills, position } = req.body;
            const userId = req.user?.uid;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            if (!screenshot) {
                return res.status(400).json({ message: 'Screenshot is required' });
            }
            // Find the tournament registration
            const registrationsSnapshot = await db.collection('tournament_registrations')
                .where('userId', '==', userId)
                .where('tournamentId', '==', tournamentId)
                .get();
            if (registrationsSnapshot.empty) {
                return res.status(404).json({ message: 'Tournament registration not found' });
            }
            const registrationDoc = registrationsSnapshot.docs[0];
            const registrationData = registrationDoc.data();
            // Update the tournament registration with result data
            await registrationDoc.ref.update({
                resultImageUrl: screenshot,
                kills: kills || 0,
                position: position || null,
                points: calculatePoints(kills || 0, position),
                resultSubmitted: true,
                resultSubmittedAt: new Date(),
                resultVerified: false, // Will be verified by admin
                updatedAt: new Date()
            });
            res.json({
                success: true,
                message: 'Tournament result submitted successfully',
                data: {
                    tournamentId,
                    userId,
                    kills: kills || 0,
                    position: position || null,
                    resultImageUrl: screenshot
                }
            });
        }
        catch (error) {
            console.error('Error submitting tournament result:', error);
            res.status(500).json({ message: 'Failed to submit tournament result' });
        }
    }));
    // Get Tournament Registrations with Results (Admin only)
    registerRoute('get', '/tournaments/:id/registrations', appCheckMiddleware, authenticateToken, requirePermission('edit_tournaments'), asyncHandler(async (req, res) => {
        try {
            const { id: tournamentId } = req.params;
            const registrationsSnapshot = await db.collection('tournament_registrations')
                .where('tournamentId', '==', tournamentId)
                .get();
            const registrations = registrationsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                registrationId: doc.id // Ensure we have the registration ID
            }));
            res.json({
                success: true,
                data: registrations,
                count: registrations.length
            });
        }
        catch (error) {
            console.error('Error fetching tournament registrations:', error);
            res.status(500).json({ message: 'Failed to fetch tournament registrations' });
        }
    }));
    // Get Tournament Results Management - Shows ALL registered users regardless of result submission
    registerRoute('get', '/tournaments/:id/results-management', appCheckMiddleware, authenticateToken, requirePermission('edit_tournaments'), asyncHandler(async (req, res) => {
        try {
            const { id: tournamentId } = req.params;
            // Get tournament info
            const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
            if (!tournamentDoc.exists) {
                return res.status(404).json({ message: 'Tournament not found' });
            }
            const tournament = { id: tournamentDoc.id, ...tournamentDoc.data() };
            // Get ALL registrations for this tournament
            const registrationsSnapshot = await db.collection('tournament_registrations')
                .where('tournamentId', '==', tournamentId)
                .get();
            // Get all users data
            const usersSnapshot = await db.collection('users').get();
            const usersMap = new Map();
            usersSnapshot.docs.forEach((doc) => {
                const userData = doc.data();
                usersMap.set(doc.id, userData);
                // Also try to match by UID if it exists
                if (userData.uid && userData.uid !== doc.id) {
                    usersMap.set(userData.uid, userData);
                }
            });
            // Map all registrations to player objects, whether they submitted results or not
            const players = registrationsSnapshot.docs.map((doc) => {
                const registration = doc.data();
                const user = usersMap.get(registration.userId) || {};
                return {
                    id: doc.id,
                    userId: registration.userId,
                    username: user.username || user.name || user.displayName || registration.userName || 'Unknown Player',
                    email: user.email || registration.userEmail || 'No email',
                    teamName: registration.teamName || 'Solo',
                    registrationId: doc.id,
                    kills: registration.kills || 0,
                    position: registration.position || null,
                    screenshot: registration.resultImageUrl || null,
                    resultSubmitted: !!registration.resultSubmitted,
                    resultVerified: !!registration.resultVerified,
                    points: registration.points || 0,
                    resultSubmittedAt: registration.resultSubmittedAt || null,
                    // These will be calculated in the frontend based on tournament settings
                    killReward: 0,
                    placementReward: 0,
                    totalReward: 0,
                    rewardDistributed: !!registration.rewardDistributed,
                    // Additional user info
                    profileImage: user.profileImage || null,
                    walletBalance: user.walletBalance || 0
                };
            });
            res.json({
                success: true,
                tournament: tournament,
                players: players,
                totalPlayers: players.length,
                playersWithResults: players.filter((p) => p.resultSubmitted).length
            });
        }
        catch (error) {
            console.error('Error fetching tournament results management:', error);
            res.status(500).json({ message: 'Failed to fetch tournament results management' });
        }
    }));
    // Debug endpoint to check raw wallet data
    registerRoute('get', '/debug/wallet-data', asyncHandler(async (req, res) => {
        try {
            const depositsSnapshot = await db.collection('pending_deposits').get();
            const withdrawalsSnapshot = await db.collection('pending_withdrawals').get();
            const deposits = depositsSnapshot.docs.map((doc) => ({
                id: doc.id,
                status: doc.data().status,
                amount: doc.data().amount,
                createdAt: doc.data().createdAt
            }));
            const withdrawals = withdrawalsSnapshot.docs.map((doc) => ({
                id: doc.id,
                status: doc.data().status,
                amount: doc.data().amount,
                createdAt: doc.data().createdAt
            }));
            res.json({
                depositsCount: deposits.length,
                withdrawalsCount: withdrawals.length,
                depositStatuses: deposits.map((d) => d.status),
                withdrawalStatuses: withdrawals.map((w) => w.status),
                pendingDeposits: deposits.filter((d) => d.status === 'PENDING'),
                approvedDeposits: deposits.filter((d) => d.status === 'APPROVED'),
                rejectedDeposits: deposits.filter((d) => d.status === 'REJECTED'),
                deposits: deposits,
                withdrawals: withdrawals
            });
        }
        catch (error) {
            console.error('Error fetching wallet debug data:', error);
            res.status(500).json({ message: 'Failed to fetch wallet debug data' });
        }
    }));
    // Get all deposits (pending, approved, rejected)
    registerRoute('get', '/wallet/deposits', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        try {
            const snapshot = await db.collection('pending_deposits')
                .orderBy('createdAt', 'desc')
                .get();
            const deposits = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
                updatedAt: doc.data().updatedAt?.toDate?.() || (doc.data().updatedAt ? new Date(doc.data().updatedAt) : null),
                verifiedAt: doc.data().verifiedAt?.toDate?.() || (doc.data().verifiedAt ? new Date(doc.data().verifiedAt) : null)
            }));
            res.json(deposits);
        }
        catch (error) {
            console.error('Error fetching deposits:', error);
            res.status(500).json({ message: 'Failed to fetch deposits' });
        }
    }));
    // Get all withdrawals (pending, approved, rejected)
    registerRoute('get', '/wallet/withdrawals', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        try {
            const snapshot = await db.collection('pending_withdrawals')
                .orderBy('createdAt', 'desc')
                .get();
            const withdrawals = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
                updatedAt: doc.data().updatedAt?.toDate?.() || (doc.data().updatedAt ? new Date(doc.data().updatedAt) : null),
                verifiedAt: doc.data().verifiedAt?.toDate?.() || (doc.data().verifiedAt ? new Date(doc.data().verifiedAt) : null)
            }));
            res.json(withdrawals);
        }
        catch (error) {
            console.error('Error fetching withdrawals:', error);
            res.status(500).json({ message: 'Failed to fetch withdrawals' });
        }
    }));
    // Get all transactions (deposits and withdrawals combined)
    registerRoute('get', '/wallet/transactions', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        try {
            const { page = 1, limit = 50, type, status, userId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
            // Get both deposits and withdrawals from their respective collections
            const [depositsSnapshot, withdrawalsSnapshot, transactionsSnapshot] = await Promise.all([
                db.collection('pending_deposits').get(),
                db.collection('pending_withdrawals').get(),
                db.collection('transactions').get()
            ]);
            // Process deposits
            const deposits = depositsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                type: 'deposit',
                source: 'pending_deposits',
                createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
                updatedAt: doc.data().updatedAt?.toDate?.() || (doc.data().updatedAt ? new Date(doc.data().updatedAt) : null),
                verifiedAt: doc.data().verifiedAt?.toDate?.() || (doc.data().verifiedAt ? new Date(doc.data().verifiedAt) : null)
            }));
            // Process withdrawals
            const withdrawals = withdrawalsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                type: 'withdrawal',
                source: 'pending_withdrawals',
                createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
                updatedAt: doc.data().updatedAt?.toDate?.() || (doc.data().updatedAt ? new Date(doc.data().updatedAt) : null),
                verifiedAt: doc.data().verifiedAt?.toDate?.() || (doc.data().verifiedAt ? new Date(doc.data().verifiedAt) : null)
            }));
            // Process transactions from transactions collection
            const transactions = transactionsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                source: 'transactions',
                createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
                updatedAt: doc.data().updatedAt?.toDate?.() || (doc.data().updatedAt ? new Date(doc.data().updatedAt) : null),
                verifiedAt: doc.data().verifiedAt?.toDate?.() || (doc.data().verifiedAt ? new Date(doc.data().verifiedAt) : null)
            }));
            // Combine all transactions
            let allTransactions = [...deposits, ...withdrawals, ...transactions];
            // Apply filters
            if (type && type !== 'all') {
                allTransactions = allTransactions.filter((t) => t.type === type);
            }
            if (status && status !== 'all') {
                allTransactions = allTransactions.filter((t) => t.status?.toLowerCase() === status.toLowerCase());
            }
            if (userId) {
                allTransactions = allTransactions.filter((t) => t.userId === userId);
            }
            // Sort transactions
            allTransactions.sort((a, b) => {
                const aValue = a[sortBy];
                const bValue = b[sortBy];
                if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
                    const aTime = new Date(aValue).getTime();
                    const bTime = new Date(bValue).getTime();
                    return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
                }
                if (sortBy === 'amount') {
                    return sortOrder === 'desc' ? (bValue || 0) - (aValue || 0) : (aValue || 0) - (bValue || 0);
                }
                return sortOrder === 'desc' ?
                    String(bValue || '').localeCompare(String(aValue || '')) :
                    String(aValue || '').localeCompare(String(bValue || ''));
            });
            // Apply pagination
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const paginatedTransactions = allTransactions.slice(startIndex, endIndex);
            res.json({
                transactions: paginatedTransactions,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(allTransactions.length / limitNum),
                    totalCount: allTransactions.length,
                    hasNext: endIndex < allTransactions.length,
                    hasPrev: pageNum > 1
                },
                summary: {
                    totalDeposits: deposits.length,
                    totalWithdrawals: withdrawals.length,
                    totalTransactions: transactions.length,
                    grandTotal: allTransactions.length
                }
            });
        }
        catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({ message: 'Failed to fetch transactions' });
        }
    }));
    // Get wallet config from admin_config/wallet_config (correct structure)
    registerRoute('get', '/wallet/config', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        try {
            const doc = await db.collection('admin_config').doc('wallet_config').get();
            if (!doc.exists) {
                // Return default structure for all currencies
                return res.json({
                    INR: {
                        displayName: 'Netwin Gaming',
                        upiId: '',
                        isActive: true,
                        updatedAt: new Date(),
                        updatedBy: 'admin-1'
                    },
                    NGN: {
                        displayName: 'Netwin Gaming',
                        paymentLink: '',
                        isActive: true,
                        updatedAt: new Date(),
                        updatedBy: 'admin-1'
                    },
                    USD: {
                        displayName: 'Netwin Gaming',
                        paymentLink: '',
                        isActive: true,
                        updatedAt: new Date(),
                        updatedBy: 'admin-1'
                    }
                });
            }
            const data = doc.data();
            res.json(data || {});
        }
        catch (error) {
            console.error('Error fetching wallet config:', error);
            res.status(500).json({ message: 'Failed to fetch wallet config' });
        }
    }));
    // Update wallet config in admin_config/wallet_config (correct structure)
    registerRoute('post', '/wallet/config', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        try {
            const configData = req.body; // Should be the full currency config object
            console.log('Updating wallet config with data:', configData);
            // Ensure each currency config has the required fields
            const processedConfig = {};
            for (const [currency, config] of Object.entries(configData)) {
                if (['INR', 'NGN', 'USD'].includes(currency)) {
                    processedConfig[currency] = {
                        ...config,
                        updatedAt: new Date(),
                        updatedBy: 'admin-1'
                    };
                    // For INR, ensure upiId field is used
                    if (currency === 'INR' && config.upiId) {
                        processedConfig[currency].upiId = config.upiId;
                    }
                    // For NGN and USD, ensure paymentLink field is used
                    if ((currency === 'NGN' || currency === 'USD') && config.upiId) {
                        // Frontend sends upiId for all currencies, but for NGN/USD it should be paymentLink
                        processedConfig[currency].paymentLink = config.upiId;
                        delete processedConfig[currency].upiId; // Remove upiId for non-INR currencies
                    }
                }
            }
            await db.collection('admin_config').doc('wallet_config').set(processedConfig, { merge: true });
            console.log('Wallet config updated successfully in admin_config/wallet_config');
            res.json({ success: true, message: 'Wallet config updated successfully' });
        }
        catch (error) {
            console.error('Error updating wallet config:', error);
            res.status(500).json({ message: 'Failed to update wallet config' });
        }
    }));
    // Legacy UPI config endpoints - redirects to wallet_config for backward compatibility
    registerRoute('get', '/wallet/upi-config', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        try {
            // Get from the correct wallet_config document, but return only INR data for backward compatibility
            const doc = await db.collection('admin_config').doc('wallet_config').get();
            if (!doc.exists) {
                return res.json({
                    displayName: 'Netwin Gaming',
                    upiId: '',
                    isActive: false,
                    qrCode: null
                });
            }
            const data = doc.data();
            const inrConfig = data?.INR || {};
            res.json({
                displayName: inrConfig.displayName || 'Netwin Gaming',
                upiId: inrConfig.upiId || '',
                isActive: inrConfig.isActive || false,
                qrCode: inrConfig.qrCode || null,
                updatedAt: inrConfig.updatedAt?.toDate?.() || null,
                updatedBy: inrConfig.updatedBy || null
            });
        }
        catch (error) {
            console.error('Error fetching UPI config:', error);
            res.status(500).json({ message: 'Failed to fetch UPI config' });
        }
    }));
    // Legacy UPI config update - updates INR in wallet_config for backward compatibility
    registerRoute('post', '/wallet/upi-config', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        try {
            const { displayName, upiId, isActive, qrCode } = req.body;
            const updateData = {
                displayName: displayName || 'Netwin Gaming',
                upiId: upiId || '',
                isActive: isActive || false,
                updatedAt: new Date(),
                updatedBy: 'admin-1'
            };
            if (qrCode) {
                updateData.qrCode = qrCode;
            }
            // Update the INR section in wallet_config instead of creating upi_settings
            await db.collection('admin_config').doc('wallet_config').set({
                INR: updateData
            }, { merge: true });
            console.log('Legacy UPI config updated in wallet_config/INR');
            res.json({ success: true, message: 'UPI config updated successfully' });
        }
        catch (error) {
            console.error('Error updating UPI config:', error);
            res.status(500).json({ message: 'Failed to update UPI config' });
        }
    }));
    // Approve deposit
    registerRoute('post', '/wallet/deposits/:id/approve', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        const depositId = req.params.id;
        if (!depositId)
            return res.status(400).json({ message: 'Missing deposit ID' });
        try {
            // Get the pending deposit
            const depositRef = db.collection('pending_deposits').doc(depositId);
            const depositSnap = await depositRef.get();
            if (!depositSnap.exists) {
                return res.status(404).json({ message: 'Deposit not found' });
            }
            const deposit = depositSnap.data();
            if (deposit.status !== 'PENDING') {
                return res.status(400).json({ message: 'Deposit is not pending' });
            }
            // Get user document and update wallet balance
            const userId = deposit.userId;
            if (!userId)
                return res.status(400).json({ message: 'Deposit missing userId' });
            const userRef = db.collection('users').doc(userId);
            const userSnap = await userRef.get();
            if (!userSnap.exists)
                return res.status(404).json({ message: 'User not found' });
            const user = userSnap.data();
            // Update wallet balance (increment)
            const newBalance = (user.walletBalance || 0) + (deposit.amount || 0);
            await userRef.update({ walletBalance: newBalance, updatedAt: new Date() });
            // Mark deposit as approved in pending_deposits
            await depositRef.update({
                status: 'APPROVED',
                verifiedAt: new Date(),
                verifiedBy: req.user?.email || 'admin-1',
                updatedAt: new Date()
            });
            // Update corresponding transaction in transactions collection
            const transactionsQuery = db.collection('transactions')
                .where('userId', '==', userId)
                .where('type', '==', 'deposit')
                .where('amount', '==', deposit.amount)
                .where('status', '==', 'PENDING');
            const transactionsSnap = await transactionsQuery.get();
            if (!transactionsSnap.empty) {
                // Update the first matching transaction
                const transactionDoc = transactionsSnap.docs[0];
                await transactionDoc.ref.update({
                    status: 'completed',
                    updatedAt: new Date(),
                    verifiedAt: new Date(),
                    verifiedBy: req.user?.email || 'admin-1'
                });
                console.log('Updated transaction in transactions collection:', transactionDoc.id);
            }
            else {
                console.log('No matching transaction found in transactions collection for deposit:', depositId);
            }
            res.json({
                success: true,
                message: 'Deposit approved and wallet updated',
                newBalance
            });
        }
        catch (error) {
            console.error('Error approving deposit:', error);
            res.status(500).json({ message: 'Failed to approve deposit' });
        }
    }));
    // Reject deposit
    registerRoute('post', '/wallet/deposits/:id/reject', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            // Get the pending deposit
            const depositRef = db.collection('pending_deposits').doc(id);
            const depositSnap = await depositRef.get();
            if (!depositSnap.exists) {
                return res.status(404).json({ message: 'Deposit not found' });
            }
            const deposit = depositSnap.data();
            // Update deposit status in pending_deposits
            await depositRef.update({
                status: 'REJECTED',
                rejectionReason: reason || 'Rejected by admin',
                verifiedAt: new Date(),
                verifiedBy: 'admin-1',
                updatedAt: new Date()
            });
            // Update corresponding transaction in transactions collection
            const userId = deposit.userId;
            if (userId) {
                const transactionsQuery = db.collection('transactions')
                    .where('userId', '==', userId)
                    .where('type', '==', 'deposit')
                    .where('amount', '==', deposit.amount)
                    .where('status', '==', 'PENDING');
                const transactionsSnap = await transactionsQuery.get();
                if (!transactionsSnap.empty) {
                    // Update the first matching transaction
                    const transactionDoc = transactionsSnap.docs[0];
                    await transactionDoc.ref.update({
                        status: 'rejected',
                        updatedAt: new Date(),
                        rejectionReason: reason || 'Rejected by admin',
                        verifiedAt: new Date(),
                        verifiedBy: 'admin-1'
                    });
                    console.log('Updated transaction in transactions collection:', transactionDoc.id);
                }
            }
            res.json({ success: true, message: 'Deposit rejected successfully' });
        }
        catch (error) {
            console.error('Error rejecting deposit:', error);
            res.status(500).json({ message: 'Failed to reject deposit' });
        }
    }));
    // Approve withdrawal
    registerRoute('post', '/wallet/withdrawals/:id/approve', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            // Get withdrawal document (try both pending_withdrawals and wallet_withdrawals for compatibility)
            let withdrawalRef = db.collection('pending_withdrawals').doc(id);
            let withdrawalSnap = await withdrawalRef.get();
            if (!withdrawalSnap.exists) {
                withdrawalRef = db.collection('wallet_withdrawals').doc(id);
                withdrawalSnap = await withdrawalRef.get();
                if (!withdrawalSnap.exists)
                    return res.status(404).json({ message: 'Withdrawal not found' });
            }
            const withdrawal = withdrawalSnap.data();
            if (withdrawal.status !== 'PENDING') {
                return res.status(400).json({ message: 'Withdrawal is not pending' });
            }
            // Get user document
            const userId = withdrawal.userId;
            if (!userId)
                return res.status(400).json({ message: 'Withdrawal missing userId' });
            const userRef = db.collection('users').doc(userId);
            const userSnap = await userRef.get();
            if (!userSnap.exists)
                return res.status(404).json({ message: 'User not found' });
            const user = userSnap.data();
            // Update wallet balance (decrement)
            const newBalance = (user.walletBalance || 0) - (withdrawal.amount || 0);
            if (newBalance < 0)
                return res.status(400).json({ message: 'Insufficient balance for withdrawal' });
            await userRef.update({ walletBalance: newBalance, updatedAt: new Date() });
            // Mark withdrawal as approved
            await withdrawalRef.update({ status: 'APPROVED', verifiedAt: new Date(), verifiedBy: req.user?.email || 'admin', updatedAt: new Date() });
            // Update corresponding transaction in transactions collection (don't create new one)
            const transactionsQuery = db.collection('transactions')
                .where('userId', '==', userId)
                .where('type', '==', 'withdrawal')
                .where('amount', '==', withdrawal.amount)
                .where('status', '==', 'PENDING');
            const transactionsSnap = await transactionsQuery.get();
            if (!transactionsSnap.empty) {
                // Update the first matching transaction
                const transactionDoc = transactionsSnap.docs[0];
                await transactionDoc.ref.update({
                    status: 'completed',
                    updatedAt: new Date(),
                    verifiedAt: new Date(),
                    verifiedBy: req.user?.email || 'admin'
                });
                console.log('Updated transaction in transactions collection:', transactionDoc.id);
            }
            else {
                console.log('No matching transaction found in transactions collection for withdrawal:', id);
            }
            res.json({ success: true, message: 'Withdrawal approved and wallet updated', newBalance });
        }
        catch (error) {
            console.error('Error approving withdrawal:', error);
            res.status(500).json({ message: 'Failed to approve withdrawal' });
        }
    }));
    // Reject withdrawal
    registerRoute('post', '/wallet/withdrawals/:id/reject', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            // Get the pending withdrawal
            const withdrawalRef = db.collection('pending_withdrawals').doc(id);
            const withdrawalSnap = await withdrawalRef.get();
            if (!withdrawalSnap.exists) {
                return res.status(404).json({ message: 'Withdrawal not found' });
            }
            const withdrawal = withdrawalSnap.data();
            // Update withdrawal status in pending_withdrawals
            await withdrawalRef.update({
                status: 'REJECTED',
                rejectionReason: reason || 'Rejected by admin',
                verifiedAt: new Date(),
                verifiedBy: 'admin-1',
                updatedAt: new Date()
            });
            // Update corresponding transaction in transactions collection
            const userId = withdrawal.userId;
            if (userId) {
                const transactionsQuery = db.collection('transactions')
                    .where('userId', '==', userId)
                    .where('type', '==', 'withdrawal')
                    .where('amount', '==', withdrawal.amount)
                    .where('status', '==', 'PENDING');
                const transactionsSnap = await transactionsQuery.get();
                if (!transactionsSnap.empty) {
                    // Update the first matching transaction
                    const transactionDoc = transactionsSnap.docs[0];
                    await transactionDoc.ref.update({
                        status: 'rejected',
                        updatedAt: new Date(),
                        rejectionReason: reason || 'Rejected by admin',
                        verifiedAt: new Date(),
                        verifiedBy: 'admin-1'
                    });
                    console.log('Updated transaction in transactions collection:', transactionDoc.id);
                }
            }
            res.json({ success: true, message: 'Withdrawal rejected successfully' });
        }
        catch (error) {
            console.error('Error rejecting withdrawal:', error);
            res.status(500).json({ message: 'Failed to reject withdrawal' });
        }
    }));
    // Tournament Management Endpoints
    // Debug endpoint to check raw tournament data
    registerRoute('get', '/debug/tournament-data', asyncHandler(async (req, res) => {
        try {
            const snapshot = await db.collection('tournaments')
                .orderBy('createdAt', 'desc')
                .get();
            const tournaments = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
                updatedAt: doc.data().updatedAt?.toDate?.() || (doc.data().updatedAt ? new Date(doc.data().updatedAt) : null),
                startTime: doc.data().startTime?.toDate?.() || (doc.data().startTime ? new Date(doc.data().startTime) : null),
                endTime: doc.data().endTime?.toDate?.() || (doc.data().endTime ? new Date(doc.data().endTime) : null)
            }));
            res.json(tournaments);
        }
        catch (error) {
            console.error('Error fetching tournament debug data:', error);
            res.status(500).json({ message: 'Failed to fetch tournament debug data' });
        }
    }));
    // Tournament Management Status Endpoint
    registerRoute('get', '/tournament-management/tournament-status/:id', appCheckMiddleware, authenticateToken, requirePermission('tournament_management'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        try {
            const tournament = await storage.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ message: "Tournament not found" });
            }
            // Get tournament registrations
            const registrationsSnapshot = await db.collection('tournament_registrations')
                .where('tournamentId', '==', id)
                .get();
            const registrations = registrationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            // Get current time and calculate scheduling info
            const currentTime = new Date();
            const startTime = new Date(tournament.startTime ?? Date.now());
            const timeUntilStart = startTime.getTime() - currentTime.getTime();
            // Build status response
            const statusInfo = {
                tournament: {
                    id: tournament.id,
                    title: tournament.title,
                    status: tournament.status,
                    startTime: tournament.startTime,
                    registeredTeams: registrations.length,
                    maxTeams: tournament.maxPlayers || 100,
                    hasRoomCredentials: !!tournament.roomId && !!tournament.roomPassword,
                    roomId: tournament.roomId,
                    roomPassword: tournament.roomPassword
                },
                scheduling: {
                    currentTime: currentTime.toISOString(),
                    startTime: tournament.startTime,
                    timeUntilStart: timeUntilStart,
                    shouldBeLive: timeUntilStart <= 0 && tournament.status === 'upcoming',
                    canStart: tournament.status === 'upcoming' && registrations.length > 0
                },
                registrations: registrations.length,
                players: registrations.map((reg) => ({
                    registrationId: parseInt(reg.id),
                    userId: reg.userId ? parseInt(reg.userId) : null,
                    userName: reg.userName || 'Unknown',
                    teamName: reg.teamName || 'Unknown Team',
                    gameId: reg.gameId || 'Unknown',
                    isTeamLeader: reg.isTeamLeader || false,
                    paymentStatus: reg.paymentStatus || 'unknown'
                }))
            };
            res.json({ success: true, data: statusInfo });
        }
        catch (error) {
            console.error('Error fetching tournament status:', error);
            res.status(500).json({ message: "Failed to fetch tournament status" });
        }
    }));
    // Tournament Prize Distribution Endpoint - Pure Individual Logic
    registerRoute('get', '/tournaments/:id/prize-distribution', appCheckMiddleware, authenticateToken, requirePermission('tournament_management'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        try {
            const tournament = await storage.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ message: "Tournament not found" });
            }
            // Get all individual registrations
            const registrationsSnapshot = await db.collection('tournament_registrations')
                .where('tournamentId', '==', id)
                .get();
            const registrations = registrationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            // Calculate prize pool
            const totalRegistrations = registrations.length;
            const totalEntryFees = totalRegistrations * (tournament.entryFee !== undefined ? tournament.entryFee : 0);
            // Use the commission percentage saved with the tournament or fall back to 10%
            const commissionPercentage = tournament.companyCommissionPercentage || 10;
            const companyCommission = totalEntryFees * (commissionPercentage / 100);
            // Allow admin to override prize pool and per-kill reward via tournament fields
            const actualPrizePool = tournament.prizePool || (totalEntryFees - companyCommission);
            // Use the percentages saved with the tournament or fall back to 40% for first prize and 60% for kill rewards
            // This ensures consistency with the calculations in the create-tournament-dialog.tsx
            const firstPrizePercentage = tournament.firstPrizePercentage || 40;
            const perKillPercentage = tournament.perKillRewardPercentage || 60;
            const firstPrize = actualPrizePool * (firstPrizePercentage / 100);
            const killPrizePool = actualPrizePool * (perKillPercentage / 100);
            // Calculate total kills from registrations
            const totalKills = registrations.reduce((sum, reg) => sum + (reg.kills || 0), 0);
            // Calculate per-kill reward using the same logic as in the client
            let perKillReward = 0;
            if (killPrizePool > 0) {
                // Get match type from tournament data
                const matchType = tournament.matchType?.toLowerCase() || 'squad';
                // Calculate number of kills (total registrations minus the divisor based on match type)
                // This replicates the getNumKills function from create-tournament-dialog.tsx
                let numKills;
                switch (matchType) {
                    case 'solo':
                        numKills = Math.max(totalRegistrations - 1, 0);
                        break;
                    case 'duo':
                        numKills = Math.max(totalRegistrations - 2, 0);
                        break;
                    case 'squad':
                        numKills = Math.max(totalRegistrations - 4, 0);
                        break;
                    default:
                        numKills = Math.max(totalRegistrations - 1, 0);
                }
                // Calculate per-kill reward with floor to ensure integer value
                perKillReward = numKills > 0 ? Math.floor(killPrizePool / numKills) : 0;
                console.log(`Server prize calculation: ${killPrizePool} ÷ ${numKills} (${matchType} type, ${totalRegistrations} players) = ${perKillReward}`);
            }
            // Build player prize data from registrations
            const players = registrations.map((reg) => {
                const kills = reg.kills || 0;
                const position = reg.position || null;
                let reward = 0;
                let rewardBreakdown = {};
                if (position === 1) {
                    reward += firstPrize;
                    rewardBreakdown = { firstPrize };
                }
                if (kills > 0) {
                    const killReward = kills * perKillReward;
                    reward += killReward;
                    rewardBreakdown = { ...rewardBreakdown, killReward };
                }
                return {
                    registrationId: reg.id,
                    userId: reg.userId,
                    userName: reg.userName || reg.teamName || reg.displayName || 'Unknown',
                    teamName: reg.teamName || 'Unknown',
                    gameId: reg.gameId || 'Unknown',
                    position,
                    kills,
                    reward,
                    rewardBreakdown,
                    resultVerified: reg.resultVerified || false,
                    resultSubmitted: reg.resultSubmitted || false,
                    isTeamLeader: reg.isTeamLeader || false
                };
            });
            const prizeData = {
                tournament: {
                    id: tournament.id,
                    title: tournament.title,
                    status: tournament.status,
                    entryFee: tournament.entryFee,
                    originalPrizePool: tournament.prizePool,
                },
                prizeCalculation: {
                    totalRegistrations,
                    totalEntryFees,
                    companyCommission,
                    companyCommissionPercentage: commissionPercentage,
                    actualPrizePool,
                    firstPrize,
                    killPrizePool,
                    firstPrizePercentage,
                    perKillPercentage,
                    perKillReward,
                    totalKills
                },
                players,
                canDistribute: tournament.status === 'completed' && !!tournament.prizesDistributed !== true,
                totalPlayers: players.length
            };
            res.json({ data: prizeData });
        }
        catch (error) {
            console.error('Error fetching prize distribution:', error);
            res.status(500).json({ message: "Failed to fetch prize distribution" });
        }
    }));
    // Tournament Transactions Endpoint
    registerRoute('get', '/tournaments/:id/transactions', appCheckMiddleware, authenticateToken, requirePermission('distribute_prizes'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const typeFilter = req.query.type || 'all';
        try {
            const tournament = await storage.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ message: "Tournament not found" });
            }
            // Get tournament-related transactions
            let transactionsQuery = db.collection('transactions')
                .where('tournamentId', '==', id);
            if (typeFilter !== 'all') {
                transactionsQuery = transactionsQuery.where('type', '==', typeFilter);
            }
            const transactionsSnapshot = await transactionsQuery
                .orderBy('createdAt', 'desc')
                .get();
            const allTransactions = transactionsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
            }));
            // Pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedTransactions = allTransactions.slice(startIndex, endIndex);
            const transactionData = {
                tournament: {
                    id: tournament.id,
                    title: tournament.title,
                    status: tournament.status
                },
                transactions: paginatedTransactions,
                pagination: {
                    page,
                    limit,
                    total: allTransactions.length,
                    totalPages: Math.ceil(allTransactions.length / limit)
                }
            };
            res.json(transactionData);
        }
        catch (error) {
            console.error('Error fetching tournament transactions:', error);
            res.status(500).json({ message: "Failed to fetch tournament transactions" });
        }
    }));
    // Tournament Management Actions - Update endpoints to match frontend calls
    registerRoute('post', '/tournament-management/start-tournament/:id', appCheckMiddleware, authenticateToken, requirePermission('tournament_management'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        try {
            const tournament = await storage.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ success: false, error: "Tournament not found" });
            }
            if (tournament.status !== 'upcoming') {
                return res.status(400).json({ success: false, error: "Tournament can only be started if it's in upcoming status" });
            }
            // Update tournament status to live
            await storage.updateTournament(id, {
                status: 'live',
                actualStartTime: new Date(),
                updatedAt: new Date()
            });
            res.json({ success: true, message: "Tournament started successfully", timestamp: new Date().toISOString() });
        }
        catch (error) {
            console.error('Error starting tournament:', error);
            res.status(500).json({ success: false, error: "Failed to start tournament" });
        }
    }));
    registerRoute('post', '/tournament-management/complete-tournament/:id', appCheckMiddleware, authenticateToken, requirePermission('tournament_management'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        try {
            const tournament = await storage.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ success: false, error: "Tournament not found" });
            }
            if (tournament.status !== 'live') {
                return res.status(400).json({ success: false, error: "Tournament can only be completed if it's currently live" });
            }
            // Update tournament status to completed
            await storage.updateTournament(id, {
                status: 'completed',
                completedAt: new Date(),
                updatedAt: new Date()
            });
            res.json({ success: true, message: "Tournament completed successfully", timestamp: new Date().toISOString() });
        }
        catch (error) {
            console.error('Error completing tournament:', error);
            res.status(500).json({ success: false, error: "Failed to complete tournament" });
        }
    }));
    registerRoute('post', '/tournament-management/check-tournament-statuses', appCheckMiddleware, authenticateToken, requirePermission('tournament_management'), asyncHandler(async (req, res) => {
        try {
            // Get all tournaments and check their statuses
            const tournaments = await storage.getAllTournaments();
            const currentTime = new Date();
            const updates = [];
            for (const tournament of tournaments) {
                const startTime = new Date(tournament.startTime ?? Date.now());
                const shouldBeLive = currentTime >= startTime && tournament.status === 'upcoming';
                if (shouldBeLive) {
                    await storage.updateTournament(tournament.id, {
                        status: 'live',
                        actualStartTime: currentTime,
                        updatedAt: currentTime
                    });
                    updates.push(`Tournament ${tournament.title} (${tournament.id}) status updated to live`);
                }
            }
            res.json({
                success: true,
                message: updates.length > 0 ? `Updated ${updates.length} tournaments` : "No tournaments needed status updates",
                updates,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error checking tournament statuses:', error);
            res.status(500).json({ success: false, error: "Failed to check tournament statuses" });
        }
    }));
    // Tournament Notification Endpoint
    registerRoute('post', '/tournament-management/send-tournament-notification/:id', appCheckMiddleware, authenticateToken, requirePermission('tournament_management'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { title, message, priority = 'normal' } = req.body;
        try {
            const tournament = await storage.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ success: false, error: "Tournament not found" });
            }
            // Get tournament participants
            const registrationsSnapshot = await db.collection('tournament_registrations')
                .where('tournamentId', '==', id)
                .get();
            const registrations = registrationsSnapshot.docs.map((doc) => doc.data());
            // TODO: Implement actual notification sending logic
            // For now, just return success
            res.json({
                success: true,
                message: `Notification sent to ${registrations.length} participants`,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error sending tournament notification:', error);
            res.status(500).json({ success: false, error: "Failed to send tournament notification" });
        }
    }));
    // Test Notification Endpoint
    registerRoute('post', '/tournament-management/send-test-notification', appCheckMiddleware, authenticateToken, requirePermission('tournament_management'), asyncHandler(async (req, res) => {
        const { userId, title, message, type = 'system' } = req.body;
        try {
            // TODO: Implement actual notification sending logic
            // For now, just return success
            res.json({
                success: true,
                message: `Test notification sent to user ${userId}`,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error sending test notification:', error);
            res.status(500).json({ success: false, error: "Failed to send test notification" });
        }
    }));
    // Save Tournament Results Endpoint
    registerRoute('post', '/tournaments/:id/results', appCheckMiddleware, authenticateToken, requirePermission('tournament_management'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        const results = req.body;
        try {
            const tournament = await storage.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ message: "Tournament not found" });
            }
            const batch = db.batch();
            // Update registrations with results data instead of creating separate results
            for (const result of results) {
                if (result.registrationId) {
                    const registrationRef = db.collection('tournament_registrations').doc(result.registrationId.toString());
                    // Get the current registration to preserve existing data
                    const registrationDoc = await registrationRef.get();
                    if (registrationDoc.exists) {
                        const updateData = {
                            position: result.position,
                            kills: result.kills || 0,
                            updatedAt: new Date()
                        };
                        // Include reward if provided
                        if (result.reward !== undefined) {
                            updateData.reward = result.reward;
                        }
                        batch.update(registrationRef, updateData);
                    }
                }
            }
            await batch.commit();
            res.json({ success: true, message: "Results saved successfully" });
        }
        catch (error) {
            console.error('Error saving tournament results:', error);
            res.status(500).json({ message: "Failed to save tournament results" });
        }
    }));
    // Enhanced Distribute Prizes Endpoint - Pure Individual Logic
    registerRoute('post', '/tournaments/:id/distribute-prizes', appCheckMiddleware, authenticateToken, requirePermission('tournament_management'), asyncHandler(async (req, res) => {
        const { id } = req.params;
        try {
            const tournament = await storage.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ message: "Tournament not found" });
            }
            if (tournament.status !== 'completed') {
                return res.status(400).json({ message: "Tournament must be completed before distributing prizes" });
            }
            if (tournament.prizesDistributed) {
                return res.status(400).json({ message: "Prizes have already been distributed for this tournament" });
            }
            // Get tournament registrations with results data
            const registrationsSnapshot = await db.collection('tournament_registrations')
                .where('tournamentId', '==', id)
                .get();
            if (registrationsSnapshot.empty) {
                return res.status(400).json({ message: "No registrations found for this tournament" });
            }
            const registrations = registrationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            // Filter registrations that have verified results and non-zero rewards
            const verifiedRegistrations = registrations.filter((reg) => reg.resultVerified && ((reg.position === 1) || (reg.kills > 0)));
            // Calculate actual prize distribution
            const totalRegistrations = registrations.length;
            const totalEntryFees = totalRegistrations * (tournament.entryFee !== undefined ? tournament.entryFee : 0);
            const commissionPercentage = tournament.companyCommissionPercentage || 10;
            const companyCommission = totalEntryFees * (commissionPercentage / 100);
            const actualPrizePool = tournament.prizePool || (totalEntryFees - companyCommission);
            const firstPrizePercentage = tournament.firstPrizePercentage || 40;
            const perKillPercentage = tournament.perKillRewardPercentage || 60;
            const firstPrize = actualPrizePool * (firstPrizePercentage / 100);
            const killPrizePool = actualPrizePool * (perKillPercentage / 100);
            // Calculate kill rewards
            const totalKills = verifiedRegistrations.reduce((sum, reg) => sum + (reg.kills || 0), 0);
            const perKillReward = totalKills > 0 ? killPrizePool / totalKills : 0;
            const batch = db.batch();
            const distributions = [];
            // Process each verified registration
            for (const registration of verifiedRegistrations) {
                let prizeAmount = 0;
                let prizeType = '';
                // 1st place only
                if (registration.position === 1) {
                    prizeAmount += firstPrize;
                    prizeType = 'First Place';
                }
                // Kill rewards
                const killReward = (registration.kills || 0) * perKillReward;
                if (killReward > 0) {
                    prizeAmount += killReward;
                    prizeType = prizeType ? `${prizeType} + Kill Reward` : 'Kill Reward';
                }
                if (prizeAmount > 0 && registration.userId) {
                    // Create prize distribution record
                    const distributionRef = db.collection('prize_distributions').doc();
                    const distributionData = {
                        tournamentId: id,
                        userId: registration.userId,
                        registrationId: registration.id,
                        position: registration.position,
                        kills: registration.kills || 0,
                        prizeAmount,
                        prizeType,
                        status: 'completed',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    batch.set(distributionRef, distributionData);
                    distributions.push({ ...distributionData, id: distributionRef.id });
                    // Update user wallet balance
                    const userRef = db.collection('users').doc(registration.userId.toString());
                    const userDoc = await userRef.get();
                    const currentBalance = userDoc.exists ? (userDoc.data()?.walletBalance || 0) : 0;
                    batch.update(userRef, {
                        walletBalance: currentBalance + prizeAmount,
                        updatedAt: new Date()
                    });
                    // Create transaction record
                    const transactionRef = db.collection('transactions').doc();
                    batch.set(transactionRef, {
                        userId: registration.userId,
                        tournamentId: id,
                        amount: prizeAmount,
                        type: 'prize_money',
                        status: 'completed',
                        description: `Prize money for ${tournament.title} - ${prizeType}`,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    // Update the registration with reward amount and prize distributed flag
                    batch.update(db.collection('tournament_registrations').doc(registration.id), {
                        reward: prizeAmount,
                        prizeDistributed: true,
                        prizeDistributedAt: new Date(),
                        updatedAt: new Date()
                    });
                }
            }
            // Mark tournament as prizes distributed
            const tournamentRef = db.collection('tournaments').doc(id);
            batch.update(tournamentRef, {
                prizesDistributed: true,
                prizesDistributedAt: new Date(),
                actualPrizePool,
                totalDistributed: distributions.reduce((sum, d) => sum + d.prizeAmount, 0),
                updatedAt: new Date()
            });
            await batch.commit();
            res.json({
                success: true,
                message: "Prizes distributed successfully",
                distributions,
                summary: {
                    totalDistributed: distributions.reduce((sum, d) => sum + d.prizeAmount, 0),
                    firstPlaceWinner: distributions.find(d => d.position === 1),
                    totalKillRewards: distributions.filter(d => d.kills > 0).reduce((sum, d) => sum + (d.kills * perKillReward), 0)
                }
            });
        }
        catch (error) {
            console.error('Error distributing prizes:', error);
            res.status(500).json({ message: "Failed to distribute prizes" });
        }
    }));
    // Admin Dashboard Stats endpoint - what the frontend actually calls
    registerRoute('get', '/admin/dashboard/stats', appCheckMiddleware, authenticateToken, requirePermission('admin_dashboard'), asyncHandler(async (req, res) => {
        try {
            const allUsers = await storage.getAllUsers();
            const allTournaments = await storage.getAllTournaments();
            // KYC stats
            const kycStats = {
                totalUsers: allUsers.length,
                pending: allUsers.filter(u => u.kycStatus === 'pending').length,
                approved: allUsers.filter(u => u.kycStatus === 'approved').length,
                rejected: allUsers.filter(u => u.kycStatus === 'rejected').length,
                verified: allUsers.filter(u => u.kycStatus === 'verified').length,
                not_submitted: allUsers.filter(u => !u.kycStatus || u.kycStatus === 'not_submitted').length
            };
            // Tournament stats
            const tournamentStats = {
                total: allTournaments.length,
                upcoming: allTournaments.filter(t => t.status === 'upcoming').length,
                live: allTournaments.filter(t => t.status === 'live').length,
                completed: allTournaments.filter(t => t.status === 'completed').length
            };
            // User stats
            const userStats = {
                total: allUsers.length,
                active: allUsers.filter(u => u.status === 'active' || !u.status).length,
                banned: allUsers.filter(u => u.status === 'banned').length,
                newThisMonth: allUsers.filter(u => {
                    const userDate = u.createdAt ? new Date(u.createdAt) : null;
                    const now = new Date();
                    return userDate && userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
                }).length
            };
            // Get wallet stats
            const depositsSnapshot = await db.collection('pending_deposits').get();
            const withdrawalsSnapshot = await db.collection('pending_withdrawals').get();
            const deposits = depositsSnapshot.docs.map((doc) => doc.data());
            const withdrawals = withdrawalsSnapshot.docs.map((doc) => doc.data());
            const walletStats = {
                pendingDeposits: deposits.filter((d) => d.status === 'PENDING').length,
                pendingWithdrawals: withdrawals.filter((w) => w.status === 'PENDING').length,
                totalDeposits: deposits.length,
                totalWithdrawals: withdrawals.length
            };
            // Return data in the format expected by the frontend DashboardStats interface
            res.json({
                overview: {
                    totalUsers: userStats.total,
                    activeUsers: userStats.active,
                    totalTournaments: tournamentStats.total,
                    activeTournaments: tournamentStats.upcoming + tournamentStats.live,
                    totalRevenue: 0, // TODO: Calculate from transactions
                    monthlyRevenue: 0, // TODO: Calculate from this month's transactions
                    pendingKyc: kycStats.pending,
                    pendingPayouts: walletStats.pendingWithdrawals
                },
                recentActivity: [], // TODO: Add recent activity logic
                systemHealth: {
                    database: 'healthy',
                    storage: 'healthy',
                    notifications: 'healthy',
                    overall: 'healthy'
                },
                upcomingEvents: [] // TODO: Add upcoming events logic
            });
        }
        catch (error) {
            console.error("Error fetching admin dashboard stats:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch dashboard statistics"
            });
        }
    }));
    // Support Tickets Management Endpoints
    // Get all support tickets with pagination and filtering
    registerRoute('get', '/support-tickets', appCheckMiddleware, authenticateToken, requirePermission('support_tickets'), asyncHandler(async (req, res) => {
        try {
            console.log('📧 Fetching support tickets from Firestore...');
            const { page = 1, limit = 10, status = 'all', priority = 'all', category = 'all', search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
            // Get support tickets directly from Firestore since storage.getSupportTickets() might not exist
            let query = db.collection('support_tickets');
            // Apply filters
            if (status !== 'all') {
                query = query.where('status', '==', status);
            }
            if (priority !== 'all') {
                query = query.where('priority', '==', priority);
            }
            if (category !== 'all') {
                query = query.where('category', '==', category);
            }
            // Apply sorting
            const sortOrderValue = sortOrder === 'desc' ? 'desc' : 'asc';
            query = query.orderBy(sortBy, sortOrderValue);
            const snapshot = await query.get();
            let tickets = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
                updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
            }));
            console.log(`📧 Found ${tickets.length} total support tickets`);
            console.log(`📧 [Backend] Ticket statuses:`, tickets.map((t) => ({ id: t.ticketId, status: t.status })));
            // Apply search filter
            if (search) {
                const searchLower = search.toLowerCase();
                tickets = tickets.filter((ticket) => ticket.subject?.toLowerCase().includes(searchLower) ||
                    ticket.description?.toLowerCase().includes(searchLower) ||
                    ticket.userEmail?.toLowerCase().includes(searchLower) ||
                    ticket.username?.toLowerCase().includes(searchLower) ||
                    ticket.ticketId?.toLowerCase().includes(searchLower));
            }
            // Apply pagination
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const paginatedTickets = tickets.slice(startIndex, endIndex);
            console.log(`📧 Returning ${paginatedTickets.length} tickets (page ${pageNum})`);
            res.json({
                tickets: paginatedTickets,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(tickets.length / limitNum),
                    totalCount: tickets.length,
                    hasNext: endIndex < tickets.length,
                    hasPrev: pageNum > 1
                },
                total: tickets.length
            });
        }
        catch (error) {
            console.error("Error fetching support tickets:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch support tickets"
            });
        }
    }));
    // Get support ticket by ID (using ticketId)
    registerRoute('get', '/support-tickets/:id', appCheckMiddleware, authenticateToken, requirePermission('support_tickets'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params; // This is the ticketId like "ST-MCRB95U0"
            console.log('[Support Ticket GET] Looking for ticketId:', id);
            // Query by ticketId field, not document ID
            const querySnapshot = await db.collection('support_tickets')
                .where('ticketId', '==', id)
                .limit(1)
                .get();
            if (querySnapshot.empty) {
                console.log('[Support Ticket GET] No ticket found with ticketId:', id);
                return res.status(404).json({ message: 'Support ticket not found' });
            }
            const doc = querySnapshot.docs[0];
            const ticket = {
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data()?.createdAt?.toDate?.() || new Date(doc.data()?.createdAt),
                updatedAt: doc.data()?.updatedAt?.toDate?.() || new Date(doc.data()?.updatedAt)
            };
            console.log('[Support Ticket GET] Found ticket:', { ticketId: id, docId: doc.id });
            res.json(ticket);
        }
        catch (error) {
            console.error('Error fetching support ticket:', error);
            res.status(500).json({ message: 'Failed to fetch support ticket' });
        }
    }));
    // Update support ticket status (using ticketId)
    registerRoute('patch', '/support-tickets/:id/status', appCheckMiddleware, authenticateToken, requirePermission('support_tickets'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params; // This is the ticketId like "ST-MCRB95U0"
            const { status, adminNote } = req.body;
            console.log('[Support Ticket PATCH] Updating ticketId:', id, 'with status:', status);
            if (!status) {
                return res.status(400).json({ message: 'Status is required' });
            }
            // First find the document by ticketId
            const querySnapshot = await db.collection('support_tickets')
                .where('ticketId', '==', id)
                .limit(1)
                .get();
            if (querySnapshot.empty) {
                console.log('[Support Ticket PATCH] No ticket found with ticketId:', id);
                return res.status(404).json({ message: 'Support ticket not found' });
            }
            const doc = querySnapshot.docs[0];
            const updateData = {
                status,
                updatedAt: new Date()
            };
            if (adminNote) {
                updateData.adminNote = adminNote;
            }
            // Update using the actual document ID
            console.log('[Support Ticket PATCH] Updating document ID:', doc.id, 'for ticketId:', id);
            await db.collection('support_tickets').doc(doc.id).update(updateData);
            res.json({
                success: true,
                message: 'Support ticket status updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating support ticket status:', error);
            res.status(500).json({ message: 'Failed to update support ticket status' });
        }
    }));
    // Add response to support ticket (using ticketId)
    registerRoute('post', '/support-tickets/:id/responses', appCheckMiddleware, authenticateToken, requirePermission('support_tickets'), asyncHandler(async (req, res) => {
        try {
            const { id } = req.params; // This is the ticketId like "ST-MCRB95U0"
            const { message, isInternal = false } = req.body;
            const adminEmail = req.user?.email || 'admin';
            console.log('[Support Ticket Response] Adding response to ticketId:', id);
            if (!message) {
                return res.status(400).json({ message: 'Message is required' });
            }
            // First find the document by ticketId
            const querySnapshot = await db.collection('support_tickets')
                .where('ticketId', '==', id)
                .limit(1)
                .get();
            if (querySnapshot.empty) {
                console.log('[Support Ticket Response] No ticket found with ticketId:', id);
                return res.status(404).json({ message: 'Support ticket not found' });
            }
            const doc = querySnapshot.docs[0];
            const response = {
                id: Date.now().toString(),
                message,
                isInternal,
                author: adminEmail,
                authorType: 'admin',
                createdAt: new Date()
            };
            // Get current ticket to update responses array
            const currentResponses = doc.data()?.responses || [];
            const updatedResponses = [...currentResponses, response];
            console.log('[Support Ticket Response] Updating document ID:', doc.id, 'for ticketId:', id);
            await db.collection('support_tickets').doc(doc.id).update({
                responses: updatedResponses,
                updatedAt: new Date(),
                status: 'in_progress' // Auto-update status when admin responds
            });
            res.json({
                success: true,
                message: 'Response added successfully',
                response
            });
        }
        catch (error) {
            console.error('Error adding response to support ticket:', error);
            res.status(500).json({ message: 'Failed to add response to support ticket' });
        }
    }));
    // Get support tickets statistics
    registerRoute('get', '/support-tickets/stats', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        try {
            const snapshot = await db.collection('support_tickets').get();
            const tickets = snapshot.docs.map((doc) => doc.data());
            const stats = {
                total: tickets.length,
                open: tickets.filter((t) => t.status === 'open').length,
                in_progress: tickets.filter((t) => t.status === 'in_progress').length,
                resolved: tickets.filter((t) => t.status === 'resolved').length,
                closed: tickets.filter((t) => t.status === 'closed').length,
                high_priority: tickets.filter((t) => t.priority === 'high').length,
                medium_priority: tickets.filter((t) => t.priority === 'medium').length,
                low_priority: tickets.filter((t) => t.priority === 'low').length,
                by_category: {
                    tournament: tickets.filter((t) => t.category === 'tournament').length,
                    payment: tickets.filter((t) => t.category === 'payment').length,
                    technical: tickets.filter((t) => t.category === 'technical').length,
                    account: tickets.filter((t) => t.category === 'account').length,
                    other: tickets.filter((t) => t.category === 'other').length
                }
            };
            res.json(stats);
        }
        catch (error) {
            console.error('Error fetching support tickets statistics:', error);
            res.status(500).json({ message: 'Failed to fetch support tickets statistics' });
        }
    }));
    // Initialize EmailService
    const emailService = new EmailService();
    const otpStore = new Map();
    // OTP Routes
    registerRoute('post', '/auth/send-otp', asyncHandler(async (req, res) => {
        try {
            const { email, purpose = 'registration' } = req.body;
            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Invalid email format' });
            }
            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            // Store OTP with 5-minute expiry
            otpStore.set(email, {
                otp,
                expires: Date.now() + (5 * 60 * 1000), // 5 minutes
                purpose
            });
            // Send OTP email
            await emailService.sendOtpEmail(email, otp, purpose);
            res.json({
                message: 'OTP sent successfully',
                expires: 300 // 5 minutes in seconds
            });
        }
        catch (error) {
            console.error('Error sending OTP:', error);
            res.status(500).json({ message: 'Failed to send OTP' });
        }
    }));
    registerRoute('post', '/auth/verify-otp', asyncHandler(async (req, res) => {
        try {
            const { email, otp } = req.body;
            if (!email || !otp) {
                return res.status(400).json({ message: 'Email and OTP are required' });
            }
            const storedOtpData = otpStore.get(email);
            if (!storedOtpData) {
                return res.status(400).json({ message: 'OTP not found or expired' });
            }
            // Check if OTP has expired
            if (Date.now() > storedOtpData.expires) {
                otpStore.delete(email);
                return res.status(400).json({ message: 'OTP has expired' });
            }
            // Verify OTP
            if (storedOtpData.otp !== otp) {
                return res.status(400).json({ message: 'Invalid OTP' });
            }
            // OTP is valid, remove it from store
            otpStore.delete(email);
            res.json({
                message: 'OTP verified successfully',
                verified: true
            });
        }
        catch (error) {
            console.error('Error verifying OTP:', error);
            res.status(500).json({ message: 'Failed to verify OTP' });
        }
    }));
}
