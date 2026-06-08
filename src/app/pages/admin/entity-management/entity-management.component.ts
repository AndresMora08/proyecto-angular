import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntityService } from '../../../services/entity/entity.service';
import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericFormComponent } from '../../../components/ui/form/generic-form/generic-form.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';
import { Entity } from '../../../models/Entity';
import { TableAction, TableActionEvent } from '../../../models/components/Table';
import { FormField } from '../../../models/components/Form';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-entity-management',
  standalone: true,
  imports: [CommonModule, GenericTableComponent, GenericFormComponent, GenericSearchComponent],
  templateUrl: './entity-management.component.html',
  styleUrl: './entity-management.component.css'
})
export class EntityManagementComponent implements OnInit {
  viewMode: 'list' | 'create' | 'edit' = 'list';
  activeRowEntity: Entity | null = null;

  entities: Entity[] = [];
  selectedEntity: any = {};
  searchTerm: string = '';

  tableColumns: string[] = ['logo', 'name', 'status'];

  tableActions: TableAction[] = [
    { 
      name: 'edit', 
      label: 'Editar', 
      customClass: 'text-blue-500 hover:bg-blue-50 border-blue-200 dark:hover:bg-blue-900/20' 
    },
    { 
      name: 'disable', 
      label: 'Desactivar', 
      customClass: 'text-red-500 hover:bg-red-50 border-red-200 dark:hover:bg-red-900/20' 
    }
  ];

  // CORREGIDO: Se quitó totalmente el campo 'type' (Tipo de entidad)
  formFields: FormField[] = [
    { name: 'file', label: 'Logo de la entidad', type: 'file', required: false },
    { name: 'name', label: 'Nombre de la entidad', type: 'text', required: true },
    { name: 'nit', label: 'NIT', type: 'text', required: true },
    { name: 'phone', label: 'Teléfono', type: 'text', required: false },
    { name: 'email', label: 'Correo electrónico', type: 'email', required: true },
    { name: 'address', label: 'Dirección', type: 'text', required: true },
    { name: 'status', label: 'Estado', type: 'select', options: ['active', 'inactive'], required: true }
  ];

  constructor(private entityService: EntityService) {}

  ngOnInit(): void {
    this.loadEntities();
  }

  loadEntities(): void {
    this.entityService.getAll().subscribe({
      next: (data) => {
        console.log("Datos puros devueltos por el Backend:", data); 

        this.entities = data.map((entity: any) => {
          const currentLogoValue = entity.logo_url || entity.logo || '';

          return {
            ...entity,
            logo_url: this.entityService.getLogoUrl(currentLogoValue),
            logo: this.entityService.getLogoUrl(currentLogoValue) 
          };
        });
      },
      error: (err) => {
        console.error('Error al cargar entidades:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error de conexión',
          text: 'No se pudieron recuperar las entidades desde el servidor.',
          confirmButtonColor: '#2563eb'
        });
      }
    });
  }

  get filteredEntities(): Entity[] {
    if (!this.searchTerm.trim()) {
      return this.entities;
    }
    const query = this.searchTerm.toLowerCase();
    return this.entities.filter(entity => 
      entity.name.toLowerCase().includes(query) || 
      entity.nit.toLowerCase().includes(query)
    );
  }

  showCreateForm(): void {
    this.activeRowEntity = null;
    this.selectedEntity = { status: 'active' };
    this.viewMode = 'create';
  }

  backToList(): void {
    this.viewMode = 'list';
    this.activeRowEntity = null;
    this.loadEntities();
  }

  handleTableAction(event: TableActionEvent): void {
    const entityItem = event.item as Entity;

    if (event.actionName === 'edit') {
      this.activeRowEntity = entityItem; 
      this.selectedEntity = { ...entityItem };
      this.viewMode = 'edit';
    } 
    else if (event.actionName === 'disable') {
      Swal.fire({
        title: '¿Estás seguro?',
        text: `Vas a cambiar el estado de "${entityItem.name}" a Inactiva.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, desactivar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          let id = entityItem.id_entity || (entityItem as any).id_entity;
          if (!id) {
            const original = this.entities.find(e => e.nit === entityItem.nit || e.name === entityItem.name);
            id = original?.id_entity || (original as any)?.id_entity;
          }

          if (id) {
            const updatedEntity: Entity = { ...entityItem, status: 'inactive' };
            this.entityService.update(id, updatedEntity).subscribe({
              next: () => {
                this.loadEntities();
                Swal.fire({
                  icon: 'success',
                  title: '¡Desactivada!',
                  text: 'La entidad ha sido inhabilitada con éxito.',
                  timer: 2000,
                  showConfirmButton: false
                });
              },
              error: (err) => console.error(err)
            });
          }
        }
      });
    }
  }

  handleFormSubmit(formData: Record<string, any>): void {
    console.log('➡️ handleFormSubmit detectado correctamente desde el HTML.');
    console.log('Datos interceptados del Formulario:', formData);

    const cleanedPayload = { ...formData };

    if (!(cleanedPayload['file'] instanceof File)) {
      delete cleanedPayload['file'];
    }

    const entityPayload = cleanedPayload as Entity;

    if (this.viewMode === 'create') {
      this.entityService.create(entityPayload).subscribe({
        next: () => {
          this.backToList();
          Swal.fire({
            icon: 'success',
            title: '¡Registro Exitoso!',
            text: 'La nueva organización fue guardada en el sistema.',
            timer: 2500,
            showConfirmButton: false
          });
        },
        error: (err) => {
          console.error('Detalle completo del error HTTP:', err); 
          Swal.fire({
            icon: 'error',
            title: 'No se pudo crear',
            text: err.error?.message || 'Verifica los campos enviados o la estabilidad de la API.',
            confirmButtonColor: '#2563eb'
          });
        }
      });
    } 
    else if (this.viewMode === 'edit') {
      let id = this.activeRowEntity?.id_entity || (this.activeRowEntity as any)?.id_entity || (this.activeRowEntity as any)?.entity_id;
      
      if (!id && this.activeRowEntity) {
        const matchOriginal = this.entities.find(e => 
          String(e.nit).trim() === String(this.activeRowEntity!.nit).trim() || 
          String(e.name).trim().toLowerCase() === String(this.activeRowEntity!.name).trim().toLowerCase()
        );
        id = matchOriginal?.id_entity || (matchOriginal as any)?.id_entity;
      }

      console.log('ID resuelto para enviar a la API de Flask:', id);

      if (id) {
        this.entityService.update(id, entityPayload).subscribe({
          next: () => {
            this.viewMode = 'list';
            this.activeRowEntity = null;
            this.loadEntities();
            
            Swal.fire({
              icon: 'success',
              title: '¡Actualización Exitosa!',
              text: 'Los cambios de la entidad se guardaron de manera correcta.',
              timer: 2200,
              showConfirmButton: false
            });
          },
          error: (err) => {
            console.error('Error al actualizar en la API:', err);
            Swal.fire({
              icon: 'error',
              title: 'Error de actualización',
              text: 'Ocurrió un problema al sincronizar los nuevos datos.',
              confirmButtonColor: '#2563eb'
            });
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error de Identificador',
          text: 'No se pudo encontrar el ID correspondiente a este registro para realizar la edición.',
          confirmButtonColor: '#dc2626'
        });
      }
    }
  }
}