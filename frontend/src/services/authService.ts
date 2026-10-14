
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { auth } from "../config/firebase";

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  await updateProfile(credential.user, {
    displayName: name.trim(),
  });

  return credential.user;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<User> {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  return credential.user;
}

export async function loginWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
