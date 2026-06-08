import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SecurityService } from '../../../services/auth/oauth.service';
import { OfficialService } from '../../../services/official/official.service';
import { CitizenService } from '../../../services/citizen/citizen.service'; // Asegúrate de tener este servicio creado
import { AuthPageLayoutComponent } from '../../../shared/layout/auth-page-layout/auth-page-layout.component';
import Swal from 'sweetalert2';

// Importación directa de la instancia de Firebase Auth desde tu environment
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

  /**
   * 🔍 Método auxiliar centralizado para verificar si el correo existe 
   * en las tablas de la base de datos de tu Flask (Funcionarios o Ciudadanos)
   */
  private async validateUserInBackendTables(email: string): Promise<{ user: any; type: 'OFFICIAL' | 'CITIZEN' } | null> {
    try {
      // 1. Buscar en Funcionarios (Official)
      const officials = await this.officialService.getAll().toPromise() || [];
      const officialUser = officials.find((o: any) => o.email?.toLowerCase() === email.toLowerCase());
      
      if (officialUser) {
        return { user: officialUser, type: 'OFFICIAL' };
      }

      // 2. Buscar en Ciudadanos (Citizen)
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

  // =====================================================
  // LOGIN TRADICIONAL (EMAIL Y CONTRASEÑA DIRECTO EN FIREBASE)
  // =====================================================
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    try {
      // 1. Validar primero si el usuario existe en tu ecosistema local de Flask
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

      // 2. Si existe en la BD, procedemos a autenticar la contraseña con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const token = await firebaseUser.getIdToken();

      // Mapear rol correspondiente
      const assignedRole = backendValidation.type === 'OFFICIAL' ? (backendValidation.user.role || 'Funcionario') : 'Ciudadano';
      backendValidation.user.role = assignedRole;

      // 3. Guardar sesión localmente
      this.securityService.setCurrentSession(backendValidation.user, token);

      this.isLoading = false;
      Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Sesión iniciada correctamente.',
        timer: 2000,
        showConfirmButton: false
      });

      this.redirectBasedOnRole(assignedRole);

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

  // =====================================================
  // LOGIN SOCIAL (FIREBASE POPUP + VALIDACIÓN LOCAL)
  // =====================================================
  async handleSocialLogin(provider: AuthProvider, providerName: string): Promise<void> {
    this.isLoading = true;

    try {
      // 1. Autenticación con el PopUp de Firebase
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (!firebaseUser.email) {
        throw new Error('El proveedor no devolvió un correo válido.');
      }

      // 2. Verificar existencia en el Backend de Flask pasivamente
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

      // 3. Extraer primer nombre para el saludo
      let userFirstName = backendValidation.user.name ? backendValidation.user.name.split(' ')[0] : '';
      if (!userFirstName) {
        userFirstName = firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0] : 'Usuario';
      }

      const assignedRole = backendValidation.type === 'OFFICIAL' ? (backendValidation.user.role || 'Funcionario') : 'Ciudadano';
      backendValidation.user.role = assignedRole;

      // 4. Guardar sesión local sin llamadas de escritura al backend
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

      this.redirectBasedOnRole(assignedRole);

    } catch (error: any) {
      this.isLoading = false;
      console.error(`Error de autenticación con ${providerName}:`, error);

      if (error.code === 'auth/popup-closed-by-user') return;

      // Validación de cuentas vinculadas a otros proveedores (Lógica idéntica a tu React)
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        if (email) {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          let providerText = 'otro método';
          if (methods.includes('google.com')) providerText = 'Google';
          else if (methods.includes('github.com')) providerText = 'GitHub';
          else if (methods.includes('password')) providerText = 'correo y contraseña';
          else if (methods.includes('microsoft.com')) providerText = 'Microsoft';

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

  // Triggers de los botones del HTML
  loginGoogle(): void {
    this.handleSocialLogin(new GoogleAuthProvider(), 'Google');
  }

  loginGitHub(): void {
    this.handleSocialLogin(new GithubAuthProvider(), 'GitHub');
  }

  loginMicrosoft(): void {
    this.handleSocialLogin(new OAuthProvider('microsoft.com'), 'Microsoft');
  }

  private redirectBasedOnRole(role: string): void {
    const standardizedRole = role.toUpperCase();
    if (standardizedRole === 'ADMINISTRADOR' || standardizedRole === 'FUNCIONARIO' || standardizedRole === 'ADMIN') {
      this.router.navigate(['/admin/category-management']);
    } else {
      this.router.navigate(['/']);
    }
  }
}