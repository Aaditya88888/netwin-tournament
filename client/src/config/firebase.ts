import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// Set up App Check debug token BEFORE Firebase initialization
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  console.log('Firebase App Check debug mode enabled');
}


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDzRbaJKEClGBXtGqp2t-cZkTcYy5Wso_w",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "netwin-tournament.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "netwin-tournament",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "netwin-tournament.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "842283500427",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:842283500427:web:f691cb23a243cc77e4258e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-1Y4GHK4HDJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Only use emulators in development mode if explicitly enabled
const isDevelopment = import.meta.env.DEV;
const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

if (isDevelopment && useEmulators) {
  try {
    // Connect to Firebase emulators only if they're running
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.log('Emulator connection failed, using production Firebase:', error);
  }
} else {
  console.log('Using production Firebase services');
}

// Initialize Analytics (only in production)
export const analytics = !isDevelopment ? getAnalytics(app) : null;

export const RECAPTCHA_SITE_KEY = "6LefJk8rAAAAAAfLUDqssYCZ4w-5ZQu37hiW8m3h";

export default app;
