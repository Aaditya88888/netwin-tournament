import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDzRbaJKEClGBXtGqp2t-cZkTcYy5Wso_w",
  authDomain: "netwin-tournament.firebaseapp.com",
  projectId: "netwin-tournament",
  storageBucket: "netwin-tournament.firebasestorage.app",
  messagingSenderId: "842283500427",
  appId: "1:842283500427:web:f691cb23a243cc77e4258e",
  measurementId: "G-1Y4GHK4HDJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export const RECAPTCHA_SITE_KEY = "6LefJk8rAAAAAAfLUDqssYCZ4w-5ZQu37hiW8m3h";

export default app; 