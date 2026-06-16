import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { OfficialService } from '../../../services/official/official.service';
import { EntityService } from '../../../services/entity/entity.service';
import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericFormComponent } from '../../../components/ui/form/generic-form/generic-form.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';
import { Official } from '../../../models/Official';
import { Entity } from '../../../models/Entity';
import { TableAction, TableActionEvent } from '../../../models/components/Table';
import { FormField } from '../../../models/components/Form';
import * as L from 'leaflet';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    GenericTableComponent, 
    GenericFormComponent, 
    GenericSearchComponent
  ],
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css'
})
export class StaffManagementComponent implements OnInit {
  viewMode: 'list' | 'create' | 'edit' = 'list';
  
  funcionarios: Official[] = [];
  filteredFuncionarios: Official[] = [];
  entidades: Entity[] = [];
  
  selected: any = {};
  searchTerm: string = '';
  selectedEntityFilter: string = '';

  tableColumns = ['id_entity', 'name', 'email', 'role', 'phone', 'status'];

  tableActions: TableAction[] = [
    { 
      name: 'edit', 
      label: 'Editar', 
      customClass: 'text-blue-500 hover:bg-blue-50 border-blue-200 dark:hover:bg-blue-900/20' 
    },
    { 
      name: 'delete', 
      label: 'Eliminar', 
      customClass: 'text-red-500 hover:bg-red-50 border-red-200 dark:hover:bg-red-900/20' 
    }
  ];

  formFields: FormField[] = [
    { 
      name: 'id_entity', 
      label: 'Entidad Asociada', 
      type: 'select', 
      required: true,
      options: []
    },
    { name: 'name', label: 'Nombre Completo', type: 'text', required: true },
    { name: 'email', label: 'Correo Electrónico', type: 'email', required: true },
    { name: 'role', label: 'Cargo / Rol asignado', type: 'text', required: true },
    { name: 'phone', label: 'Número de Celular', type: 'text', required: true },
    { 
      name: 'status', 
      label: 'Estado del Funcionario', 
      type: 'select', 
      required: true,
      options: ['active', 'inactive']
    }
  ];

  // 💡 Mapa de selección de ubicación (mismo patrón usado en CitizenManagementComponent)
  private map!: L.Map;
  private currentMarker: L.Marker | null = null;

  private readonly defaultLat = 5.096;
  private readonly defaultLng = -75.515;

  constructor(
    private officialService: OfficialService,
    private entityService: EntityService
  ) {}

  ngOnInit(): void {
    this.loadEntidades();
    this.loadFuncionarios();
  }

  loadEntidades(): void {
    this.entityService.getAll().subscribe({
      next: (data) => {
        this.entidades = data || [];
        const entityNames = this.entidades.map(e => e.name);
        const entityField = this.formFields.find(f => f.name === 'id_entity');
        if (entityField) {
          entityField.options = entityNames;
        }
      },
      error: (err) => console.error("❌ Error al cargar entidades:", err)
    });
  }

  loadFuncionarios(): void {
    this.officialService.getAll().subscribe({
      next: (data) => {
        console.log("👤 Officials de la DB:", data);
        this.funcionarios = data || [];
        this.applyFilters();
      },
      error: (err) => {
        console.error("❌ Error al cargar funcionarios:", err);
        this.funcionarios = [];
        this.filteredFuncionarios = [];
      }
    });
  }

  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredFuncionarios = this.funcionarios.filter(f => {
      const matchesSearch = !this.searchTerm ? true : 
        (f.name && f.name.toLowerCase().includes(this.searchTerm.toLowerCase())) || 
        (f.email && f.email.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      const matchesEntity = !this.selectedEntityFilter ? true : 
        f.id_entity === Number(this.selectedEntityFilter);

      return matchesSearch && matchesEntity;
    });
  }

  showCreate() { 
    this.viewMode = 'create'; 
    this.selected = { 
      status: 'active',
      last_latitude: this.defaultLat,
      last_longitude: this.defaultLng,
      last_gps_update: null,
      gps_active: true
    }; 
    // Esperamos un tick para que el <div id="map-official"> exista en el DOM antes de inicializar Leaflet
    setTimeout(() => this.initMap(), 0);
  }

  backToList() { 
    this.viewMode = 'list'; 
    this.selected = {}; 
    this.currentMarker = null;
    this.loadFuncionarios(); 
  }

