import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';


// Firebase configuration - you may need to update these values
const firebaseConfig = {
  apiKey: "AIzaSyDzRbaJKEClGBXtGqp2t-cZkTcYy5Wso_w",
  authDomain: "netwin-tournament.firebaseapp.com",
  projectId: "netwin-tournament",
  storageBucket: "netwin-tournament.firebasestorage.app",
  messagingSenderId: "842283500427",
  appId: "1:842283500427:web:f691cb23a243cc77e4258e",
  measurementId: "G-1Y4GHK4HDJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Only use emulators in development if explicitly enabled
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const useEmulators = import.meta.env?.VITE_USE_FIREBASE_EMULATORS === 'true';

if (isDevelopment && useEmulators) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.log('Emulators already connected or not available');
  }
} else {
  console.log('Using production Firebase Storage for KYC documents');
}

// Base document interface
export interface BaseDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  TOURNAMENTS: 'tournaments',
  MATCHES: 'matches',
  REGISTRATIONS: 'registrations',
  RESULTS: 'results',
  TRANSACTIONS: 'transactions',
  ANNOUNCEMENTS: 'announcements',
  KYC_REQUESTS: 'kyc_requests'
} as const;

// Common Firebase operations
export async function createDocument<T>(collectionName: string, data: T): Promise<string> {
  const { addDoc, collection } = await import('firebase/firestore');
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return docRef.id;
}

export async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
  const { updateDoc, doc } = await import('firebase/firestore');
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: new Date()
  });
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  const { deleteDoc, doc } = await import('firebase/firestore');
  await deleteDoc(doc(db, collectionName, id));
}

export interface PaginationQuery<T> {
  data: T[];
  lastDoc?: any;
  hasMore: boolean;
}

export async function getPaginatedData<T>(
  collectionName: string,
  pageSize: number,
  lastDoc?: any,
  filters?: [string, any, any][],
  orderBy?: string,
  orderDirection: 'asc' | 'desc' = 'desc'
): Promise<PaginationQuery<T>> {
  const { getDocs, collection, query, where, orderBy: firestoreOrderBy, limit, startAfter } = await import('firebase/firestore');
  
  let q = collection(db, collectionName);
  let queryConstraints: any[] = [];

  // Add filters
  if (filters) {
    filters.forEach(([field, operator, value]) => {
      queryConstraints.push(where(field, operator, value));
    });
  }

  // Add ordering
  if (orderBy) {
    queryConstraints.push(firestoreOrderBy(orderBy, orderDirection));
  }

  // Add pagination
  queryConstraints.push(limit(pageSize + 1)); // Get one extra to check if there are more

  // Start after last document if provided
  if (lastDoc) {
    queryConstraints.push(startAfter(lastDoc));
  }

  const finalQuery = query(q, ...queryConstraints);
  const snapshot = await getDocs(finalQuery);
  
  const docs = snapshot.docs.slice(0, pageSize);
  const hasMore = snapshot.docs.length > pageSize;
  const newLastDoc = docs.length > 0 ? docs[docs.length - 1] : undefined;

  return {
    data: docs.map(doc => ({ id: doc.id, ...doc.data() } as T)),
    lastDoc: newLastDoc,
    hasMore
  };
}

// File upload utility
export async function uploadFile(path: string, file: File): Promise<string> {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

// File delete utility
export async function deleteFile(path: string): Promise<void> {
  const { ref, deleteObject } = await import('firebase/storage');
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

export default app;
