
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDx2Eovx2d7Fp8JqabC-h22Hp9jh90kXxY",
  authDomain: "blueride-landing.firebaseapp.com",
  projectId: "blueride-landing",
  storageBucket: "blueride-landing.firebasestorage.app",
  messagingSenderId: "80370688267",
  appId: "1:80370688267:web:859f62f3354b36c17cc20e",
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
