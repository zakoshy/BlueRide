
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDwQtAH3BhE-qKxrWZnV_VBYlj8mple9fg",
  authDomain: "blueride-landing.firebaseapp.com",
  projectId: "blueride-landing",
  storageBucket: "blueride-landing.appspot.com",
  messagingSenderId: "80370688267",
  appId: "1:80370688267:web:859f62f3354b36c17cc20e",
  databaseURL: "https://blueride-landing-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const database = getDatabase(app);


export { app, auth, database };
