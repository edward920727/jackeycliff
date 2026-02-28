// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getAnalytics, Analytics } from 'firebase/analytics'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDKnfp12btImXorjB4Jic6BimZRJ0K0Loo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "table-game-2b77d.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "table-game-2b77d",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "table-game-2b77d.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "594809215578",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:594809215578:web:d1d7f1d7a0d449b4819663",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-2PXZD6RZ5B"
}

// Initialize Firebase
let app: FirebaseApp
let db: Firestore
let analytics: Analytics | null = null

// Initialize app (works on both client and server)
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

// Initialize Firestore (works on both client and server)
db = getFirestore(app)

// Initialize Analytics only in browser
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app)
  } catch (error) {
    // Analytics might fail if already initialized
    console.warn('Analytics initialization failed:', error)
  }
}

export { app, db, analytics }
