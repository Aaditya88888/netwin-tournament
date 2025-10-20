import { storage } from "./storage.js";
import { firestore } from './firebase.js';
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { authenticateToken, requireAdmin } from './middleware/auth.js';
import { inviteModerator } from "./moderator.js";
import { listModerators, removeModerator } from "./moderator-management.js";
// Use the initialized Firestore instance
const db = firestore;
import { appCheckMiddleware } from './middleware/appcheck.js';

import announcementsRouter from "./routes/announcements.js";
console.log("registerRoutes called");

export function registerRoutes(app) {
    console.log('DEBUG: registerRoutes function called');
    // ...existing code...
    // Check if running in Cloud Functions environment
    // Register announcements API
    app.use("/api/announcements", announcementsRouter);
    const isCloudFunction = !!(process.env.FUNCTION_TARGET ||
        process.env.FUNCTIONS_EMULATOR ||
        process.env.GCP_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.K_SERVICE ||
        process.env.GCLOUD_PROJECT ||
        process.env.FB_CONFIG);
    // Use /api prefix only when NOT running in Cloud Functions
    const apiPrefix = isCloudFunction ? "" : "/api";
    // Helper function to register routes with conditional /api prefix
    const registerRoute = (method, path, ...handlers) => {
        const fullPath = `${apiPrefix}${path}`;
        console.log(`Registering ${method.toUpperCase()} ${fullPath}`);
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
    // Middleware to handle async routes
    const asyncHandler = (fn) => (req, res) => {
        Promise.resolve(fn(req, res)).catch(error => handleError(res, error));
    };

    // ...existing code...
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

    // KYC stats endpoint for admin dashboard
    registerRoute('get', '/admin/kyc/stats', asyncHandler(async (req, res) => {
        try {
            const allUsers = await storage.getAllUsers();
            const kycStats = {
                totalUsers: allUsers.length,
                pending: allUsers.filter(u => u.kycStatus === 'pending').length,
                approved: allUsers.filter(u => u.kycStatus === 'approved').length,
                rejected: allUsers.filter(u => u.kycStatus === 'rejected').length,
                verified: allUsers.filter(u => u.kycStatus === 'verified').length,
                not_submitted: allUsers.filter(u => !u.kycStatus || u.kycStatus === 'not_submitted').length
            };
            res.json({ success: true, kycStats });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }));
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
    // User Routes - All routes are now always enabled since we deploy to Firebase
    // Wallet transactions endpoint for user/admin (fetches from Firestore 'transactions' collection)
    registerRoute('get', '/wallet/transactions', appCheckMiddleware, authenticateToken, asyncHandler(async (req, res) => {
            try {
                const snapshot = await db.collection('transactions').orderBy('createdAt', 'desc').get();
                const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                res.json({ transactions });
            } catch (error) {
                console.error('Error fetching transactions:', error);
                res.status(500).json({ message: 'Failed to fetch transactions' });
            }
        }));
        registerRoute('get', '/users', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
        registerRoute('get', '/users/stats', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            const allUsers = (await storage.getAllUsers());
            const pendingKyc = (await storage.getPendingKycUsers());
            // Helper function to safely count users by status
            const countByStatus = (users, status) => users.filter(u => u.status === status).length;
            // Helper function to safely count users by KYC status
            const countByKycStatus = (users, status) => users.filter(u => u.kycStatus === status).length;
            const stats = {
                total: allUsers.length,
                active: countByStatus(allUsers, 'active'),
                inactive: countByStatus(allUsers, 'inactive'),
                banned: countByStatus(allUsers, 'banned'),
                pendingKyc: pendingKyc.length,
                verified: countByKycStatus(allUsers, 'approved'),
                rejected: countByKycStatus(allUsers, 'rejected'),
                newUsersThisMonth: allUsers.filter(u => {
                    const userDate = u.createdAt ? new Date(u.createdAt) : null;
                    const now = new Date();
                    return userDate && userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
                }).length
            };
            res.json(stats);
        }));
        // Get users with pagination and filtering
        registerRoute('get', '/users/search', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
        registerRoute('get', '/users/kyc/pending', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            const users = await storage.getPendingKycUsers();
            res.json(users);
        }));
        // Delete a user by ID
        registerRoute('delete', '/users/:userId', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
        registerRoute('patch', '/users/:userId/kyc', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            const { userId } = req.params;
            const { kycStatus, docId, rejectionReason } = req.body;
            if (!kycStatus) {
                return res.status(400).json({ message: "KYC status is required" });
            }
            try {
                // Update the KYC document's status
                if (docId) {
                    await storage.updateKycDocumentStatus(docId, {
                        status: kycStatus,
                        rejectionReason: kycStatus === 'rejected' ? (rejectionReason || 'Document rejected by admin') : undefined,
                        verifiedAt: kycStatus === 'approved' ? new Date() : undefined
                    });
                }
                // Update the user's KYC status
                await storage.updateUserKycStatus(userId, kycStatus);
                res.json({ message: "KYC status updated successfully" });
            }
            catch (error) {
                console.error('Error updating KYC status:', error);
                res.status(500).json({ message: "Failed to update KYC status" });
            }
        }));
        // Get all users with KYC information for admin review
        registerRoute('get', '/admin/kyc', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
                    kycUsers = kycUsers.filter(user => {
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
                            idProof: latestKycDoc.frontImageUrl ? {
                                url: latestKycDoc.frontImageUrl,
                                fileName: `front_${latestKycDoc.documentType || 'id'}.jpg`,
                                uploadedAt: safeToISOString(typeof latestKycDoc.createdAt === 'number' ? new Date(latestKycDoc.createdAt) : latestKycDoc.createdAt)
                            } : null,
                            addressProof: latestKycDoc.backImageUrl ? {
                                url: latestKycDoc.backImageUrl,
                                fileName: `back_${latestKycDoc.documentType || 'id'}.jpg`,
                                uploadedAt: safeToISOString(typeof latestKycDoc.createdAt === 'number' ? new Date(latestKycDoc.createdAt) : latestKycDoc.createdAt)
                            } : null,
                            selfie: latestKycDoc.selfieUrl ? {
                                url: latestKycDoc.selfieUrl,
                                fileName: 'selfie.jpg',
                                uploadedAt: safeToISOString(typeof latestKycDoc.createdAt === 'number' ? new Date(latestKycDoc.createdAt) : latestKycDoc.createdAt)
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
        registerRoute('post', '/moderator/invite', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(inviteModerator));
        registerRoute('get', '/moderator/list', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(listModerators));
        registerRoute('post', '/moderator/remove', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(removeModerator));
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
                const registrations = registrationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const batch = db.batch();
                const results = [];
                registrations.forEach((reg, index) => {
                    const resultRef = db.collection('tournament_results').doc();
                    const resultData = {
                        tournamentId,
                        registrationId: reg.id,
                        userId: reg.userId,
                        position: index === 0 ? 1 : index === 1 ? 2 : null, // First two get positions
                        kills: Math.floor(Math.random() * 10) + 1, // Random kills 1-10
                        reward: 0, // Will be calculated during prize distribution
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    batch.set(resultRef, resultData);
                    results.push({ id: resultRef.id, ...resultData });
                });
                await batch.commit();
                res.json({
                    success: true,
                    message: `Created ${results.length} test results for tournament ${tournamentId}`,
                    results
                });
            }
            catch (error) {
                console.error('Error creating test results:', error);
                res.status(500).json({ message: 'Failed to create test results' });
            }
        }));
        // Tournament Routes - Protected Admin Routes
        registerRoute('post', '/tournaments', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
        registerRoute('patch', '/tournaments/:id', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            const id = req.params.id;
            const tournament = await storage.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ message: "Tournament not found" });
            }
            const updatedTournament = await storage.updateTournament(id, req.body);
            res.json(updatedTournament);
        }));
        registerRoute('delete', '/tournaments/:id', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
                res.status(500).json({ message: 'Failed to fetch tournaments', error: error?.message });
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
        // Get tournament registrations (must be before /tournaments/:id)
        console.log('Registering tournaments/:id/registrations route...');
        registerRoute('get', '/tournaments/:id/registrations', asyncHandler(async (req, res) => {
            const id = req.params.id;
            try {
                const registrationsSnapshot = await db.collection('tournament_registrations')
                    .where('tournamentId', '==', id)
                    .get();
                
                const registrations = registrationsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    registrationId: doc.id, // Use document ID as registrationId
                    ...doc.data()
                }));
                
                res.json(registrations);
            } catch (error) {
                console.error('Error fetching tournament registrations:', error);
                res.status(500).json({ message: 'Failed to fetch tournament registrations' });
            }
        }));
        registerRoute('get', '/tournaments/:id', asyncHandler(async (req, res) => {
            const id = req.params.id;
            const tournament = await storage.getTournament(id);
            if (!tournament) {
                return res.status(404).json({ message: "Tournament not found" });
            }
            res.json({ data: tournament });
        }));
        // Update registration record with prize distribution data
        registerRoute('patch', '/registration/:id', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { kills, position, totalPrizeEarned } = req.body;
            
            try {
                const registrationRef = db.collection('tournament_registrations').doc(id);
                const registrationDoc = await registrationRef.get();
                
                if (!registrationDoc.exists) {
                    return res.status(404).json({ message: 'Registration not found' });
                }
                
                const updateData = {
                    updatedAt: new Date()
                };
                
                // Only update fields that are provided
                if (typeof kills === 'number') updateData.kills = kills;
                if (position !== undefined && position !== null && position !== '') updateData.position = position;
                if (typeof totalPrizeEarned === 'number') updateData.totalPrizeEarned = totalPrizeEarned;
                
                await registrationRef.update(updateData);
                
                res.json({ 
                    success: true, 
                    message: 'Registration updated successfully',
                    data: { id, ...updateData }
                });
            } catch (error) {
                console.error('Error updating registration:', error);
                res.status(500).json({ message: 'Failed to update registration' });
            }
        }));
        // Stats Routes
        registerRoute('get', '/stats/dashboard', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            try {
                const users = await storage.getAllUsers();
                const tournaments = await storage.getAllTournaments();
                const activeCount = (await storage.getActiveTournaments()).length;
                const pendingKycCount = (await storage.getPendingKycUsers()).length;
                const transactions = await storage.getAllTransactions();
                // Calculate total revenue
                const revenue = transactions
                    .filter((t) => t.type === "entry_fee" && t.status === "completed")
                    .reduce((total, t) => total + t.amount, 0);
                res.json({
                    activeTournaments: activeCount,
                    registeredUsers: users.length,
                    totalRevenue: revenue,
                    pendingKyc: pendingKycCount
                });
            }
            catch (error) {
                console.error('Error fetching dashboard stats:', error);
                res.status(500).json({ message: 'Error fetching dashboard stats' });
            }
        }));
        // Dashboard Analytics Endpoints
        registerRoute('get', '/admin/dashboard/stats', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            const range = req.query.range || '7d';
            try {
                const [users, tournaments, transactions] = await Promise.all([
                    storage.getAllUsers(),
                    storage.getAllTournaments(),
                    storage.getAllTransactions()
                ]);
                // Calculate user metrics
                const totalUsers = users.length;
                const activeUsers = users.filter(u => u.status === 'active').length;
                const pendingKyc = users.filter(u => u.kycStatus === 'pending').length;
                // Calculate tournament metrics
                const totalTournaments = tournaments.length;
                const activeTournaments = tournaments.filter(t => t.status === 'live' || t.status === 'upcoming').length;
                const completedTournaments = tournaments.filter(t => t.status === 'completed').length;
                // Calculate total revenue
                const totalRevenue = transactions
                    .filter((t) => t.type === "entry_fee" && t.status === "completed")
                    .reduce((total, t) => total + t.amount, 0);
                // Calculate monthly revenue
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const monthlyRevenue = transactions
                    .filter((t) => {
                    const transDate = new Date(t.createdAt);
                    return t.type === "entry_fee" &&
                        t.status === "completed" &&
                        transDate.getMonth() === currentMonth &&
                        transDate.getFullYear() === currentYear;
                })
                    .reduce((total, t) => total + t.amount, 0);
                res.json({
                    activeTournaments,
                    registeredUsers: totalUsers,
                    totalRevenue,
                    pendingKyc,
                    overview: {
                        totalUsers,
                        activeUsers,
                        totalTournaments,
                        activeTournaments,
                        completedTournaments,
                        totalRevenue,
                        monthlyRevenue,
                        pendingPayouts: 0 // TODO: Calculate from actual payout data
                    }
                });
            }
            catch (error) {
                console.error('Error fetching dashboard stats:', error);
                res.status(500).json({ message: 'Error fetching dashboard stats' });
            }
        }));
        // Admin Tournament Stats
        registerRoute('get', '/admin/tournaments/stats', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            try {
                const tournaments = await storage.getAllTournaments();
                const stats = {
                    total: tournaments.length,
                    upcoming: tournaments.filter(t => t.status === 'upcoming').length,
                    live: tournaments.filter(t => t.status === 'live').length,
                    completed: tournaments.filter(t => t.status === 'completed').length,
                    cancelled: tournaments.filter(t => t.status === 'cancelled').length,
                    // Recent activity (last 7 days)
                    recentCreated: tournaments.filter(t => {
                        const createdDate = new Date(t.createdAt);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return createdDate >= weekAgo;
                    }).length,
                    // Prize pool totals
                    totalPrizePool: tournaments.reduce((total, t) => total + (t.prizePool || 0), 0),
                    avgPrizePool: tournaments.length ? tournaments.reduce((total, t) => total + (t.prizePool || 0), 0) / tournaments.length : 0
                };
                res.json(stats);
            }
            catch (error) {
                console.error('Error fetching tournament stats:', error);
                res.status(500).json({ message: "Failed to fetch tournament stats" });
            }
        }));
        // Admin User Stats (for dashboard)
        // Register both /api/admin/users/stats and /admin/users/stats for compatibility
        const adminUserStatsHandler = asyncHandler(async (req, res) => {
            try {
                const users = await storage.getAllUsers();
                const kycDocs = await storage.getAllKycDocuments();
                // Get verified users (users with KYC status 'approved' or 'verified')
                const verifiedUsers = users.filter(u => u.kycStatus?.toLowerCase() === 'approved' ||
                    u.kycStatus?.toLowerCase() === 'verified').length;
                // Calculate average and total balance (default to 0 if not available)
                let totalBalance = 0;
                let validUserCount = 0;
                users.forEach(user => {
                    // Check if the user has a walletBalance
                    if (user && typeof user.walletBalance === 'number') {
                        totalBalance += user.walletBalance;
                        validUserCount++;
                    }
                });
                const averageBalance = validUserCount > 0 ? totalBalance / validUserCount : 0;
                // Match the expected UserStats interface format from the frontend
                const stats = {
                    totalUsers: users.length || 0,
                    activeUsers: users.filter(u => u.status === 'active').length || 0,
                    suspendedUsers: users.filter(u => u.status === 'suspended').length || 0,
                    bannedUsers: users.filter(u => u.status === 'banned').length || 0,
                    // KYC stats
                    verifiedUsers: verifiedUsers || 0,
                    kycPendingCount: users.filter(u => u.kycStatus?.toLowerCase() === 'pending').length || 0,
                    // Recent activity (last 7 days)
                    newUsersThisWeek: users.filter(user => {
                        try {
                            const createdAt = new Date(user.createdAt);
                            const now = new Date();
                            const diff = now.getTime() - createdAt.getTime();
                            return diff < 7 * 24 * 60 * 60 * 1000;
                        } catch (e) { return false; }
                    }).length || 0,
                    // This month
                    newUsersThisMonth: users.filter(user => {
                        try {
                            const createdAt = new Date(user.createdAt);
                            const now = new Date();
                            return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
                        } catch (e) { return false; }
                    }).length || 0,
                    // Balance stats
                    totalBalance: totalBalance || 0,
                    averageBalance: averageBalance || 0
                };
                res.json(stats);
            }
            catch (error) {
                console.error('Error fetching user stats:', error);
                res.status(500).json({ message: "Failed to fetch user stats" });
            }
        });
        registerRoute('get', '/api/admin/users/stats', appCheckMiddleware, authenticateToken, requireAdmin, adminUserStatsHandler);
        registerRoute('get', '/admin/users/stats', appCheckMiddleware, authenticateToken, requireAdmin, adminUserStatsHandler);
        // Support tickets endpoint (placeholder)
        registerRoute('get', '/support-tickets', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            // TODO: Implement support tickets functionality
            res.json({
                tickets: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalCount: 0,
                    hasNext: false,
                    hasPrev: false
                }
            });
        }));
        // Wallet transactions endpoint (placeholder)
        registerRoute('get', '/admin/wallet-transactions', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            try {
                const transactions = await storage.getAllTransactions();
                res.json({
                    transactions: transactions || [],
                    pagination: {
                        currentPage: 1,
                        totalPages: Math.ceil((transactions?.length || 0) / 50),
                        totalCount: transactions?.length || 0,
                        hasNext: false,
                        hasPrev: false
                    }
                });
            }
            catch (error) {
                console.error('Error fetching wallet transactions:', error);
                res.json({
                    transactions: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalCount: 0,
                        hasNext: false,
                        hasPrev: false
                    }
                });
            }
        }));
        // Wallet Management Endpoints
        // Debug endpoint to check raw wallet data
        registerRoute('get', '/debug/wallet-data', asyncHandler(async (req, res) => {
            try {
                const depositsSnapshot = await db.collection('pending_deposits').get();
                const withdrawalsSnapshot = await db.collection('pending_withdrawals').get();
                const deposits = depositsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    status: doc.data().status,
                    amount: doc.data().amount,
                    createdAt: doc.data().createdAt
                }));
                const withdrawals = withdrawalsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    status: doc.data().status,
                    amount: doc.data().amount,
                    createdAt: doc.data().createdAt
                }));
                res.json({
                    depositsCount: deposits.length,
                    withdrawalsCount: withdrawals.length,
                    depositStatuses: deposits.map(d => d.status),
                    withdrawalStatuses: withdrawals.map(w => w.status),
                    pendingDeposits: deposits.filter(d => d.status === 'PENDING'),
                    approvedDeposits: deposits.filter(d => d.status === 'APPROVED'),
                    rejectedDeposits: deposits.filter(d => d.status === 'REJECTED'),
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
        registerRoute('get', '/wallet/deposits', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            try {
                const snapshot = await db.collection('pending_deposits')
                    .orderBy('createdAt', 'desc')
                    .get();
                const deposits = snapshot.docs.map(doc => ({
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
        registerRoute('get', '/wallet/withdrawals', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            try {
                const snapshot = await db.collection('pending_withdrawals')
                    .orderBy('createdAt', 'desc')
                    .get();
                const withdrawals = snapshot.docs.map(doc => ({
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
        // Get UPI config from admin_config/upi_settings
        registerRoute('get', '/wallet/upi-config', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            try {
                const doc = await db.collection('admin_config').doc('upi_settings').get();
                if (!doc.exists) {
                    return res.json({
                        displayName: 'Netwin Gaming',
                        upiId: '',
                        isActive: false,
                        qrCode: null
                    });
                }
                const data = doc.data();
                res.json({
                    displayName: data?.displayName || 'Netwin Gaming',
                    upiId: data?.upiId || '',
                    isActive: data?.isActive || false,
                    qrCode: data?.qrCode || null,
                    updatedAt: data?.updatedAt?.toDate?.() || null,
                    updatedBy: data?.updatedBy || null
                });
            }
            catch (error) {
                console.error('Error fetching UPI config:', error);
                res.status(500).json({ message: 'Failed to fetch UPI config' });
            }
        }));
        // Update UPI config
        registerRoute('post', '/wallet/upi-config', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
                await db.collection('admin_config').doc('upi_settings').set(updateData, { merge: true });
                res.json({ success: true, message: 'UPI config updated successfully' });
            }
            catch (error) {
                console.error('Error updating UPI config:', error);
                res.status(500).json({ message: 'Failed to update UPI config' });
            }
        }));
        // Approve deposit
        registerRoute('post', '/wallet/deposits/:id/approve', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            const depositId = req.params.id;
            if (!depositId)
                return res.status(400).json({ message: 'Missing deposit ID' });
            try {
                // Only call the storage method to approve the deposit and handle all logic there
                const result = await storage.approveDepositRequest(depositId, req.user?.email || 'admin');
                res.json(result);
            }
            catch (error) {
                handleError(res, error);
            }
        }));
        // Reject deposit
        registerRoute('post', '/wallet/deposits/:id/reject', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            try {
                const { id } = req.params;
                const { reason } = req.body;
                await db.collection('pending_deposits').doc(id).update({
                    status: 'REJECTED',
                    rejectionReason: reason || 'Rejected by admin',
                    verifiedAt: new Date(),
                    verifiedBy: 'admin-1',
                    updatedAt: new Date()
                });
                res.json({ success: true, message: 'Deposit rejected successfully' });
            }
            catch (error) {
                console.error('Error rejecting deposit:', error);
                res.status(500).json({ message: 'Failed to reject deposit' });
            }
        }));
        // Approve withdrawal
        registerRoute('post', '/wallet/withdrawals/:id/approve', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
                // Log transaction
                const transactionRef = db.collection('transactions').doc();
                await transactionRef.set({
                    userId,
                    amount: withdrawal.amount || 0,
                    type: 'withdrawal',
                    status: 'completed',
                    description: 'Wallet withdrawal approved',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                res.json({ success: true, message: 'Withdrawal approved and wallet updated', newBalance });
            }
            catch (error) {
                console.error('Error approving withdrawal:', error);
                res.status(500).json({ message: 'Failed to approve withdrawal' });
            }
        }));
        // Reject withdrawal
        registerRoute('post', '/wallet/withdrawals/:id/reject', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            try {
                const { id } = req.params;
                const { reason } = req.body;
                await db.collection('pending_withdrawals').doc(id).update({
                    status: 'REJECTED',
                    rejectionReason: reason || 'Rejected by admin',
                    verifiedAt: new Date(),
                    verifiedBy: 'admin-1',
                    updatedAt: new Date()
                });
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
                const tournaments = snapshot.docs.map(doc => ({
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
        registerRoute('get', '/tournament-management/tournament-status/:id', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
                const registrations = registrationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Get current time and calculate scheduling info
                const currentTime = new Date();
                const startTime = new Date(tournament.startTime);
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
                        registrationId: reg.id, // Use string ID directly
                        userId: reg.userId, // Use string ID directly  
                        userName: reg.userName || reg.displayName || 'Unknown',
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
        registerRoute('get', '/tournaments/:id/prize-distribution', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
                const registrations = registrationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Calculate prize pool
                const totalRegistrations = registrations.length;
                const totalEntryFees = totalRegistrations * tournament.entryFee;
                const commissionPercentage = tournament.companyCommissionPercentage || 10;
                const companyCommission = totalEntryFees * (commissionPercentage / 100);
                // Allow admin to override prize pool and per-kill reward via tournament fields
                const actualPrizePool = tournament.prizePool || (totalEntryFees - companyCommission);
                const firstPrizePercentage = tournament.firstPrizePercentage || 40;
                const perKillPercentage = tournament.perKillRewardPercentage || 60;
                const firstPrize = actualPrizePool * (firstPrizePercentage / 100);
                const killPrizePool = actualPrizePool * (perKillPercentage / 100);
                // Get results
                const resultsSnapshot = await db.collection('tournament_results')
                    .where('tournamentId', '==', id)
                    .get();
                const results = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Calculate total kills
                const totalKills = results.reduce((sum, r) => sum + (r.kills || 0), 0);
                const perKillReward = totalKills > 0 ? killPrizePool / totalKills : 0;
                // Build player prize data
                const players = registrations.map(reg => {
                    const result = results.find(r => r.userId === reg.userId);
                    const kills = result?.kills || 0;
                    const position = result?.position || null;
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
                        userName: reg.userName || 'Unknown',
                        gameId: reg.gameId || 'Unknown',
                        position,
                        kills,
                        reward,
                        rewardBreakdown
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
        registerRoute('get', '/tournaments/:id/transactions', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
                const allTransactions = transactionsSnapshot.docs.map(doc => ({
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
        registerRoute('post', '/tournament-management/start-tournament/:id', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
        registerRoute('post', '/tournament-management/complete-tournament/:id', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
        registerRoute('post', '/tournament-management/check-tournament-statuses', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            try {
                // Get all tournaments and check their statuses
                const tournaments = await storage.getAllTournaments();
                const currentTime = new Date();
                const updates = [];
                for (const tournament of tournaments) {
                    const startTime = new Date(tournament.startTime);
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
        registerRoute('post', '/tournament-management/send-tournament-notification/:id', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
                const registrations = registrationsSnapshot.docs.map(doc => doc.data());
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
        registerRoute('post', '/tournament-management/send-test-notification', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
        registerRoute('post', '/tournaments/:id/results', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const results = req.body;
            try {
                const tournament = await storage.getTournament(id);
                if (!tournament) {
                    return res.status(404).json({ message: "Tournament not found" });
                }
                const batch = db.batch();
                // Clear existing results
                const existingResultsSnapshot = await db.collection('tournament_results')
                    .where('tournamentId', '==', id)
                    .get();
                existingResultsSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                // Add new results
                results.forEach((result) => {
                    const resultRef = db.collection('tournament_results').doc();
                    batch.set(resultRef, {
                        tournamentId: id,
                        registrationId: result.registrationId,
                        userId: result.userId || null,
                        position: result.position,
                        kills: result.kills || 0,
                        reward: result.reward !== undefined ? result.reward : 0,
                        updatedAt: new Date()
                    });
                });
                await batch.commit();
                res.json({ success: true, message: "Results saved successfully" });
            }
            catch (error) {
                console.error('Error saving tournament results:', error);
                res.status(500).json({ message: "Failed to save tournament results" });
            }
        }));
        // Enhanced Distribute Prizes Endpoint - Pure Individual Logic
        registerRoute('post', '/tournaments/:id/distribute-prizes', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
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
                // Get tournament results
                const resultsSnapshot = await db.collection('tournament_results')
                    .where('tournamentId', '==', id)
                    .get();
                if (resultsSnapshot.empty) {
                    return res.status(400).json({ message: "No results found for this tournament" });
                }
                const results = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Get registrations to calculate actual prize pool
                const registrationsSnapshot = await db.collection('tournament_registrations')
                    .where('tournamentId', '==', id)
                    .get();
                const registrations = registrationsSnapshot.docs.map(doc => doc.data());
                // Calculate actual prize distribution
                const totalRegistrations = registrations.length;
                const totalEntryFees = totalRegistrations * tournament.entryFee;
                const commissionPercentage = tournament.companyCommissionPercentage || 10;
                const companyCommission = totalEntryFees * (commissionPercentage / 100);
                const actualPrizePool = tournament.prizePool || (totalEntryFees - companyCommission);
                const firstPrizePercentage = tournament.firstPrizePercentage || 40;
                const perKillPercentage = tournament.perKillRewardPercentage || 60;
                const firstPrize = actualPrizePool * (firstPrizePercentage / 100);
                const killPrizePool = actualPrizePool * (perKillPercentage / 100);
                // Calculate kill rewards
                const totalKills = results.reduce((sum, result) => sum + (result.kills || 0), 0);
                const perKillReward = totalKills > 0 ? killPrizePool / totalKills : 0;
                const batch = db.batch();
                const distributions = [];
                // Process each result
                for (const result of results) {
                    let prizeAmount = 0;
                    let prizeType = '';
                    // 1st place only
                    if (result.position === 1) {
                        prizeAmount += firstPrize;
                        prizeType = 'First Place';
                    }
                    // Kill rewards
                    const killReward = (result.kills || 0) * perKillReward;
                    if (killReward > 0) {
                        prizeAmount += killReward;
                        prizeType = prizeType ? `${prizeType} + Kill Reward` : 'Kill Reward';
                    }
                    if (prizeAmount > 0 && result.userId) {
                        // Create prize distribution record
                        const distributionRef = db.collection('prize_distributions').doc();
                        const distributionData = {
                            tournamentId: id,
                            userId: result.userId,
                            registrationId: result.registrationId,
                            position: result.position,
                            kills: result.kills || 0,
                            prizeAmount,
                            prizeType,
                            status: 'completed',
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        batch.set(distributionRef, distributionData);
                        distributions.push({ ...distributionData, id: distributionRef.id });
                        // Update user wallet balance
                        const userRef = db.collection('users').doc(result.userId.toString());
                        const userDoc = await userRef.get();
                        const currentBalance = userDoc.exists ? (userDoc.data()?.walletBalance || 0) : 0;
                        batch.update(userRef, {
                            walletBalance: currentBalance + prizeAmount,
                            updatedAt: new Date()
                        });
                        // Create transaction record
                        const transactionRef = db.collection('transactions').doc();
                        batch.set(transactionRef, {
                            userId: result.userId,
                            tournamentId: id,
                            amount: prizeAmount,
                            type: 'prize_money',
                            status: 'completed',
                            description: `Prize money for ${tournament.title} - ${prizeType}`,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                        // Update the result with reward amount
                        batch.update(db.collection('tournament_results').doc(result.id), {
                            reward: prizeAmount,
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
        // Bulk User Actions (delete, ban, etc)
        registerRoute('post', '/api/admin/users/bulk', appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
            const { action, userIds, value } = req.body;
            if (!action || !Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({ message: 'Action and userIds are required' });
            }
            try {
                const result = await storage.bulkUserAction(action, userIds, value);
                res.json({ success: true, result });
            } catch (error) {
                console.error('Bulk user action error:', error);
                res.status(500).json({ message: 'Bulk user action failed' });
            }
        }));
        console.log("All routes registered");
}
