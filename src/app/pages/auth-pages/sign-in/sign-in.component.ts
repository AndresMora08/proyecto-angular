import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SecurityService } from '../../../services/auth/oauth.service';
import { OfficialService } from '../../../services/official/official.service';
import { CitizenService } from '../../../services/citizen/citizen.service';
import { AuthPageLayoutComponent } from '../../../shared/layout/auth-page-layout/auth-page-layout.component';
import { LoggerService } from '../../../shared/services/logger.service';
import Swal from 'sweetalert2';

import { auth } from '../../../services/environments/environment';
import { 
  signInWithPopup,
  GoogleAuthProvider, 
  GithubAuthProvider, 
  OAuthProvider, 
  AuthProvider,
  signInAnonymously
} from 'firebase/auth';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, RouterModule, AuthPageLayoutComponent],
  templateUrl: './sign-in.component.html'
})
export class SignInComponent {
  private router = inject(Router);
  private securityService = inject(SecurityService);
  private officialService = inject(OfficialService);
  private citizenService = inject(CitizenService);
  private logger = inject(LoggerService);

  isLoading: boolean = false;

  /**
   * 🔍 Valida si el correo existe en las tablas de Flask (Funcionarios o Ciudadanos)
   */
  private async validateUserInBackendTables(email: string): Promise<{ user: any; type: 'OFFICIAL' | 'CITIZEN' } | null> {
    try {
      const officials = await this.officialService.getAll().toPromise() || [];
      const officialUser = officials.find((o: any) => o.email?.toLowerCase() === email.toLowerCase());
      
      if (officialUser) {
        return { user: officialUser, type: 'OFFICIAL' };
      }

      const citizens = await this.citizenService.getAll().toPromise() || [];
      const citizenUser = citizens.find((c: any) => c.email?.toLowerCase() === email.toLowerCase());
      
      if (citizenUser) {
        return { user: citizenUser, type: 'CITIZEN' };
      }

      return null;
    } catch (error) {
      console.error("❌ Error consultando tablas de Flask:", error);
      return null;
    }
  }

  /**
   * 🌐 Gestión unificada de Login Social con Bypass para multi-proveedor
   */
  async handleSocialLogin(provider: AuthProvider, providerName: string): Promise<void> {
    this.isLoading = true;

    try {
      // 1. Intentar inicio de sesión estándar por PopUp
      const result = await signInWithPopup(auth, provider);
      await this.processSuccessfulLogin(result.user, providerName);

    } catch (error: any) {
      // 🔥 EL BYPASS: Si la cuenta ya existe con otro método (ej: Entró con Google y ahora usa Microsoft)
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;

        if (email) {
          // 2. Verificar de inmediato si el usuario es real en Flask (BDLocal)
          const backendValidation = await this.validateUserInBackendTables(email);
          
          if (backendValidation) {
            console.log(`⚠️ Bypass activado para ${email}. Ignorando restricción de Firebase...`);
            
            // 3. Crear una sesión puente en Firebase para obtener un token estructural válido
            const anonCredential = await signInAnonymously(auth);
            const backupToken = await anonCredential.user.getIdToken();

            // 4. Mapear y guardar la sesión usando la información verídica de tu Backend
            let userFirstName = backendValidation.user.name ? backendValidation.user.name.split(' ')[0] : 'Usuario';
            const assignedRole = backendValidation.type === 'OFFICIAL' ? (backendValidation.user.role || 'Funcionario') : 'Ciudadano';
            backendValidation.user.role = assignedRole;

            this.securityService.setCurrentSession(backendValidation.user, backupToken);

            this.isLoading = false;
            Swal.fire({
              icon: 'success',
              title: `¡Bienvenido, ${userFirstName}!`,
              text: `Sesión autorizada exitosamente mediante verificación de datos del sistema.`,
              timer: 2500,
              showConfirmButton: false
            });

            this.redirectBasedOnRole();
            return;
          } else {
            this.isLoading = false;
            Swal.fire({
              icon: 'error',
              title: 'Acceso Denegado',
              text: `El correo ${email} no se encuentra registrado en el sistema de ciudadanos ni oficiales.`
            });
            return;
          }
        }
      }

      // Control de otras excepciones (ej: cerrar el PopUp antes de tiempo)
      this.isLoading = false;
      console.error(`Error de autenticación con ${providerName}:`, error);
      if (error.code === 'auth/popup-closed-by-user') return;

      Swal.fire({
        icon: 'error',
        title: 'Error de acceso',
        text: `No se pudo completar la autenticación con ${providerName}.`
      });
    }
  }

  /**
   * 🛠️ Procesa el almacenamiento de sesión tras un inicio limpio sin colisión de credenciales
   */
  private async processSuccessfulLogin(firebaseUser: any, providerName: string): Promise<void> {
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('No se pudo recuperar un usuario de Firebase válido o el correo es nulo.');
    }

    const backendValidation = await this.validateUserInBackendTables(firebaseUser.email);

    if (!backendValidation) {
      this.isLoading = false;
      Swal.fire({
        icon: 'warning',
        title: 'Cuenta no registrada',
        text: `El correo ${firebaseUser.email} no está dado de alta en la plataforma corporativa.`,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    let userFirstName = backendValidation.user.name ? backendValidation.user.name.split(' ')[0] : '';
    if (!userFirstName) {
      userFirstName = firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0] : 'Usuario';
    }

    const assignedRole = backendValidation.type === 'OFFICIAL' ? (backendValidation.user.role || 'Funcionario') : 'Ciudadano';
    backendValidation.user.role = assignedRole;

    const token = await firebaseUser.getIdToken();
    this.securityService.setCurrentSession(backendValidation.user, token);

    this.isLoading = false;
    Swal.fire({
      icon: 'success',
      title: `¡Bienvenido, ${userFirstName}!`,
      text: `Sesión iniciada correctamente con ${providerName}.`,
      timer: 2500,
      showConfirmButton: false
    });

    this.redirectBasedOnRole();
  }

  loginGoogle(): void { this.handleSocialLogin(new GoogleAuthProvider(), 'Google'); }
  loginGitHub(): void { this.handleSocialLogin(new GithubAuthProvider(), 'GitHub'); }
  loginMicrosoft(): void { this.handleSocialLogin(new OAuthProvider('microsoft.com'), 'Microsoft'); }

  private redirectBasedOnRole(): void {
    this.router.navigate(['/']);
  }
}
