import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { NeighborhoodService } from '../../../services/neighborhood/neighborhood.service';
import { CommuneService } from '../../../services/commune/commune.service';
import { PointService } from '../../../services/point/point.service';
import { AnnotationService } from '../../../services/annotation/annotation.service';

import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';
import { NeighborhoodMapComponent } from '../neighborhood-map/neighborhood-map.component';

import { Neighborhood } from '../../../models/Neighborhood';
import { Commune } from '../../../models/Commune';
import { TableAction } from '../../../models/components/Table';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-neighborhood-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericTableComponent,
    GenericSearchComponent,
    NeighborhoodMapComponent
  ],
  templateUrl: './neighborhood-management.component.html',
  styleUrl: './neighborhood-management.component.css'
})
export class NeighborhoodManagementComponent implements OnInit {
  barrios: any[] = [];
  comunas: Commune[] = [];

  // Filtros superiores
  selectedCommuneFilter: string = '';
  searchTerm: string = '';

  // Estado del Formulario Lateral
  isFormOpen: boolean = false;
  formMode: 'create' | 'edit' = 'create';

  formData = {
    id_neighborhood: null as number | null,
    id_commune: '' as string | number,
    name: '',
    status: 'active'
  };

  // Estructura de columnas basada fielmente en tu Mockup
  tableColumns = ['name', 'communeName', 'puntos', 'anotaciones', 'status'];

  tableActions: TableAction[] = [
    { name: 'edit', label: 'Editar', customClass: 'text-blue-500 hover:bg-blue-50' },
    { name: 'map', label: 'Demarcar', customClass: 'text-green-600 hover:bg-green-50' },
    { name: 'delete', label: 'Eliminar', customClass: 'text-red-500 hover:bg-red-50' }
  ];

  constructor(
    private neighborhoodService: NeighborhoodService,
    private communeService: CommuneService,
    private pointService: PointService,
    private annotationService: AnnotationService
  ) {}

