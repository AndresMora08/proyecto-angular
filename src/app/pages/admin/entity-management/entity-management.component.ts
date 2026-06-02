// src/app/pages/entity-management/entity-management.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntityService } from '../../../services/entity/entity.service';
import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericFormComponent } from '../../../components/ui/form/generic-form/generic-form.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';
import { Entity } from '../../../models/Entity';
import { TableAction, TableActionEvent } from '../../../models/components/Table';
import { FormField } from '../../../models/components/Form';

// IMPORTAMOS SWEETALERT2
import Swal from 'sweetalert2';

@Component({
  selector: 'app-entity-management',
  standalone: true,
  imports: [CommonModule, GenericTableComponent, GenericFormComponent, GenericSearchComponent],
  templateUrl: './entity-management.component.html',
  styleUrl: './entity-management.component.css'
})
export class EntityManagementComponent implements OnInit {
  // 'list' muestra solo la tabla. 'create' o 'edit' despliegan el formulario lateral derecho en paralelo.
  viewMode: 'list' | 'create' | 'edit' = 'list';

  // 💡 TESTIGO DE MEMORIA: Almacena la fila completa seleccionada en la tabla para no perder el ID
  activeRowEntity: Entity | null = null;

  entities: Entity[] = [];
  selectedEntity: any = {};
  searchTerm: string = '';

  tableColumns: string[] = ['logo', 'name', 'description', 'status'];

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

  formFields: FormField[] = [
    { name: 'file', label: 'Logo de la entidad', type: 'file', required: false },
    { name: 'name', label: 'Nombre de la entidad', type: 'text', required: true },
    { name: 'description', label: 'Descripción', type: 'text', required: true },
    { name: 'type', label: 'Tipo de entidad', type: 'select', options: ['Entidad Pública', 'Entidad Privada'], required: true },
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
        // 👇 Imprime directamente el arreglo exacto enviado por el backend
        console.log(data);

        this.entities = data;
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
      (entity.description && entity.description.toLowerCase().includes(query)) ||
      entity.nit.toLowerCase().includes(query)
    );
  }

  showCreateForm(): void {
    this.activeRowEntity = null;
    this.selectedEntity = { status: 'active', type: 'Entidad Pública' };
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
      // Guardamos una copia exacta de la fila a la que se le dio clic
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
          
          // Búsqueda inteligente de ID para la desactivación si no viene explícito
          let id = entityItem.id;
          if (!id) {
            const original = this.entities.find(e => e.nit === entityItem.nit || e.name === entityItem.name);
            id = original?.id;
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
              error: (err) => {
                console.error(err);
                Swal.fire({
                  icon: 'error',
                  title: 'Error operacional',
                  text: 'No se pudo actualizar el estado de la entidad.',
                  confirmButtonColor: '#2563eb'
                });
              }
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error de Identificador',
              text: 'No se pudo localizar el ID original de este registro.',
              confirmButtonColor: '#2563eb'
            });
          }
        }
      });
    }
  }

  handleFormSubmit(formData: Record<string, any>): void {
    const entityPayload = formData as Entity;

    if (this.viewMode === 'create') {
      this.entityService.create(entityPayload).subscribe({
        next: () => {
          this.backToList();
          Swal.fire({
            icon: 'success',
            title: '¡Registro Exitoso!',
            text: 'La nueva organización fue guardada en el sistema de manera correcta.',
            timer: 2500,
            showConfirmButton: false
          });
        },
        error: (err) => {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'No se pudo crear',
            text: 'Verifica los campos enviados o la estabilidad de la API.',
            confirmButtonColor: '#2563eb'
          });
        }
      });
    } 
    else if (this.viewMode === 'edit') {
      // 💡 ESTRATEGIA DE BÚSQUEDA CRUZADA (RESOLUCIÓN DE ID):
      
      // Intentamos extraer el ID directo del item seleccionado en la tabla
      let id = this.activeRowEntity?.id;
      
      // Si la fila carece de ID, buscamos en el listado maestro de la API comparando el NIT o el Nombre original
      if (!id && this.activeRowEntity) {
        const matchOriginal = this.entities.find(e => 
          e.nit === this.activeRowEntity!.nit || 
          e.name === this.activeRowEntity!.name
        );
        id = matchOriginal?.id;
      }

      // Si tu backend maneja variantes de nombres de columnas (ej: id_entity, entity_id)
      if (!id && this.activeRowEntity) {
        const cualquierObjeto = this.activeRowEntity as any;
        id = cualquierObjeto.id_entity || cualquierObjeto.entity_id || cualquierObjeto.idEntity;
      }

      // Si logramos resolver el identificador por cualquiera de las 3 vías anteriores, procesamos la petición HTTP
      if (id) {
        this.entityService.update(id, entityPayload).subscribe({
          next: () => {
            // 1. Cerramos inmediatamente la ventana lateral del formulario
            this.viewMode = 'list';
            
            // 2. Liberamos el testigo de la fila activa de la memoria
            this.activeRowEntity = null;
            
            // 3. Recargamos la tabla con la lista actualizada desde Flask
            this.loadEntities();
            
            // 4. Disparamos la alerta de SweetAlert2 con el check verde de éxito
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
              text: 'Ocurrió un problema al sincronizar los nuevos datos con el servidor.',
              confirmButtonColor: '#2563eb'
            });
          }
        });
      } else {
        // En caso extremo de que no encuentre coincidencias, imprime el objeto en consola para inspeccionarlo
        console.error('Estructura de la fila capturada sin ID identificable:', this.activeRowEntity);
        Swal.fire({
          icon: 'error',
          title: 'Error de consistencia',
          text: `No se localizó el ID de "${this.activeRowEntity?.name}". Comprueba los nombres de columna en los datos devueltos por tu backend.`,
          confirmButtonColor: '#2563eb'
        });
      }
    }
  }
}