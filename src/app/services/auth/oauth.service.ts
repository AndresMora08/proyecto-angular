import { Injectable, inject } from '@angular/core';
import { auth } from '../environments/environment';
import { signOut } from 'firebase/auth';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private router = inject(Router);

  // BehaviorSubject que expone síncronamente el estado del usuario actual al iniciar aplicación
  private currentUserSubject = new BehaviorSubject<any>(this.getInitialUser());
  public currentUser$: Observable<any> = this.currentUserSubject.asObservable();

  private getInitialUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Almacena los datos del usuario validado localmente y notifica a los componentes
  setCurrentSession(userBackend: any, firebaseToken: string): void {
    localStorage.setItem('token', firebaseToken);
    localStorage.setItem('user', JSON.stringify(userBackend));
    this.currentUserSubject.next(userBackend); // 🔥 Notificación reactiva inmediata
  }

  // Obtiene el valor estático instantáneo
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  // Cierra la sesión en Firebase, limpia almacenamiento y notifica nulo
  logout(): void {
    signOut(auth).then(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.currentUserSubject.next(null); // 🔥 Limpieza reactiva inmediata
      this.router.navigate(['/signin']);
    });
  }
}