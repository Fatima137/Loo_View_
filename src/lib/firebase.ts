import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (typeof window !== 'undefined' && !firebaseConfig.apiKey) {
  console.error(
    "Firebase API Key is missing. Firebase services will not work correctly. " +
    "Please set NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file. " +
    "Ensure the key is correct and the Firebase project is properly configured in the Firebase Console (e.g., Authentication enabled, domains authorized)."
  );
}

let app: FirebaseApp;
// Initialize Firebase
if (getApps().length === 0) {
  if (firebaseConfig.apiKey) { // Only initialize if API key is present
    app = initializeApp(firebaseConfig);
  } else {
    // Create a dummy app or handle the error appropriately if API key is missing
    // This prevents further errors if Firebase is used without proper initialization
    // For now, we'll log an error and proceed, which might lead to runtime errors if auth/db are used.
    console.error("Firebase app could not be initialized due to missing API key.");
    // A more robust solution might involve not exporting auth/db or using mock objects.
    // However, to keep changes minimal and focused on the reported error:
    app = {} as FirebaseApp; // This is a risky assignment, but prevents immediate crash on import.
  }
} else {
  app = getApps()[0];
}

// Get Auth and Firestore instances
// These will throw errors if 'app' is not a valid FirebaseApp instance (e.g. if API key was missing)
let auth: Auth;
let db: Firestore;

try {
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Error initializing Firebase Auth/Firestore. This might be due to an invalid API key or configuration:", error);
  // Provide non-functional fallbacks to prevent app crashes on import,
  // though components using auth/db will likely fail.
  auth = {} as Auth;
  db = {} as Firestore;
}

let storage: FirebaseStorage;
try {
  storage = getStorage(app);
} catch (error) {
  console.error("Error initializing Firebase Storage:", error);
  storage = {} as FirebaseStorage;
}

export { app, auth, db, storage };

