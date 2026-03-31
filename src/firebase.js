import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Gracefully handle missing Firebase config (e.g. Netlify deploy without env vars)
let db = null
try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    const app = initializeApp(firebaseConfig)
    db = getFirestore(app)
  } else {
    console.warn('Firebase config missing — running in offline mode')
  }
} catch (err) {
  console.warn('Firebase init failed:', err.message)
}

export { db }
