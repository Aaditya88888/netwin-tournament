import { config } from 'dotenv';
import admin from 'firebase-admin';

// Load environment variables
config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: process.env.FB_TYPE || process.env.FIREBASE_TYPE,
  project_id: process.env.FB_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FB_PRIVATE_KEY_ID || process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: (process.env.FB_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n'),
  client_email: process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FB_CLIENT_ID || process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FB_AUTH_URI || process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FB_TOKEN_URI || process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL || process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL || process.env.FIREBASE_CLIENT_X509_CERT_URL
};

// Initialize the app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://netwin-tournament-default-rtdb.firebaseio.com'
});

async function setAdminRole() {
  try {
    const adminUid = "iTsBtEfbCVfUZl5yTsKO0zb833s1";
    const adminEmail = "michael@netwin.app";
    
    console.log(`Setting admin role for user: ${adminEmail} (${adminUid})`);
    
    await admin.auth().setCustomUserClaims(adminUid, { 
      role: 'admin',
      permissions: ['*'],
      isAdmin: true
    });
    
    console.log('✅ Admin role set successfully!');
    
    const userRecord = await admin.auth().getUser(adminUid);
    console.log('User record:', userRecord.toJSON());
    
    console.log('Admin setup complete. You can now log in with:', adminEmail);
  } catch (error) {
    console.error('❌ Error setting admin role:', error);
  }
}

setAdminRole();