import { Injectable, inject } from '@angular/core';
import { auth } from '../environments/environment';
import { signOut } from 'firebase/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private router = inject(Router);

  // Almacena los datos del usuario validado localmente
  setCurrentSession(userBackend: any, firebaseToken: string): void {
    localStorage.setItem('token', firebaseToken);
    localStorage.setItem('user', JSON.stringify(userBackend));
  }

  // Obtiene el usuario actual logueado
  getCurrentUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Cierra la sesión en Firebase y limpia el almacenamiento local
  logout(): void {
    signOut(auth).then(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.router.navigate(['/signin']);
    });
  }
}