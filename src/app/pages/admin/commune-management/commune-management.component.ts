import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommuneService } from '../../../services/commune/commune.service';
import { CityService } from '../../../services/city/city.service';
import { DepartmentService } from '../../../services/department/department.service';

import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';

import { Commune } from '../../../models/Commune';
import { City } from '../../../models/City';
import { Department } from '../../../models/Departament';
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
  // Datos principales
  comunas: any[] = []; // Guardará las comunas con los nombres mapeados de ciudad y depto.
  departments: Department[] = [];
  cities: City[] = [];
  filteredCities: City[] = [];

  // Filtros de la barra superior (Mockup)
  selectedDeptFilter: string = '';
  selectedCityFilter: string = '';
  searchTerm: string = '';

  // Control del Formulario Lateral (Split-screen)
  isFormOpen: boolean = false;
  formMode: 'create' | 'edit' = 'create';
  
  // Modelo reactivo del formulario lateral
  formData = {
    id: null as number | null,
    id_department: '' as string | number,
    id_city: '' as string | number,
    name: '',
    status: 'active'
  };

  // Validación simulada de API Colombia (Verde en Mockup)
  apiColombiaVerified: boolean = false;

  // Columnas según la imagen de referencia
  tableColumns = ['name', 'cityName', 'departmentName', 'barriosCount', 'status'];
  
  tableActions: TableAction[] = [
    { name: 'edit', label: 'Editar', customClass: 'text-blue-500 hover:bg-blue-50' },
    { name: 'delete', label: 'Eliminar', customClass: 'text-red-500 hover:bg-red-50' }
  ];

  constructor(
    private communeService: CommuneService,
    private cityService: CityService,
    private departmentService: DepartmentService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    // Carga paralela de departamentos y ciudades para construir la rejilla
    this.departmentService.getAll().subscribe(depts => this.departments = depts || []);
    this.cityService.getAll().subscribe(cities => {
      this.cities = cities || [];
      this.loadComunas();
    });
  }

  loadComunas(): void {
    this.communeService.getAll().subscribe({
      next: (data) => {
        // Enriquecer el listado con nombres legibles cruzando IDs (Simulando la respuesta relacional)
        this.comunas = (data || []).map(commune => {
          const city = this.cities.find(c => c.id === commune.id_city);
          const dept = this.departments.find(d => d.id === city?.id_department);
          return {
            ...commune,
            cityName: city ? city.name : 'Desconocida',
            departmentName: dept ? dept.name : 'Desconocido',
            id_department: city ? city.id_department : '',
            barriosCount: Math.floor(Math.random() * 12) + 1 // Simulación temporal de barrios asociados
          };
        });
      },
      error: () => this.comunas = []
    });
  }

  // Filtrado reactivo local basado en selectores superiores y barra de búsqueda
  get filteredComunas(): any[] {
    return this.comunas.filter(c => {
      const matchDept = !this.selectedDeptFilter || c.id_department?.toString() === this.selectedDeptFilter.toString();
      const matchCity = !this.selectedCityFilter || c.id_city?.toString() === this.selectedCityFilter.toString();
      const matchQuery = !this.searchTerm.trim() || c.name?.toLowerCase().includes(this.searchTerm.toLowerCase().trim());
      return matchDept && matchCity && matchQuery;
    });
  }

  // Encadenamiento reactivo cuando cambia el departamento en filtros principales
  onFilterDeptChange(): void {
    this.selectedCityFilter = '';
    // Podrías filtrar ciudades disponibles si fuera necesario globalmente
  }

  // Encadenamiento reactivo dentro del formulario lateral
  onFormDeptChange(): void {
    const deptId = this.formData.id_department;
    this.formData.id_city = '';
    this.apiColombiaVerified = false;

    if (deptId) {
      this.filteredCities = this.cities.filter(c => c.id_department?.toString() === deptId.toString());
    } else {
      this.filteredCities = [];
    }
  }

  // Evento gatillado cuando el usuario escoge la ciudad final en el formulario
  onFormCityChange(): void {
    if (this.formData.id_city) {
      // Activamos el aviso visual verde de "API Colombia" (Simulada por ahora)
      this.apiColombiaVerified = true;
    } else {
      this.apiColombiaVerified = false;
    }
  }

  openCreate(): void {
    this.formMode = 'create';
    this.apiColombiaVerified = false;
    this.formData = { id: null, id_department: '', id_city: '', name: '', status: 'active' };
    this.filteredCities = [];
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

    const nombreNormalizado = this.formData.name.trim();

    // 5. Flujo alternativo 5a: Validar duplicados en la misma ciudad
    const existeDuplicado = this.comunas.some(c => 
      c.id_city?.toString() === this.formData.id_city.toString() &&
      c.name?.toLowerCase().trim() === nombreNormalizado.toLowerCase() &&
      c.id !== this.formData.id
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
      id_city: Number(this.formData.id_city),
      name: nombreNormalizado,
      status: this.formData.status
    };

    if (this.formMode === 'create') {
      this.communeService.create(payload).subscribe({
        next: () => {
          this.toastSuccess('¡Comuna Creada!', 'La comuna se agregó correctamente.');
          this.closeForm();
          this.loadComunas();
        }
      });
    } else {
      if (this.formData.id) {
        this.communeService.update(this.formData.id, payload).subscribe({
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
      this.formData = {
        id: item.id,
        id_department: item.id_department || '',
        id_city: item.id_city || '',
        name: item.name || '',
        status: item.status || 'active'
      };
      // Forzar encadenamiento de ciudades del depto seleccionado
      this.filteredCities = this.cities.filter(c => c.id_department?.toString() === item.id_department?.toString());
      this.apiColombiaVerified = true;
      this.isFormOpen = true;
    } 
    else if (event.actionName === 'delete') {
      // Flujo alternativo E2: Validar si posee dependencias (barrios asociados)
      if (item.barriosCount > 0 && Math.random() > 0.5) { // Simulación: Si supera umbral, asumimos que tiene amarres en BD
        Swal.fire({
          icon: 'error',
          title: 'No se puede eliminar',
          text: `La comuna "${item.name}" cuenta actualmente con ${item.barriosCount} barrios vinculados. Remueve las dependencias antes de reintentar.`,
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
      if (res.isConfirmed && item.id) {
        this.communeService.delete(item.id).subscribe({
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