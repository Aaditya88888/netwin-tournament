import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import * as path from 'path';
let functions: any = undefined;
try {
  functions = require('firebase-functions');
} catch (e) {
  // Not running in Cloud Functions
}

// Use __dirname directly for CommonJS/Node compatibility
const __dirname = path.resolve();

// Load environment variables for local development
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Helper to get config from env or functions.config()
function getConfig(key: string, fallback?: string) {
  if (process.env.NODE_ENV === 'development' || !functions) {
    return process.env[key] || fallback;
  }
  // In production (Cloud Functions)
  return functions.config().admin[key.toLowerCase()] || fallback;
}

const projectId = getConfig('FB_PROJECT_ID');
const clientEmail = getConfig('FB_CLIENT_EMAIL');
const privateKey = getConfig('FB_PRIVATE_KEY');
const databaseURL = getConfig('FB_DATABASE_URL');

// Environment validation (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('Environment check:', {
    FB_PROJECT_ID: projectId ? `SET (${projectId})` : 'NOT SET',
    FB_CLIENT_EMAIL: clientEmail ? 'SET' : 'NOT SET',
    FB_PRIVATE_KEY: privateKey ? 'SET' : 'NOT SET'
  });
}

// Initialize Firebase Admin SDK
let firebaseApp: any = null;

if (!getApps().length) {
  try {
    const isCloudFunction = !!process.env.FUNCTION_TARGET;
    
    if (isCloudFunction) {
      firebaseApp = initializeApp({
        projectId: projectId
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('Firebase initialized with default credentials in Cloud Functions');
      }
    } else if (projectId && clientEmail && privateKey) {
      // Create service account object from environment variables
      const serviceAccount = {
        type: 'service_account',
        project_id: projectId,
        private_key_id: '',
        private_key: privateKey.replace(/\\n/g, '\n'), // Handle newlines
        client_email: clientEmail,
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
        universe_domain: 'googleapis.com'
      };
      
      firebaseApp = initializeApp({
        credential: cert(serviceAccount as any),
        projectId: projectId,
        databaseURL: databaseURL
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Firebase initialized successfully with service account, project:', projectId);
      }
    } else {
      console.error('Missing required Firebase configuration');
      throw new Error('Firebase configuration is incomplete');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error; // Re-throw to fail fast
  }
} else {
  firebaseApp = getApps()[0];
}

// Initialize Firestore
let firestore: any = null;

try {
  firestore = getFirestore(firebaseApp);
  if (process.env.NODE_ENV === 'development') {
    console.log('Firestore initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Firestore:', error);
  throw error; // Re-throw to fail fast
}

// Initialize Auth
let auth: any = null;

try {
  auth = getAuth(firebaseApp);
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Auth:', error);
  throw error; // Re-throw to fail fast
}

export { firestore, auth };

// Default export for CommonJS compatibility
export default { firestore, auth };
