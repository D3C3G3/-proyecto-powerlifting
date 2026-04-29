import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {

  apiKey: "TU_API_KEY",

  authDomain: "TU_AUTH_DOMAIN",

  projectId: "TU_PROJECT_ID",

  storageBucket: "TU_STORAGE_BUCKET",

  messagingSenderId: "TU_MESSAGING_ID",

  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  doc,
  setDoc
};
