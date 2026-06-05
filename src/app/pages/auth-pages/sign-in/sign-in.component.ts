import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; 
import { OauthService, OAuthResponse, OAuthProviderType } from '../../../services/auth/oauth.service';
import { AuthPageLayoutComponent } from '../../../shared/layout/auth-page-layout/auth-page-layout.component';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, AuthPageLayoutComponent, ReactiveFormsModule], 
  templateUrl: './sign-in.component.html'
})
export class SignInComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public oauthService = inject(OauthService);
  private fb = inject(FormBuilder);

  loginForm!: FormGroup; 
  errorMessage: string | null = null;
  isLoading: boolean = false;
  showPassword: boolean = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnInit(): void {
    // Inicializamos los campos con sus respectivas validaciones
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });

    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const provider = this.route.snapshot.data['provider'] as OAuthProviderType || 'google';
      if (code) {
        this.processOAuthLogin(provider, code);
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { email, password } = this.loginForm.value;
    console.log('Enviando credenciales directas a verificación:', { email, password });
    this.isLoading = false;
  }

  private processOAuthLogin(provider: OAuthProviderType, code: string): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.oauthService.handleCallback(provider, code).subscribe({
        next: (response: OAuthResponse) => { 
          this.isLoading = false;
          if (!response.user.isRegistered) {
            console.log('Usuario de callback nuevo. Solicitando completar perfil...');
            this.router.navigate(['/auth/sign-up'], { queryParams: { oauthToken: response.token } });
          } else {
            console.log('Usuario de callback antiguo. Acceso concedido.');
            this.redirectBasedOnRole(response.user.role);
          }
        },
        error: (err: any) => { 
          this.isLoading = false;
          this.errorMessage = 'Hubo un error al procesar el código de autenticación con el proveedor.';
          console.error('OAuth Callback Error:', err);
        }
    });
  }

 private redirectBasedOnRole(role: string): void {
    if (role === 'Administrador' || role === 'Funcionario') {
      this.router.navigate(['/categories']);
    } else {
      this.router.navigate(['/']);
    }
  }

  async loginWithOAuth(provider: OAuthProviderType): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const response = await this.oauthService.redirectToProvider(provider);
      this.isLoading = false;

      if (!response.user.isRegistered) {
        console.log('Usuario nuevo detectado. Redirigiendo a completar perfil...');
        this.router.navigate(['/signup'], { queryParams: { oauthToken: response.token } });
      } else {
        console.log('Usuario antiguo detectado. Accediendo al sistema...');
        this.redirectBasedOnRole(response.user.role);
      }

    } catch (error: any) {
      this.isLoading = false;

      if (error.code === 'auth/popup-closed-by-user') {
        this.errorMessage = 'La ventana de autenticación fue cerrada antes de completar el proceso. Inténtalo de nuevo.';
      } else if (error.code === 'auth/network-request-failed') {
        this.errorMessage = 'Hubo un problema de conexión a internet. Verifica tu red.';
      } else {
        this.errorMessage = 'Ocurrió un error inesperado al conectar con el proveedor.';
      }
      
      console.warn('Error en el flujo de OAuth:', error);
    }
  }
}