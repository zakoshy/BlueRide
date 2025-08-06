
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  projectId: "blueride-landing",
  appId: "1:80370688267:web:859f62f3354b36c17cc20e",
  storageBucket: "blueride-landing.firebasestorage.app",
  apiKey: "AIzaSyDx2Eovx2d7Fp8JqabC-h22Hp9jh90kXxY",
  authDomain: "blueride-landing.firebaseapp.com",
  messagingSenderId: "80370688267",
  databaseURL: "https://blueride-landing-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const database = getDatabase(app);


export { app, auth, database };
