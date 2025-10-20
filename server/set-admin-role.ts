import { config } from 'dotenv';
import { auth } from './firebase.js';

// Load environment variables
config();

/**
 * Script to set admin role for a user in Firebase
 */
async function setAdminRole() {
  try {
    // Get admin UID from environment variables
    const adminUid = process.env.ADMIN_UID || '0aOfiftKNqgMtghC0CxxYyosaEo1';
    const adminEmail = process.env.ADMIN_EMAIL || 'michael@netwin.app';
    
    console.log(`Setting admin role for user: ${adminEmail} (${adminUid})`);
    
    // Set custom claims for the admin user
    await auth.setCustomUserClaims(adminUid, { 
      role: 'admin',
      permissions: ['*'],
      isAdmin: true
    });
    
    console.log('✅ Admin role set successfully!');
    
    // Verify the claims were set
    const userRecord = await auth.getUser(adminUid);
    console.log('User record:', userRecord.toJSON());
    
    // Get custom claims
    const idTokenResult = await auth.createCustomToken(adminUid);
    console.log('Custom token created for verification');
    
    console.log('Admin setup complete. You can now log in with:', adminEmail);
  } catch (error) {
    console.error('❌ Error setting admin role:', error);
  }
}

// Run the script
setAdminRole();