import { storage } from "../lib/storage.js";
import { appCheckMiddleware } from "../lib/middleware/appcheck.js";
import { authenticateToken, requireAdmin } from "../lib/middleware/auth.js";
// Helper to wrap async route handlers
const asyncHandler = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((error) => res.status(500).json({ message: error.message || "Internal Server Error" }));
/**
 * Registers all KYC-related routes on the Express app instance.
 * @param app Express app
 * @param apiPrefix API prefix string (e.g. '/api/v1')
 */
export function registerKycRoutes(app, apiPrefix) {
    // Admin KYC review endpoint (full logic moved from routes.ts)
    app.get(`${apiPrefix}/admin/kyc`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        const { status, search, sortBy = 'kycSubmittedAt', sortOrder = 'desc', page = 1, limit = 50 } = req.query;
        try {
            const [allUsers, allKycDocuments] = await Promise.all([
                storage.getAllUsers(),
                storage.getAllKycDocuments()
            ]);
            const kycDocumentsByUser = new Map();
            allKycDocuments.forEach((doc) => {
                if (!kycDocumentsByUser.has(doc.userId)) {
                    kycDocumentsByUser.set(doc.userId, []);
                }
                kycDocumentsByUser.get(doc.userId).push(doc);
            });
            let kycUsers = allUsers.filter((user) => {
                const hasKycDocuments = kycDocumentsByUser.has(user.id || user.uid);
                return hasKycDocuments;
            });
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
            if (search) {
                const searchLower = search.toLowerCase();
                kycUsers = kycUsers.filter((user) => user.name?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower) ||
                    user.username?.toLowerCase().includes(searchLower) ||
                    user.phoneNumber?.toLowerCase().includes(searchLower));
            }
            if (sortBy && sortOrder) {
                kycUsers.sort((a, b) => {
                    let aValue = a[sortBy];
                    let bValue = b[sortBy];
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
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const paginatedUsers = kycUsers.slice(startIndex, endIndex);
            const formattedUsers = paginatedUsers.map((user) => {
                const safeToISOString = (dateValue) => {
                    if (!dateValue)
                        return null;
                    try {
                        const date = new Date(dateValue);
                        if (isNaN(date.getTime()))
                            return null;
                        return date.toISOString();
                    }
                    catch {
                        return null;
                    }
                };
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
                    riskScore: 0,
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
    // Admin KYC review endpoints (moved from routes.ts)
    app.get(`${apiPrefix}/admin/kyc`, appCheckMiddleware, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
        // ...existing admin KYC review logic from routes.ts...
    }));
    // Add any other KYC/admin KYC endpoints here as needed
    // Debug endpoint to check users and KYC data (no auth required for testing)
    app.get(`${apiPrefix}/debug/users-kyc`, asyncHandler(async (req, res) => {
        const allUsers = await storage.getAllUsers();
        const usersWithKyc = allUsers.filter((user) => user.kycStatus && user.kycStatus !== 'not_submitted');
        const kycStats = {
            totalUsers: allUsers.length,
            usersWithKyc: usersWithKyc.length,
            kycStatuses: {
                pending: allUsers.filter((u) => u.kycStatus === 'pending').length,
                approved: allUsers.filter((u) => u.kycStatus === 'approved').length,
                rejected: allUsers.filter((u) => u.kycStatus === 'rejected').length,
                verified: allUsers.filter((u) => u.kycStatus === 'verified').length,
                not_submitted: allUsers.filter((u) => !u.kycStatus || u.kycStatus === 'not_submitted').length
            }
        };
        const sampleUsers = usersWithKyc.slice(0, 3).map((user) => ({
            id: user.id || user.uid,
            name: user.name || user.displayName || user.username,
            email: user.email,
            kycStatus: user.kycStatus,
            kycDocuments: user.kycDocuments,
            createdAt: user.createdAt
        }));
        res.json({ success: true, stats: kycStats, sampleUsers });
    }));
    // ...add other KYC-related routes here, using app.get/post/put/delete etc...
}
