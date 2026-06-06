import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core'; // 🚀 AÑADIDO: Importación para el control de cambios automático
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from './services/environments/environment';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    // 🚀 AÑADIDO: Despierta el supervisor Zone.js para que las tablas se actualicen solas con el backend
    provideZoneChangeDetection({ eventCoalescing: true }), 
    
    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ]
};