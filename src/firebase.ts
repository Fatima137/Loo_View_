// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Import the Auth service
// import { getAuth } from 'firebase/auth'; // Added import for Authentication
import { getFirestore } from 'firebase/firestore'; // Zorg ervoor dat deze import er is!
import { getStorage } from 'firebase/storage';

// Jouw web app's Firebase configuration (gevonden in de console)
const firebaseConfig = {
  apiKey: "AIzaSyBdVrKB7k5tnOZ6n-bz8A9pn2uGjA6JbxE",
  authDomain: "looview-6k3nm.firebaseapp.com",
  projectId: "looview-6k3nm",
  storageBucket: "looview-6k3nm.firebasestorage.app",
  messagingSenderId: "656047439150",
  appId: "1:656047439150:web:c67219b2b6291305a48ebf"
  // measurementId: "YOUR_MEASUREMENT_ID", // Voeg deze toe als je die ook hebt
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app); // Initialize Auth

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app); // <--- Zorg ervoor dat deze lijn aanwezig is en db wordt geëxporteerd
const storage = getStorage(app); 

export { app, auth, db , storage}; // Exporteer app, auth, and db
