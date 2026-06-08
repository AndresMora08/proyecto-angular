import { Component, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
// 1. Cambiamos la importación al nuevo servicio de seguridad
import { SecurityService } from '../../../../services/auth/oauth.service'; 

@Component({
  selector: 'app-user-dropdown',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule
  ],
  templateUrl: './user-dropdown.component.html',
})
export class UserDropdownComponent {
  // 2. Inyectamos SecurityService en lugar de OauthService
  private securityService = inject(SecurityService);
  isOpen = false;

  // Método para alternar la visualización del menú
  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  // Método para cerrar el menú explícitamente
  closeDropdown(): void {
    this.isOpen = false;
  }

  // Método que se ejecuta al dar clic en "Cerrar Sesión"
  onLogoutClick(): void {
    console.log('Ejecutando CU-08: Destruyendo sesión activa con Firebase...');
    this.closeDropdown(); 
    // 3. Llamamos al método logout() de nuestro nuevo servicio
    this.securityService.logout();
  }

  /**
   * 💡 Opcional: Si en tu HTML (user-dropdown.component.html) necesitas 
   * mostrar el nombre o correo del usuario logueado, puedes usar este getter:
   */
  get currentUser(): any {
    return this.securityService.getCurrentUser();
  }
}