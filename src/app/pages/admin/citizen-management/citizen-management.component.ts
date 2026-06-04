import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { CitizenService } from '../../../services/citizen/citizen.service';
import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericFormComponent } from '../../../components/ui/form/generic-form/generic-form.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';
import { Citizen } from '../../../models/Citizen';
import { FormField } from '../../../models/components/Form';
import { TableAction, TableActionEvent } from '../../../models/components/Table'; // Asegúrate de importar estas interfaces

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
export class CitizenManagementComponent implements OnInit {
  viewMode: 'list' | 'create' | 'edit' = 'list';
  ciudadanos: Citizen[] = [];
  selected: any = {};
  searchTerm: string = '';

  tableColumns = ['name', 'email', 'phone', 'address'];

  // ¡NUEVO!: Acciones añadidas según requerimiento de CU-03
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
    { name: 'name', label: 'Nombre completo', type: 'text' as const, required: true },
    { name: 'email', label: 'Correo electrónico', type: 'email' as const, required: true },
    { name: 'phone', label: 'Celular', type: 'text' as const, required: true },
    { name: 'address', label: 'Dirección', type: 'text' as const, required: true }
  ];

  constructor(private citizenService: CitizenService) {}

  ngOnInit(): void { 
    this.loadCiudadanos(); 
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

  // ¡NUEVO!: Getter reactivo para que el buscador filtre instantáneamente
  // Recuerda que en tu archivo HTML de este componente debes iterar sobre [data]="filteredCiudadanos"
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
    this.selected = { status: 'active' }; 
  }
  
  backToList() { 
    this.viewMode = 'list'; 
    this.selected = {}; 
    this.loadCiudadanos(); 
  }

  handleFormSubmit(payload: any) {
    const citizenPayload: Citizen = {
      ...payload,
      latitude: this.selected?.latitude || 5.095742,   
      longitude: this.selected?.longitude || -75.514832,
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

  // ¡ACTUALIZADO!: Maneja la edición y eliminación (CU-03)
  handleTableAction(event: any) {
    const citizenItem = event.item as Citizen;

    if (event.actionName === 'edit') {
      this.selected = { ...citizenItem };
      this.viewMode = 'edit';
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
                this.loadCiudadanos(); // Refresca el listado de inmediato
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