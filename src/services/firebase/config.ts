import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAq91-kUVQlXW3MhwpfRPmGP7e0nWAqGT0",
  authDomain: "xredread.firebaseapp.com",
  projectId: "xredread",
  storageBucket: "xredread.firebasestorage.app",
  messagingSenderId: "822628499479",
  appId: "1:822628499479:web:873b4caca6b644e6289c52"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app; 