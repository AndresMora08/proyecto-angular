import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SecurityService } from '../../../services/auth/oauth.service';
import { OfficialService } from '../../../services/official/official.service';
import { CitizenService } from '../../../services/citizen/citizen.service';
import { AuthPageLayoutComponent } from '../../../shared/layout/auth-page-layout/auth-page-layout.component';
import Swal from 'sweetalert2';

import { auth } from '../../../services/environments/environment';
import { 
  signInWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider, 
  GithubAuthProvider, 
  OAuthProvider, 
  AuthProvider,
  fetchSignInMethodsForEmail
} from 'firebase/auth';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthPageLayoutComponent],
  templateUrl: './sign-in.component.html'
})
export class SignInComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private securityService = inject(SecurityService);
  private officialService = inject(OfficialService);
  private citizenService = inject(CitizenService);

  loginForm!: FormGroup;
  isLoading: boolean = false;
  showPassword: boolean = false;

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

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

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    try {
      const backendValidation = await this.validateUserInBackendTables(email);

      if (!backendValidation) {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Acceso Denegado',
          text: 'Este correo electrónico no se encuentra registrado en el sistema.'
        });
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const token = await firebaseUser.getIdToken();

      const assignedRole = backendValidation.type === 'OFFICIAL' ? (backendValidation.user.role || 'Funcionario') : 'Ciudadano';
      backendValidation.user.role = assignedRole;

      this.securityService.setCurrentSession(backendValidation.user, token);

      this.isLoading = false;
      Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Sesión iniciada correctamente.',
        timer: 2000,
        showConfirmButton: false
      });

      this.redirectBasedOnRole();

    } catch (firebaseError: any) {
      this.isLoading = false;
      console.error("❌ Error de Firebase Auth:", firebaseError);
      
      let errorText = 'Correo o contraseña incorrectos.';
      if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found') {
        errorText = 'Las credenciales ingresadas no coinciden.';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        errorText = 'Cuenta bloqueada temporalmente por demasiados intentos fallidos.';
      }

      Swal.fire({
        icon: 'error',
        title: 'Error de acceso',
        text: errorText
      });
    }
  }

  async handleSocialLogin(provider: AuthProvider, providerName: string): Promise<void> {
    this.isLoading = true;

    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (!firebaseUser.email) {
        throw new Error('El proveedor no devolvió un correo válido.');
      }

      const backendValidation = await this.validateUserInBackendTables(firebaseUser.email);

      if (!backendValidation) {
        this.isLoading = false;
        Swal.fire({
          icon: 'warning',
          title: 'Cuenta no registrada',
          text: `El correo ${firebaseUser.email} no está registrado en la plataforma corporativa.`,
          confirmButtonText: 'Ir a Registro',
          confirmButtonColor: '#3b82f6'
        }).then(() => {
          this.router.navigate(['/signup']);
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

    } catch (error: any) {
      this.isLoading = false;
      console.error(`Error de autenticación con ${providerName}:`, error);

      if (error.code === 'auth/popup-closed-by-user') return;

      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        if (email) {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          let providerText = 'otro método';
          if (methods.includes('google.com')) providerText = 'Google';
          else if (methods.includes('github.com')) providerText = 'GitHub';
          else if (methods.includes('password')) providerText = 'correo y contraseña';
          
          Swal.fire({
            icon: 'warning',
            title: 'Cuenta ya registrada',
            text: `Este correo ya está asociado con ${providerText}.`
          });
          return;
        }
      }

      Swal.fire({
        icon: 'error',
        title: 'Error de acceso',
        text: `No se pudo completar la autenticación con ${providerName}.`
      });
    }
  }

  loginGoogle(): void { this.handleSocialLogin(new GoogleAuthProvider(), 'Google'); }
  loginGitHub(): void { this.handleSocialLogin(new GithubAuthProvider(), 'GitHub'); }
  loginMicrosoft(): void { this.handleSocialLogin(new OAuthProvider('microsoft.com'), 'Microsoft'); }

  /**
   * 🚀 Redirección unificada al Ecommerce Dashboard de TailAdmin
   */
  private redirectBasedOnRole(): void {
    // Apunta directamente a la ruta raíz establecida en tu enrutador principal ('')
    this.router.navigate(['/']);
  }
}