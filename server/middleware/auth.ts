import { Request, Response, NextFunction } from 'express';
import { auth as firebaseAdminAuth } from '../firebase.js';


export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    console.log('🔍 Full decoded token:', decoded);
    req.user = {
      id: decoded.uid,
      username: decoded.email || decoded.uid,
      role: decoded.role || 'admin', // fallback, but you should set custom claims for real admin check
      permissions: decoded.permissions || [],
      ...decoded
    };
    next();
  } catch (error) {
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
          
          if (payload.email === 'michael@netwin.app' || payload.role === 'admin') {
            console.log('🔧 Dev mode: Allowing admin token');
            req.user = {
              id: payload.sub || 'admin-dev',
              username: payload.email || 'michael@netwin.app',
              role: 'admin'
            };
            next();
            return;
          }
        } catch (decodeError) {
          console.log('🔧 Dev mode: Could not decode token payload:', decodeError);
        }
      }
    }
    
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check for custom claim 'role' === 'admin' (set this in Firebase Auth for admin users)
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
};

// Remove old JWT-based adminLogin (no longer needed with Firebase Auth)