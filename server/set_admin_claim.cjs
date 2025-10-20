// Script to set the 'role: admin' custom claim for a Firebase Auth user
// Usage: node server/set_admin_claim.cjs

const admin = require('firebase-admin');
const path = require('path');

// Update the path if your serviceAccount.json is elsewhere
const serviceAccount = require(path.resolve(__dirname, '../config/firebase/serviceAccount.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const uid = 'LKrzPeqgTHTlii8f6SaZiiuGWNJ3'; // admin@netwin.com

admin.auth().setCustomUserClaims(uid, { role: 'admin' })
  .then(() => {
    console.log(`Custom claim 'role: admin' set for user ${uid}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error setting custom claim:', err);
    process.exit(1);
  });
