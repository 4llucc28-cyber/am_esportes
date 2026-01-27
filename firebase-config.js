import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, setDoc, addDoc, deleteDoc, doc, updateDoc, query, where, orderBy, limit, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    // --- COLE SUAS CHAVES AQUI ---
    apiKey: "AIzaSyDIk7Ae8ofhPm2ReKI2safNN76lnUuXVUc",
  authDomain: "am-esportes.firebaseapp.com",
  projectId: "am-esportes",
  storageBucket: "am-esportes.firebasestorage.app",
  messagingSenderId: "854303590153",
  appId: "1:854303590153:web:f4109d1dbaf24468afb5d8",
  measurementId: "G-774KRSTS82"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, collection, getDocs, getDoc, setDoc, addDoc, deleteDoc, doc, updateDoc, query, where, orderBy, limit, increment, onAuthStateChanged, signOut };