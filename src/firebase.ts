import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

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

const app = initializeApp({ ...firebaseConfig, projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || firebaseConfig.projectId });
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');

if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_FIREBASE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
} else if (process.env.REACT_APP_FIREBASE_APPCHECK_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(process.env.REACT_APP_FIREBASE_APPCHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
