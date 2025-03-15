// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBdLzhc6y-wl1WgUGZtLM-KwEVMJzGLXUg",
  authDomain: "incommon-5a80d.firebaseapp.com",
  projectId: "incommon-5a80d",
  storageBucket: "incommon-5a80d.appspot.com",
  messagingSenderId: "628109166184",
  appId: "1:628109166184:web:c32f3050c96227bcfb9ddd",
  measurementId: "G-1DGT55E1YT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore();;
