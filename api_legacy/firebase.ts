import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK (use default credentials or set up service account as needed)
const app = initializeApp();
export const firestore = getFirestore(app);
