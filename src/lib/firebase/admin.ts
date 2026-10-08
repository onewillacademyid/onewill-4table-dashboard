/**
 * Onewill Academy | Server-Only Firebase Admin SDK Initialization
 * This module is STRICTLY FOR SERVER SIDE USE (API Routes, Server Components, Server Actions).
 * NEVER import this file into any client component ('use client').
 */

import 'server-only';
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Double runtime safeguard against client execution
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: Firebase Admin SDK imported on client side!');
}

let adminApp: App | undefined;

/**
 * Returns lazy-initialized Firebase Admin App.
 * Prefers explicit service account credentials from environment variables.
 * Falls back to Application Default Credentials (ADC) if running in Google Cloud.
 */
export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApp();
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (projectId && clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } else {
    // Fallback for ADC / App Hosting / Cloud Run environment
    adminApp = initializeApp({
      projectId,
    });
  }

  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