  // Estado para abrir el mapa de demarcación (CU-09)
  isMapOpen: boolean = false;
  selectedNeighborhoodForMap: any = null;

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    // Cruce de información completo y asíncrono
    forkJoin({
      comunasData: this.communeService.getAll(),
      barriosData: this.neighborhoodService.getAll(),
      puntosData: this.pointService.getAll(),
      anotacionesData: this.annotationService.getAll()
    }).subscribe({
      next: ({ comunasData, barriosData, puntosData, anotacionesData }) => {
        this.comunas = comunasData || [];
        console.log('Comunas cargadas:', this.comunas);
        console.log('Barrios crudos:', barriosData);
        this.barrios = (barriosData || []).map(barrio => {
          const comuna = this.comunas.find(c => c.id_commune === barrio.id_commune);
          console.log('Comuna encontrada para barrio:', comuna);

          // Contamos cuántos puntos y anotaciones de la base de datos pertenecen a este id_neighborhood
          const totalPts = (puntosData || []).filter(p => p.id_neighborhood === barrio.id_neighborhood).length;
          const totalAnots = (anotacionesData || []).filter(a => a.id_neighborhood === barrio.id_neighborhood).length;

          return {
            ...barrio,
            id: barrio.id_neighborhood, // Requerido para mapeo interno de la tabla genérica
            communeName: comuna ? comuna.name : 'Comuna Desconocida',
            puntos: totalPts,
            anotaciones: totalAnots
          };
        });
      },
      error: () => {
        this.barrios = [];
        this.comunas = [];
      }
    });
  }

  get filteredBarrios(): any[] {
    return this.barrios.filter(b => {
      const matchCommune = !this.selectedCommuneFilter || b.id_commune?.toString() === this.selectedCommuneFilter.toString();
      const matchQuery = !this.searchTerm.trim() || b.name?.toLowerCase().includes(this.searchTerm.toLowerCase().trim());
      return matchCommune && matchQuery;
    });
  }

  openCreate(): void {
    this.formMode = 'create';
    this.formData = { id_neighborhood: null, id_commune: '', name: '', status: 'active' };
    this.isFormOpen = true;
  }

  closeForm(): void {
    this.isFormOpen = false;
  }

  saveNeighborhood(): void {
    if (!this.formData.id_commune || !this.formData.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Selecciona una comuna e ingresa el nombre del barrio.' });
      return;
    }

    const nombreNormalizado = this.formData.name.trim();
    const idComunaNum = Number(this.formData.id_commune);

    // 💡 Flujo 4: Validar duplicados en la misma comuna
    const existeDuplicado = this.barrios.some(b => 
      b.id_commune === idComunaNum &&
      b.name?.toLowerCase().trim() === nombreNormalizado.toLowerCase() &&
      b.id_neighborhood !== this.formData.id_neighborhood
    );

    if (existeDuplicado) {
      Swal.fire({
        icon: 'error',
        title: 'Nombre duplicado',
        text: `Ya existe un barrio llamado "${nombreNormalizado}" en la comuna seleccionada.`,
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    const payload: Neighborhood = {
      id_commune: idComunaNum,
      name: nombreNormalizado,
      status: this.formData.status
    };

    if (this.formMode === 'create') {
      this.neighborhoodService.create(payload).subscribe({
        next: () => {
          this.toastSuccess('¡Barrio creado!', `El barrio "${nombreNormalizado}" se creó correctamente.`);
          this.closeForm();
          this.loadInitialData();
        }
      });
    } else {
      if (this.formData.id_neighborhood) {
        this.neighborhoodService.update(this.formData.id_neighborhood, payload).subscribe({
          next: () => {
            this.toastSuccess('¡Cambios guardados!', 'Información del barrio actualizada.');
            this.closeForm();
            this.loadInitialData();
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
        id_neighborhood: item.id_neighborhood,
        id_commune: item.id_commune || '',
        name: item.name || '',
        status: item.status || 'active'
      };
      this.isFormOpen = true;
    } 
    else if (event.actionName === 'map') {
      // Abrir modal/mapa para demarcación (CU-09)
      this.selectedNeighborhoodForMap = item;
      this.isMapOpen = true;
    }
    else if (event.actionName === 'delete') {
      if (!item.id_neighborhood) return;

      // 💡 Flujo Alternativo E2a: Validar dependencias vivas en el backend antes de borrar
      forkJoin({
        ptsCheck: this.pointService.search({ id_neighborhood: item.id_neighborhood }),
        anotsCheck: this.annotationService.search({ id_neighborhood: item.id_neighborhood })
      }).subscribe({
        next: ({ ptsCheck, anotsCheck }) => {
          // El backend puede responder un arreglo directo o un objeto paginado con la propiedad total/results
          const totalPts = Array.isArray(ptsCheck) ? ptsCheck.length : (ptsCheck.total || ptsCheck.results?.length || 0);
          const totalAnots = Array.isArray(anotsCheck) ? anotsCheck.length : (anotsCheck.total || anotsCheck.results?.length || 0);

          if (totalPts > 0 || totalAnots > 0) {
            Swal.fire({
              icon: 'error',
              title: 'No se puede eliminar',
              html: `El barrio tiene <b>${totalPts}</b> puntos y <b>${totalAnots}</b> anotaciones asociadas.`,
              confirmButtonColor: '#ef4444'
            });
          } else {
            this.confirmDelete(item);
          }
        },
        error: () => {
          // Fallback seguro usando la data de la tabla local si el endpoint falla
          if (item.puntos > 0 || item.anotaciones > 0) {
            Swal.fire({
              icon: 'error',
              title: 'No se puede eliminar',
              text: `El barrio cuenta con elementos vinculados activos.`
            });
          } else {
            this.confirmDelete(item);
          }
        }
      });
    }
  }

  confirmDelete(item: any): void {
    Swal.fire({
      title: '¿Eliminar Barrio?',
      text: `Esta acción removerá definitivamente el barrio "${item.name}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar'
    }).then((res) => {
      if (res.isConfirmed && item.id_neighborhood) {
        this.neighborhoodService.delete(item.id_neighborhood).subscribe({
          next: () => {
            this.toastSuccess('Eliminado', 'El barrio fue retirado del sistema.');
            this.loadInitialData();
          }
        });
      }
    });
  }

  private toastSuccess(title: string, text: string): void {
    Swal.fire({ icon: 'success', title, text, timer: 1800, showConfirmButton: false });
  }

  // Handler para cerrar el mapa y recargar datos si hubo cambios
  onMapClose(changed: boolean) {
    this.isMapOpen = false;
    this.selectedNeighborhoodForMap = null;
    if (changed) this.loadInitialData();
  }
}