import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs'; // 👈 Importante para combinar las peticiones

import { CommuneService } from '../../../services/commune/commune.service';
import { CityService } from '../../../services/city/city.service';
import { DepartmentService } from '../../../services/department/department.service';
import { ColombiaApiService } from '../../../services/colombia/colombia.service'; 
import { NeighborhoodService } from '../../../services/neighborhood/neighborhood.service'; // 👈 Inyectamos tu servicio de barrios

import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';

import { Commune } from '../../../models/Commune';
import { City } from '../../../models/City'; 
import { Department } from '../../../models/Departament';
import { Neighborhood } from '../../../models/Neighborhood'; // 👈 Modelo de Barrio
import { TableAction } from '../../../models/components/Table';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-commune-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericTableComponent,
    GenericSearchComponent
  ],
  templateUrl: './commune-management.component.html',
  styleUrl: './commune-management.component.css'
})
export class CommuneManagementComponent implements OnInit {
  comunas: any[] = []; 
  departments: Department[] = []; 
  cities: City[] = []; 
  neighborhoods: Neighborhood[] = []; // 👈 Lista local para guardar los barrios temporales

  apiDepartments: any[] = [];
  apiCities: any[] = [];

  selectedDeptFilter: string = '';
  selectedCityFilter: string = '';
  searchTerm: string = '';

  isFormOpen: boolean = false;
  formMode: 'create' | 'edit' = 'create';
  
  formData = {
    id_commune: null as number | null,     
    id_department: '' as string | number, 
    id_city: '' as string | number,       
    name: '',
    status: 'active'
  };

  tableColumns = ['name', 'cityName', 'departmentName', 'barriosCount', 'status'];
  
  tableActions: TableAction[] = [
    { name: 'edit', label: 'Editar', customClass: 'text-blue-500 hover:bg-blue-50' },
    { name: 'delete', label: 'Eliminar', customClass: 'text-red-500 hover:bg-red-50' }
  ];

  constructor(
    private communeService: CommuneService,
    private cityService: CityService,
    private departmentService: DepartmentService,
    private colombiaApiService: ColombiaApiService,
    private neighborhoodService: NeighborhoodService // 👈 Declaramos el servicio en el constructor
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.departmentService.getAll().subscribe(depts => this.departments = depts || []);
    
    this.cityService.getAll().subscribe(cities => {
      this.cities = cities || [];
      this.loadComunas();
    });

    this.colombiaApiService.getDepartments().subscribe(res => {
      this.apiDepartments = res || [];
    });
  }

  /**
   * Carga sincrónica y cruzada utilizando tu NeighborhoodService
   */
  loadComunas(): void {
    // 💡 Ejecutamos ambas peticiones en paralelo para tener comunas y barrios al mismo tiempo
    forkJoin({
      communesData: this.communeService.getAll(),
      neighborhoodsData: this.neighborhoodService.getAll()
    }).subscribe({
      next: ({ communesData, neighborhoodsData }) => {
        this.neighborhoods = neighborhoodsData || [];
        
        this.comunas = (communesData || []).map(commune => {
          const city = this.cities.find(c => c.id_city === commune.id_city);
          const dept = this.departments.find(d => d.id_department === city?.id_department);
          
          // 💡 FILTRADO Y CONTEO DINÁMICO: 
          // Buscamos cuántos barrios de tu BD local pertenecen a este id_commune
          const count = this.neighborhoods.filter(n => n.id_commune === commune.id_commune).length;

          return {
            ...commune,
            id: commune.id_commune, 
            cityName: city ? city.name : 'Desconocida',
            departmentName: dept ? dept.name : 'Desconocido',
            id_department: city ? city.id_department : '',
            barriosCount: count // 👈 Asignación en tiempo real en la vista
          };
        });
      },
      error: () => this.comunas = []
    });
  }

  get filteredComunas(): any[] {
    return this.comunas.filter(c => {
      const matchDept = !this.selectedDeptFilter || c.id_department?.toString() === this.selectedDeptFilter.toString();
      const matchCity = !this.selectedCityFilter || c.id_city?.toString() === this.selectedCityFilter.toString();
      const matchQuery = !this.searchTerm.trim() || c.name?.toLowerCase().includes(this.searchTerm.toLowerCase().trim());
      return matchDept && matchCity && matchQuery;
    });
  }

  onFilterDeptChange(): void {
    this.selectedCityFilter = '';
  }

  onFormDeptChange(): void {
    const deptId = Number(this.formData.id_department);
    this.formData.id_city = '';
    this.apiCities = [];

    if (deptId) {
      this.colombiaApiService.getCitiesByDepartmentId(deptId).subscribe(res => {
        this.apiCities = res || [];
      });
    }
  }

