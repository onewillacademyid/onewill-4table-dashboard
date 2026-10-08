/**
 * Onewill Academy | Client Firebase Initialization
 * Safe client-only Firebase Web SDK setup for authentication and client access.
 * NEVER import firebase-admin in this file or any client component.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

let clientApp: FirebaseApp | undefined;
let clientAuth: Auth | undefined;
let clientDb: Firestore | undefined;
let googleAuthProvider: GoogleAuthProvider | undefined;

/**
 * Returns lazy-initialized client Firebase SDK instances.
 * Lazy initialization ensures Next.js pre-rendering and build steps
 * complete safely even when environment variables are placeholders.
 */
export function getClientFirebase(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
} {
  if (!clientApp) {
    clientApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  if (!clientAuth) {
    clientAuth = getAuth(clientApp);
  }
  if (!clientDb) {
    clientDb = getFirestore(clientApp);
  }
  if (!googleAuthProvider) {
    googleAuthProvider = new GoogleAuthProvider();
    googleAuthProvider.setCustomParameters({
      prompt: 'select_account',
    });
  }

  return {
    app: clientApp,
    auth: clientAuth,
    db: clientDb,
    googleProvider: googleAuthProvider,
  };
}

export function getClientAuth(): Auth {
  return getClientFirebase().auth;
}

export function getClientDb(): Firestore {
  return getClientFirebase().db;
}

export function getGoogleProvider(): GoogleAuthProvider {
  return getClientFirebase().googleProvider;
}
