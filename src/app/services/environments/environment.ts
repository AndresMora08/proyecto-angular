// src/environments/environment.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:5000/api', //backend de Flask


  firebase: {
    apiKey: "AIzaSyAlrM_D1XrB4S7snC-U0RMuOY_Vc6B4Spg",
    authDomain: "angular-6c2d0.firebaseapp.com",
    projectId: "angular-6c2d0",
    storageBucket: "angular-6c2d0.firebasestorage.app",
    messagingSenderId: "607223704681",
    appId: "1:607223704681:web:8841c1566bfaa74aa146f8",
    measurementId: "G-K276M3ELXW"
  }
};
const app = initializeApp(environment.firebase);

// Inicializar la Autenticación y exportarla para usarla en tus componentes <-- FALTABA ESTO
export const auth = getAuth(app);