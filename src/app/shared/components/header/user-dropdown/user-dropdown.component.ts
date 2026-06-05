import { Component, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OauthService } from '../../../../services/auth/oauth.service'; 

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
  private oauthService = inject(OauthService);
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
    console.log('Ejecutando CU-08: Destruyendo sesión activa...');
    this.closeDropdown(); 
    this.oauthService.logout();
  }
}