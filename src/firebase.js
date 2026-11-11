import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Tus llaves de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDbAUA9cINvli-b95KOMWyJFKjadV_065k",
  authDomain: "importa-saas.firebaseapp.com",
  projectId: "importa-saas",
  storageBucket: "importa-saas.firebasestorage.app",
  messagingSenderId: "118330582470",
  appId: "1:118330582470:web:cbfa5a0858b872d7993ec7"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);