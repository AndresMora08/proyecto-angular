// src/environments/environment.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:5000/api', //backend de Flask


  firebase: {
   apiKey: "AIzaSyAJTedQWQmuhfvRI8W6gmaHqKKlqg8xKrU",
  authDomain: "proyecto-angular-dab35.firebaseapp.com",
  projectId: "proyecto-angular-dab35",
  storageBucket: "proyecto-angular-dab35.firebasestorage.app",
  messagingSenderId: "859669609740",
  appId: "1:859669609740:web:c89820d587382c65eb9d29",
  measurementId: "G-75N5QZK2Y8"

  }
};
const app = initializeApp(environment.firebase);

// Inicializar la Autenticación y exportarla para usarla en tus componentes <-- FALTABA ESTO
export const auth = getAuth(app);