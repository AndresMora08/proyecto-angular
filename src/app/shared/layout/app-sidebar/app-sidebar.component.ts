import { Component, OnInit, AfterViewChecked, Pipe, PipeTransform, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BehaviorSubject, Subscription } from 'rxjs';
import { SecurityService } from '../../../services/auth/oauth.service';

@Pipe({
  name: 'safeHtml',
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);
  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}

interface SidebarItem {
  name: string;
  icon: string;
  path?: string;
  subItems?: { name: string; path: string; }[];
  condition: (user: any) => boolean; // Lógica estricta solicitada
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SafeHtmlPipe],
  templateUrl: './app-sidebar.component.html',
  
})
export class SidebarComponent implements OnInit, AfterViewChecked, OnDestroy {
  private router = inject(Router);
  private securityService = inject(SecurityService);
  private authSubscription!: Subscription;

  // Estados reactivos locales del layout del Sidebar
  isExpanded$ = new BehaviorSubject<boolean>(true);
  isHovered$ = new BehaviorSubject<boolean>(false);
  isMobileOpen$ = new BehaviorSubject<boolean>(false);

  openSubmenu: string | null = null;
  subMenuHeights: { [key: string]: number } = {};
  private shouldRecalculateHeights = false;

  // Datos renderizables de sesión
  currentUser: any = null;
  userTypeLabel: string = 'Invitado';
  userName: string = 'Usuario';

  // Estructura maestra de la barra de navegación con validaciones explícitas de backend
  allNavItems: SidebarItem[] = [
    {
      name: 'Módulo Principal',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
      path: '/',
      condition: (user) => !!user // Cualquiera con sesión iniciada
    },
    {
      name: 'Administración del Sistema',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>`,
      condition: (user) => {
        // Validación estricta: Debe poseer id_official Y su rol mapeado debe ser de administración
        if (!user || !user.id_official) return false;
        const role = user.role ? user.role.toUpperCase() : '';
        return role === 'ADMINISTRADOR' || role === 'ADMIN';
      },
      subItems: [
        { name: 'CU-01 Entidades', path: '/entities' },
        { name: 'CU-02 Funcionarios', path: '/staff' },
        { name: 'CU-03 Ciudadanos', path: '/citizens' },
        { name: 'CU-04 Categorías', path: '/categories' },
        { name: 'CU-05 Comunas', path: '/communes' },
        { name: 'CU-06 Barrios', path: '/neighborhoods' }
      ]
    },
    {
      name: 'Gestión Territorial',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>`,
      condition: (user) => !!user && !!user.id_official, // Todo funcionario (incluye operarios) accede a mapas y gps
      subItems: [
        { name: 'CU-09/10 Polígonos de Barrio', path: '/territorial-map' },
        { name: 'CU-11 Rastreo GPS en Vivo', path: '/official-tracking' }
      ]
    },
    {
      name: 'Gestión de Anotaciones',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`,
      path: '/annotation-create',
      condition: (user) => !!user // Accesible tanto para ciudadanos como oficiales corporativos
    },
    {
      name: 'Reportes Inteligentes',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
      path: '/reports',
      condition: (user) => !!user && !!user.id_official // Solo oficiales corporativos visualizan reportes consolidados
    }
  ];

  filteredNavItems: SidebarItem[] = [];

  ngOnInit(): void {
    // Escuchar de forma reactiva al BehaviorSubject del servicio
    this.authSubscription = this.securityService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.processUserPermissions();
      this.checkActiveSubmenu();
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldRecalculateHeights) {
      this.calculateHeights();
      this.shouldRecalculateHeights = false;
    }
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  /**
   * Procesa las propiedades estructurales de las tablas relacionales para armar el menú
   */
  private processUserPermissions(): void {
    if (this.currentUser) {
      this.userName = this.currentUser.name ? this.currentUser.name.split(' ')[0] : 'Usuario';

      if (this.currentUser.id_official) {
        const role = this.currentUser.role ? this.currentUser.role.toUpperCase() : '';
        this.userTypeLabel = (role === 'ADMINISTRADOR' || role === 'ADMIN') ? 'Administrador' : 'Funcionario';
      } else if (this.currentUser.id_citizen) {
        this.userTypeLabel = 'Ciudadano';
      } else {
        this.userTypeLabel = 'Usuario Local';
      }
    } else {
      this.userName = 'Usuario';
      this.userTypeLabel = 'Sin Sesión';
    }

    // Filtrar usando las funciones condicionadas individuales de arriba
    this.filteredNavItems = this.allNavItems.filter(item => item.condition(this.currentUser));
  }

  toggleSubmenu(menuType: string, index: number): void {
    const key = `${menuType}-${index}`;
    this.openSubmenu = this.openSubmenu === key ? null : key;
    this.shouldRecalculateHeights = true;
  }

  calculateHeights(): void {
    if (this.openSubmenu) {
      const element = document.getElementById(this.openSubmenu);
      if (element) {
        const ul = element.querySelector('ul');
        this.subMenuHeights[this.openSubmenu] = ul ? ul.scrollHeight : 0;
      }
    }
  }

  isActive(path?: string): boolean {
    return path ? this.router.url === path : false;
  }

  private checkActiveSubmenu(): void {
    const currentUrl = this.router.url;
    this.filteredNavItems.forEach((item, index) => {
      if (item.subItems?.some(sub => sub.path === currentUrl)) {
        this.openSubmenu = `main-${index}`;
        this.shouldRecalculateHeights = true;
      }
    });
  }

  onSidebarMouseEnter(): void {
    this.isHovered$.next(true);
    this.shouldRecalculateHeights = true;
  }

  onSubmenuClick(): void {
    if (this.isMobileOpen$.value) {
      this.isMobileOpen$.next(false);
    }
  }

  onLogout(): void {
    this.securityService.logout();
  }
}