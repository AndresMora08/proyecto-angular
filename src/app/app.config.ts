import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http'; // 👈 Necesario para conectar con Flask

import { routes } from './app.routes';

// 🔥 Importaciones oficiales de Angular para Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';

// 🍪 Importaciones para el manejo de Cookies
import { CookieService } from 'ngx-cookie-service';
import { STORAGE_PROVIDER } from './storage/storage.provider'; // Ajusta la ruta
import { CookieStorageProvider } from './storage/cookie_storage.provider'; // Ajusta la ruta

// 🔗 Importamos el archivo de entorno centralizado
import { environment } from './services/environments/environment'; // Ajusta la ruta si es necesario  

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(), // 👈 Habilita que Angular pueda hacer peticiones a tus APIs de Postman

    // 🔥 Inicializamos Firebase usando tus nuevas credenciales del environment
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    
    // 🔥 Inicializamos el servicio de autenticación global (el equivalente a getAuth)
    provideAuth(() => getAuth()),

    // 🍪 Estrategia de almacenamiento basada en Cookies que definimos antes
    CookieService,
    { provide: STORAGE_PROVIDER, useClass: CookieStorageProvider }
  ]
};