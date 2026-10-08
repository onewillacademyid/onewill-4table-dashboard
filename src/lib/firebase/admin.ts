
/**
 * Onewill Academy | Server-Only Firebase Admin SDK Initialization
 * Used only by trusted Next.js server-side code.
 */

import 'server-only';

import {
  initializeApp,
  getApps,
  getApp,
  cert,
  applicationDefault,
  type App,
} from 'firebase-admin/app';

import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App | undefined;

/**
 * Initialize Firebase Admin only when needed.
 * Validate project identity before connecting.
 */
export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // 1. Validate the server Firebase project configuration.
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

  if (!projectId) {
    throw new Error(
      'FIREBASE_PROJECT_ID is required for Firebase Admin initialization.'
    );
  }

  const clientProjectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

  if (clientProjectId && clientProjectId !== projectId) {
    throw new Error(
      'Firebase client and server Project IDs do not match.'
    );
  }

  // 2. Reuse existing Firebase Admin instance.
  if (getApps().length > 0) {
    adminApp = getApp();

    if (adminApp.options.projectId !== projectId) {
      throw new Error(
        'Existing Firebase Admin app uses a different Project ID.'
      );
    }

    return adminApp;
  }

  // 3. Read optional service account credentials.
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, '\n')
    .trim();

  const hasClientEmail = Boolean(clientEmail);
  const hasPrivateKey = Boolean(privateKey);

  // Reject partial credential configuration.
  if (hasClientEmail !== hasPrivateKey) {
    throw new Error(
      'Incomplete Firebase Admin service account credentials.'
    );
  }

  const hasServiceAccount = hasClientEmail && hasPrivateKey;

  if (hasServiceAccount) {
    if (
      clientEmail!.includes('xxxxx') ||
      privateKey!.includes('YOUR_PRIVATE_KEY_HERE')
    ) {
      throw new Error(
        'Firebase Admin credentials contain placeholder values.'
      );
    }

    // 4A. Explicit service account configuration.
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail: clientEmail!,
        privateKey: privateKey!,
      }),
      projectId,
    });
  } else {
    // 4B. Application Default Credentials (ADC).
    // For local gcloud authentication or Google Cloud runtime.
    adminApp = initializeApp({
      credential: applicationDefault(),
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

