import { auth as firebaseAdminAuth } from '../firebase.js';
// Simple admin credentials - no Firebase auth needed
const ADMIN_CONFIG = {
    uid: 'admin-1',
    username: 'admin', // Changed from email to username
    password: 'admin123',
    role: 'admin',
    isAdmin: true
};
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'Access token is required' });
        return;
    }
    try {
        // Verify Firebase ID token
        const decoded = await firebaseAdminAuth.verifyIdToken(token);
        req.user = {
            id: decoded.uid,
            username: decoded.email || decoded.uid,
            role: decoded.role || 'admin', // fallback, but you should set custom claims for real admin check
            ...decoded
        };
        next();
    }
    catch (error) {
        console.error('Firebase token verification failed:', error);
        res.status(403).json({ message: 'Invalid or expired token' });
        return;
    }
};
export const requireAdmin = (req, res, next) => {
    // Check for custom claim 'role' === 'admin' (set this in Firebase Auth for admin users)
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ message: 'Admin access required' });
        return;
    }
    next();
};
// Remove old JWT-based adminLogin (no longer needed with Firebase Auth)
