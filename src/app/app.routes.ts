import { Routes } from '@angular/router';
import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { FormElementsComponent } from './pages/forms/form-elements/form-elements.component';
import { BasicTablesComponent } from './pages/tables/basic-tables/basic-tables.component';
import { BlankComponent } from './pages/blank/blank.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';
import { LineChartComponent } from './pages/charts/line-chart/line-chart.component';
import { BarChartComponent } from './pages/charts/bar-chart/bar-chart.component';
import { AlertsComponent } from './pages/ui-elements/alerts/alerts.component';
import { AvatarElementComponent } from './pages/ui-elements/avatar-element/avatar-element.component';
import { BadgesComponent } from './pages/ui-elements/badges/badges.component';
import { ButtonsComponent } from './pages/ui-elements/buttons/buttons.component';
import { ImagesComponent } from './pages/ui-elements/images/images.component';
import { VideosComponent } from './pages/ui-elements/videos/videos.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { CalenderComponent } from './pages/calender/calender.component';
import { ReportManagementComponent } from './pages/reports/report-chat/report-chat.component';
import { TerritorialMapComponent } from './pages/territorial-map/territorial-map.component';

// IMPORTACIONES DE ADMINISTRACIÓN DE LA PLATAFORMA
import { EntityManagementComponent } from './pages/admin/entity-management/entity-management.component';
import { CategoryManagementComponent } from './pages/admin/category-management/category-management.component';
import { StaffManagementComponent } from './pages/admin/staff-management/staff-management.component';
import { CitizenManagementComponent } from './pages/admin/citizen-management/citizen-management.component';
import { CommuneManagementComponent } from './pages/admin/commune-management/commune-management.component';
import { OfficialTrackingComponent } from './pages/admin//official-tracking/official-tracking.component';
// 👈 NUEVA IMPORTACIÓN: GESTIÓN DE BARRIOS (CU-06)
import { NeighborhoodManagementComponent } from './pages/admin/neighborhood-management/neighborhood-management.component';

// IMPORTACIONES FUNCIONARIO
import {AnnotationCreateComponent} from './pages/annotation-management/annotation-create.component';


export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        component: EcommerceComponent,
        pathMatch: 'full',
        title:
          'Angular Ecommerce Dashboard | TailAdmin - Angular Admin Dashboard Template',
      },
      {
        path: 'calendar',
        component: CalenderComponent,
        title: 'Angular Calender | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'profile',
        component: ProfileComponent,
        title: 'Angular Profile Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'form-elements',
        component: FormElementsComponent,
        title: 'Angular Form Elements Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'basic-tables',
        component: BasicTablesComponent,
        title: 'Angular Basic Tables Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'blank',
        component: BlankComponent,
        title: 'Angular Blank Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'entities', //01 CU-01: Gestión de Entidades
        component: EntityManagementComponent,
        title: 'Administración de Entidades | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'categories',//04 CU-04: Gestión de Categorías
        component: CategoryManagementComponent,
        title: 'Estructura de Categorías | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'staff', //02 CU-02: Gestión de Funcionarios
        component: StaffManagementComponent,
        title: 'Gestión de Funcionarios | Territorial'
      },
      {
        path: 'citizens', //03 CU-03: Gestión de Ciudadanos
        component: CitizenManagementComponent,
        title: 'Gestión de Ciudadanos | Territorial'
      },
      {
        path: 'communes',//05 CU-05: Gestión de Comunas
        component: CommuneManagementComponent,
        title: 'Gestión de Comunas | Territorial'
      },
      // 👈 NUEVA RUTA: GESTIÓN DE BARRIOS
      {
        path: 'neighborhoods',//06 CU-06: Gestión de Barrios 9 y 10
        component: NeighborhoodManagementComponent,
        title: 'Gestión de Barrios | Territorial'
      },
      {
        path: 'invoice',
        component: InvoicesComponent,
        title: 'Angular Invoice Details Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'line-chart',
        component: LineChartComponent,
        title: 'Angular Line Chart Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'bar-chart',
        component: BarChartComponent,
        title: 'Angular Bar Chart Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'alerts',
        component: AlertsComponent,
        title: 'Angular Alerts Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'avatars',
        component: AvatarElementComponent,
        title: 'Angular Avatars Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'badge',
        component: BadgesComponent,
        title: 'Angular Badges Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'buttons',
        component: ButtonsComponent,
        title: 'Angular Buttons Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'images',
        component: ImagesComponent,
        title: 'Angular Images Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'videos',
        component: VideosComponent,
        title: 'Angular Videos Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      
      {//15 CU-15: Reportes Inteligentes con Visualización Dinámica
        path: 'reports',
        component: ReportManagementComponent,
        title: 'Reportes Inteligentes'
      },

      {
        path: 'territorial-map',
        component: TerritorialMapComponent,
        title: 'Mapa Territorial | Territorial'
      },
      {//12 y 13 CU-12 y CU-13: Creación y Edición de Anotaciones en el Mapa y 14 CU-14: Visualización de Anotaciones en el Mapa Interactivo
        path: 'annotation-create',
        component: AnnotationCreateComponent,
        title: 'Crear Anotación | Territorial'
      }
    ]
  },
  // auth pages
  {
    path: 'signin',
    component: SignInComponent,
    title: 'Angular Sign In Dashboard | TailAdmin - Angular Admin Dashboard Template'
  },
  {
    path: 'signup',
    component: SignUpComponent,
    title: 'Angular Sign Up Dashboard | TailAdmin - Angular Admin Dashboard Template'
  },
  //Mapa interacttivo
  {//11 CU-11: Seguimiento de Funcionarios en Mapa Interactivo
    path: 'official-tracking',
    component: OfficialTrackingComponent
  },
  // error pages
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Angular NotFound Dashboard | TailAdmin - Angular Admin Dashboard Template'
  }
];
