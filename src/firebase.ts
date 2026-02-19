import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEpSXToYboXXisTuuE8n7aS1sLwFB4dpc",
  authDomain: "jpakjr-37793.firebaseapp.com",
  databaseURL: "https://jpakjr-37793.firebaseio.com",
  projectId: "jpakjr-37793",
  storageBucket: "jpakjr-37793.firebasestorage.app",
  messagingSenderId: "971513558823",
  appId: "1:971513558823:web:f12d7928080be10b565b02",
  measurementId: "G-2Q92575H0G",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
