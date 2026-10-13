
import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const firebaseAdminApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: applicationDefault(),
      });

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);
