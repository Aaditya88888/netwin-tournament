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
        console.log('✅ Token verified successfully:', { uid: decoded.uid, email: decoded.email, role: decoded.role });
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
        // In development, try to be more lenient
        if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Development mode: checking if token looks like a valid admin token...');
            // Check if it's a JWT-like token structure
            if (token && token.includes('.')) {
                try {
                    // Try to decode the JWT payload (without verification for dev)
                    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                    console.log('🔧 Dev token payload:', { iss: payload.iss, aud: payload.aud, email: payload.email, role: payload.role });
                    if (payload.email === 'admin@netwin.com' || payload.role === 'admin') {
                        console.log('🔧 Dev mode: Allowing admin token');
                        req.user = {
                            id: payload.sub || 'admin-dev',
                            username: payload.email || 'admin@netwin.com',
                            role: 'admin'
                        };
                        next();
                        return;
                    }
                }
                catch (decodeError) {
                    console.log('🔧 Dev mode: Could not decode token payload:', decodeError);
                }
            }
        }
        res.status(403).json({ message: 'Invalid or expired token' });
        return;
    }
};

// Permission-based middleware: allows admins or moderators with required permission
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(403).json({ message: 'Authentication required' });
            return;
        }
        // Admins always allowed
        if (req.user.role === 'admin') {
            return next();
        }
        // Moderators: check for permissions (from custom claims or user doc fields)
        // Permissions can be in req.user.permissions (array of strings)
        const perms = req.user.permissions || [];
        if (req.user.role === 'moderator' && perms.includes(permission)) {
            return next();
        }
        res.status(403).json({ message: 'Insufficient permissions' });
    };
};
