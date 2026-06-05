import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core'; 
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Auth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

export type OAuthProviderType = 'google' | 'microsoft' | 'github';

export interface OAuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isRegistered: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class OauthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private injector = inject(Injector);

  redirectToProvider(provider: OAuthProviderType): Promise<OAuthResponse> {
    let authProvider;

    switch (provider) {
      case 'google':
        authProvider = new GoogleAuthProvider();
        break;
      case 'github':
        authProvider = new GithubAuthProvider();
        break;
      case 'microsoft':
        authProvider = new OAuthProvider('microsoft.com');
        break;
    }

    if (!authProvider) {
      return Promise.reject({ code: 'auth/invalid-provider' });
    }

    return runInInjectionContext(this.injector, () => {
      return signInWithPopup(this.auth, authProvider)
        .then(async (result) => {
          const user = result.user;
          const token = await user.getIdToken();
          
          // Creamos una referencia al documento del usuario: coleccion 'users', id 'user.uid'
          const userDocRef = doc(this.firestore, `users/${user.uid}`);
          
          // Realizamos la consulta asíncrona a la base de datos
          const userSnapshot = await getDoc(userDocRef);
          
          let isUserRegistered = false;
          let assignedRole = '';

          // Si el documento existe en Firestore, extraemos sus datos reales
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            isUserRegistered = true;
            assignedRole = userData['role'] || 'Ciudadano'; // Rol de la BD o por defecto Ciudadano
          }

          const response: OAuthResponse = {
            token: token,
            user: {
              id: user.uid,
              email: user.email || '',
              name: user.displayName || 'Usuario Externo',
              role: assignedRole,
              isRegistered: isUserRegistered
            }
          };

          // Guardamos en LocalStorage únicamente si el perfil ya existe completo en la BD
          if (isUserRegistered) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(response.user));
            
            // Redirigimos de inmediato según su rol real de la base de datos
            this.redirectBasedOnRole(assignedRole);
          }

          return response; 
        });
    });
  }

private redirectBasedOnRole(role: string): void {
    if (role === 'Administrador' || role === 'Funcionario') {
      this.router.navigate(['/admin/category-management']);
    } else {
      this.router.navigate(['/dashboard/ecommerce']);
    }
  }

  handleCallback(provider: OAuthProviderType, code: string): Observable<OAuthResponse> {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    return of({
      token: localStorage.getItem('token') || 'mock-firebase-token',
      user: {
        id: 'firebase-user-id',
        email: localUser.email || 'correo@ejemplo.com',
        name: localUser.name || 'Usuario Externo',
        role: localUser.role || 'Ciudadano',
        isRegistered: true
      }
    });
  }

  logout(): void {
    signOut(this.auth).then(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 👇 Cambiado de '/auth/sign-in' a '/signin'
      this.router.navigate(['/signin']);
    });
  }
}