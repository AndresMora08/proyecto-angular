import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitizenService } from '../../../services/citizen/citizen.service';
import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericFormComponent } from '../../../components/ui/form/generic-form/generic-form.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';
import { Citizen } from '../../../models/Citizen';
import { FormField } from '../../../models/components/Form';
import { TableAction, TableActionEvent } from '../../../models/components/Table';
import * as L from 'leaflet';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-citizen-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GenericTableComponent,
    GenericFormComponent,
    GenericSearchComponent
  ],
  templateUrl: './citizen-management.component.html',
  styleUrl: './citizen-management.component.css'
})
export class CitizenManagementComponent implements OnInit, AfterViewInit {
  viewMode: 'list' | 'create' | 'edit' = 'list';
  ciudadanos: Citizen[] = [];
  selected: any = {};
  searchTerm: string = '';

  tableColumns = ['name', 'email', 'phone', 'address'];

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

  // ¡ACTUALIZADO!: se quita 'address' porque ahora se establece con el mapa, no como texto libre
  formFields: FormField[] = [
    { name: 'name', label: 'Nombre completo', type: 'text' as const, required: true },
    { name: 'email', label: 'Correo electrónico', type: 'email' as const, required: true },
    { name: 'phone', label: 'Celular', type: 'text' as const, required: true }
  ];

  // 💡 Mapa de selección de ubicación (mismo patrón que AnnotationCreateComponent)
  private map!: L.Map;
  private currentMarker: L.Marker | null = null;

  private readonly defaultLat = 5.095742;
  private readonly defaultLng = -75.514832;

  constructor(private citizenService: CitizenService) {}

  ngOnInit(): void {
    this.loadCiudadanos();
  }

  ngAfterViewInit(): void {
    // El mapa se inicializa al entrar en create/edit (ver showCreate / handleTableAction),
    // porque el <div id="map-citizen"> no existe en el DOM mientras viewMode === 'list'.
  }

  loadCiudadanos(): void {
    this.citizenService.getAll().subscribe({
      next: (d) => {
        console.log("Datos ciudadanos de Flask:", d);
        this.ciudadanos = d || [];
      },
      error: () => this.ciudadanos = []
    });
  }

  get filteredCiudadanos(): Citizen[] {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      return this.ciudadanos;
    }
    const query = this.searchTerm.toLowerCase().trim();
    return this.ciudadanos.filter(c =>
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone && c.phone.toLowerCase().includes(query))
    );
  }

  showCreate() {
    this.viewMode = 'create';
    this.selected = {
      status: 'active',
      latitude: this.defaultLat,
      longitude: this.defaultLng,
      address: this.formatAddress(this.defaultLat, this.defaultLng)
    };
    // Esperamos un tick para que el <div id="map-citizen"> exista en el DOM antes de inicializar Leaflet
    setTimeout(() => this.initMap(), 0);
  }

  backToList() {
    this.viewMode = 'list';
    this.selected = {};
    this.currentMarker = null;
    this.loadCiudadanos();
  }

  // 💡 Igual que en AnnotationCreateComponent: crea el mapa y escucha clicks
  private initMap(): void {
    const lat = this.selected?.latitude || this.defaultLat;
    const lng = this.selected?.longitude || this.defaultLng;

    this.map = L.map('map-citizen').setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Colocamos el marcador inicial en la posición actual (default o la del ciudadano en edición)
    this.setMarker(lat, lng);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.setMarker(lat, lng);
    });
  }

  // 💡 Mismo patrón que setMarker() en AnnotationCreateComponent
  setMarker(lat: number, lng: number): void {
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
    }
    this.currentMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
    this.selected.latitude = lat;
    this.selected.longitude = lng;
    this.selected.address = this.formatAddress(lat, lng);

    this.currentMarker.on('dragend', () => {
      if (this.currentMarker) {
        const position = this.currentMarker.getLatLng();
        this.selected.latitude = position.lat;
        this.selected.longitude = position.lng;
        this.selected.address = this.formatAddress(position.lat, position.lng);
      }
    });
  }

  private formatAddress(lat: number, lng: number): string {
    return `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
  }

  handleFormSubmit(payload: any) {
    const citizenPayload: Citizen = {
      ...payload,
      address: this.selected?.address || this.formatAddress(this.defaultLat, this.defaultLng),
      latitude: this.selected?.latitude ?? this.defaultLat,
      longitude: this.selected?.longitude ?? this.defaultLng,
      status: this.selected?.status || 'active'
    };

    if (this.viewMode === 'create') {
      this.citizenService.create(citizenPayload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: '¡Ciudadano Registrado!',
            text: 'El nuevo ciudadano fue guardado con éxito en el sistema.',
            timer: 2000,
            showConfirmButton: false
          }).then(() => {
            this.backToList();
          });
        },
        error: (err) => {
          console.error("Error al registrar ciudadano:", err);
          Swal.fire({
            icon: 'error',
            title: 'Error de inserción',
            text: 'No se pudo guardar la información en la base de datos.',
            confirmButtonColor: '#2563eb'
          });
        }
      });
    } else if (this.viewMode === 'edit') {
      const id = this.selected?.id_citizen || this.selected?.id;
      if (id) {
        this.citizenService.update(id, citizenPayload).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: '¡Datos Actualizados!',
              text: 'Los cambios del ciudadano se sincronizaron con éxito.',
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              this.backToList();
            });
          },
          error: (err) => {
            console.error("Error al actualizar ciudadano:", err);
            Swal.fire({
              icon: 'error',
              title: 'Error de actualización',
              text: 'No se pudieron modificar los datos actuales.',
              confirmButtonColor: '#2563eb'
            });
          }
        });
      }
    }
  }

  handleTableAction(event: any) {
    const citizenItem = event.item as Citizen;

    if (event.actionName === 'edit') {
      this.selected = { ...citizenItem };
      if (!this.selected.latitude || !this.selected.longitude) {
        this.selected.latitude = this.defaultLat;
        this.selected.longitude = this.defaultLng;
      }
      this.viewMode = 'edit';
      setTimeout(() => this.initMap(), 0);
    }
    else if (event.actionName === 'delete') {
      Swal.fire({
        title: '¿Estás seguro?',
        text: `Vas a eliminar definitivamente a el ciudadano "${citizenItem.name}".`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          const id = citizenItem.id_citizen || citizenItem.id;

          if (id) {
            this.citizenService.delete(id).subscribe({
              next: () => {
                this.loadCiudadanos();
                Swal.fire({
                  icon: 'success',
                  title: '¡Eliminado!',
                  text: 'El ciudadano ha sido removido del sistema.',
                  timer: 2000,
                  showConfirmButton: false
                });
              },
              error: (err) => {
                console.error("Error al borrar el ciudadano:", err);
                Swal.fire({
                  icon: 'error',
                  title: 'No se pudo eliminar',
                  text: 'Hubo un inconveniente al comunicarse con el servidor.',
                  confirmButtonColor: '#2563eb'
                });
              }
            });
          }
        }
      });
    }
  }
}