  openCreate(): void {
    this.formMode = 'create';
    this.formData = { id_commune: null, id_department: '', id_city: '', name: '', status: 'active' };
    this.apiCities = [];
    this.isFormOpen = true;
  }

  closeForm(): void {
    this.isFormOpen = false;
  }

  saveCommune(): void {
    if (!this.formData.id_city || !this.formData.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor diligencia todos los campos obligatorios.' });
      return;
    }

    const selectedApiCity = this.apiCities.find(c => c.id.toString() === this.formData.id_city.toString());
    if (!selectedApiCity) return;

    const localCity = this.cities.find(c => c.name.toLowerCase().trim() === selectedApiCity.name.toLowerCase().trim());

    if (!localCity) {
      Swal.fire({
        icon: 'error',
        title: 'Ciudad no registrada',
        text: `La ciudad "${selectedApiCity.name}" no está dada de alta en el sistema local. Regístrala primero.`
      });
      return;
    }

    const cityIdReal = localCity.id_city;
    const nombreNormalizado = this.formData.name.trim();

    const existeDuplicado = this.comunas.some(c => 
      c.id_city === cityIdReal &&
      c.name?.toLowerCase().trim() === nombreNormalizado.toLowerCase() &&
      c.id_commune !== this.formData.id_commune 
    );

    if (existeDuplicado) {
      Swal.fire({
        icon: 'error',
        title: 'Nombre duplicado',
        text: `Ya existe una comuna registrada con el nombre "${nombreNormalizado}" en la ciudad seleccionada.`,
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    const payload: Commune = {
      id_city: Number(cityIdReal),
      name: nombreNormalizado,
      status: this.formData.status
    };

    if (this.formMode === 'create') {
      this.communeService.create(payload).subscribe({
        next: () => {
          this.toastSuccess('¡Comuna Creada!', 'La comuna se agregó correctamente.');
          this.closeForm();
          this.loadComunas(); // 👈 Recargamos llamando al forkJoin actualizado
        }
      });
    } else {
      if (this.formData.id_commune) { 
        this.communeService.update(this.formData.id_commune, payload).subscribe({ 
          next: () => {
            this.toastSuccess('¡Cambios Guardados!', 'Información de comuna actualizada.');
            this.closeForm();
            this.loadComunas();
          }
        });
      }
    }
  }

  handleTableAction(event: any): void {
    const item = event.item;
    if (event.actionName === 'edit') {
      this.formMode = 'edit';
      
      const localCity = this.cities.find(c => c.id_city === item.id_city);
      const apiDept = this.apiDepartments.find(d => d.name.toLowerCase().trim() === item.departmentName.toLowerCase().trim());

      this.formData = {
        id_commune: item.id_commune, 
        id_department: apiDept ? apiDept.id : '',
        id_city: '', 
        name: item.name || '',
        status: item.status || 'active'
      };

      if (apiDept) {
        this.colombiaApiService.getCitiesByDepartmentId(apiDept.id).subscribe(res => {
          this.apiCities = res || [];
          const apiCity = this.apiCities.find(c => c.name.toLowerCase().trim() === localCity?.name.toLowerCase().trim());
          if (apiCity) {
            this.formData.id_city = apiCity.id;
          }
        });
      }

      this.isFormOpen = true;
    } 
    else if (event.actionName === 'delete') {
      // 💡 VALIDACIÓN REAL PROTEGIDA:
      // Si el conteo reactivo calculó que posee barrios asociados, impedirá el borrado
      if (item.barriosCount > 0) { 
        Swal.fire({
          icon: 'error',
          title: 'Imposible Eliminar',
          text: `La comuna "${item.name}" tiene barrios dependientes asociados en el sistema.`,
          confirmButtonColor: '#ef4444'
        });
      } else {
        this.confirmDelete(item);
      }
    }
  }

  confirmDelete(item: any): void {
    Swal.fire({
      title: '¿Eliminar Comuna?',
      text: `Esta acción removerá definitivamente la comuna "${item.name}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar'
    }).then((res) => {
      if (res.isConfirmed && item.id_commune) { 
        this.communeService.delete(item.id_commune).subscribe({
          next: () => {
            this.toastSuccess('Eliminada', 'La comuna fue retirada del sistema.');
            this.loadComunas();
          }
        });
      }
    });
  }

  private toastSuccess(title: string, text: string): void {
    Swal.fire({ icon: 'success', title, text, timer: 1800, showConfirmButton: false });
  }
}