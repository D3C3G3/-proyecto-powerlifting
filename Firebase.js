import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD8WV4nQ1QgGfe3cjAo8SxJO_m_Ftxfz38",
    authDomain: "pwr-tracker.firebaseapp.com",
    projectId: "pwr-tracker",
    storageBucket: "pwr-tracker.firebasestorage.app",
    messagingSenderId: "562651513088",
    appId: "1:562651513088:web:4457fc6434f962f36ab3e5",
    measurementId: "G-0FQKRQ1MNT"
  };
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const provider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  doc,
  setDoc
};