  // 💡 Mismo patrón que en AnnotationCreateComponent / CitizenManagementComponent
  private initMap(): void {
    const lat = this.selected?.last_latitude || this.defaultLat;
    const lng = this.selected?.last_longitude || this.defaultLng;

    this.map = L.map('map-official').setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.setMarker(lat, lng);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.setMarker(lat, lng);
    });
  }

  setMarker(lat: number, lng: number): void {
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
    }
    this.currentMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
    this.selected.last_latitude = lat;
    this.selected.last_longitude = lng;

    this.currentMarker.on('dragend', () => {
      if (this.currentMarker) {
        const position = this.currentMarker.getLatLng();
        this.selected.last_latitude = position.lat;
        this.selected.last_longitude = position.lng;
      }
    });
  }

  handleFormSubmit(payload: any): void {
    console.log("➡️ Payload crudo recibido del formulario:", payload);

    // Encontrar la entidad real basada en el nombre seleccionado en el formulario genérico
    const entidadSeleccionada = this.entidades.find(e => e.name === payload.id_entity);
    const idEntityResuelto = entidadSeleccionada ? entidadSeleccionada.id_entity : null;

    // 🛠️ MAPEADO EXPLÍCITO SEGURO: Evita arrastrar propiedades erróneas o duplicar el id_entity en el ID del funcionario.
    const processedPayload: Official = {
      id_entity: Number(idEntityResuelto),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      status: payload.status,
      last_latitude: this.selected?.last_latitude ?? this.defaultLat,
      last_longitude: this.selected?.last_longitude ?? this.defaultLng,
      last_gps_update: this.selected?.last_gps_update || null,
      gps_active: this.selected?.gps_active !== undefined ? this.selected.gps_active : true
    };

    if (this.viewMode === 'create') {
      // ⚠️ Al crear, eliminamos explícitamente cualquier clave de ID para que el Backend autoincremente solo
      delete processedPayload.id_official;

      this.officialService.checkEmailExists(processedPayload.email).subscribe({
        next: (exists) => {
          if (exists) {
            Swal.fire({
              icon: 'error',
              title: 'Conflictos de Registro',
              text: 'El correo electrónico ingresado ya se encuentra registrado previamente en el sistema.',
              confirmButtonColor: '#ef4444'
            });
          } else {
            this.officialService.create(processedPayload).subscribe({
              next: () => {
                Swal.fire('¡Creado!', 'Funcionario creado y asignado con éxito.', 'success');
                this.backToList();
              },
              error: (err) => {
                console.error("❌ Error en la creación del funcionario:", err);
                Swal.fire('Error', 'No se pudo guardar el registro en el servidor.', 'error');
              }
            });
          }
        }
      });

    } else if (this.viewMode === 'edit') {
      // 🔄 Recuperamos estrictamente el ID del funcionario original seleccionado para la edición
      const idOfficial = this.selected?.id_official || this.selected?.id;
      
      if (idOfficial) {
        // Asignamos el ID correcto al cuerpo de la petición por si la API lo requiere en el body
        processedPayload.id_official = Number(idOfficial);

        console.log(`✏️ Solicitando actualización en API para ID Funcionario: ${idOfficial}`, processedPayload);

        this.officialService.update(Number(idOfficial), processedPayload).subscribe({
          next: () => {
            Swal.fire('¡Actualizado!', 'Datos modificados correctamente.', 'success');
            this.backToList();
          },
          error: (err) => {
            console.error("❌ Error al actualizar el funcionario:", err);
            Swal.fire('Error', 'No se pudieron guardar los cambios en el servidor.', 'error');
          }
        });
      } else {
        Swal.fire('Error de Identificador', 'No se detectó un id_official válido para actualizar este registro.', 'error');
      }
    }
  }

  handleTableAction(event: TableActionEvent): void {
    if (event.actionName === 'edit') {
      const itemClone = { ...event.item };

      const entidadAsociada = this.entidades.find(e => Number(e.id_entity) === Number(itemClone['id_entity']));
      if (entidadAsociada) {
        itemClone['id_entity'] = entidadAsociada.name;
      }

      this.selected = itemClone;
      if (!this.selected.last_latitude || !this.selected.last_longitude) {
        this.selected.last_latitude = this.defaultLat;
        this.selected.last_longitude = this.defaultLng;
      }
      this.viewMode = 'edit';
      console.log("Selected item mapeado para edición:", this.selected);
      setTimeout(() => this.initMap(), 0);
    } else if (event.actionName === 'delete') {
      this.confirmDeleteOfficial(event.item);
    }
  }

  confirmDeleteOfficial(official: any): void {
    if (official.hasAnnotations || official.hasDemarcations) {
      Swal.fire({
        icon: 'warning',
        title: 'Operación Denegada',
        text: 'No es posible eliminar al funcionario debido a que cuenta con anotaciones o demarcaciones territoriales asociadas.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    Swal.fire({
      title: '¿Confirmas la eliminación?',
      text: `Esta acción removerá definitivamente a ${official.name} de la plataforma.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        const id = official.id_official || official.id;
        if (id) {
          this.officialService.delete(Number(id)).subscribe({
            next: () => {
              Swal.fire('Eliminado', 'El registro ha sido removido.', 'success');
              this.loadFuncionarios();
            },
            error: (err) => console.error("❌ Error al eliminar:", err)
          });
        }
      }
    });
  }
}