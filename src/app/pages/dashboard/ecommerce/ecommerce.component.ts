import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SecurityService } from '../../../services/auth/oauth.service';

@Component({
  selector: 'app-ecommerce',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ecommerce.component.html'
})
export class EcommerceComponent implements OnInit, OnDestroy {
  private securityService = inject(SecurityService);
  private authSubscription!: Subscription;

  currentUser: any = null;
  userName: string = 'Usuario';
  userRoleLabel: string = '';
  isOfficial: boolean = false;
  isAdmin: boolean = false;

  ngOnInit(): void {
    // Escuchamos reactivamente al usuario para pintar la interfaz
    this.authSubscription = this.securityService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.userName = user.name ? user.name.split(' ')[0] : 'Usuario';
        this.isOfficial = !!user.id_official;
        
        const role = user.role ? user.role.toUpperCase() : '';
        this.isAdmin = this.isOfficial && (role === 'ADMINISTRADOR' || role === 'ADMIN');

        // Determinar etiqueta visual
        if (this.isAdmin) this.userRoleLabel = 'Administrador del Sistema';
        else if (this.isOfficial) this.userRoleLabel = 'Funcionario Operativo';
        else this.userRoleLabel = 'Ciudadano';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}