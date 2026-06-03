import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../../services/category/category.service';
import { AnnotationCategoryService } from '../../../services/annotation-category/annotation-category.service';
import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericFormComponent } from '../../../components/ui/form/generic-form/generic-form.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';
import { Category } from '../../../models/Category';
import { AnnotationCategory } from '../../../models/AnnotationCategory';
import { TableAction, TableActionEvent } from '../../../models/components/Table';
import { FormField } from '../../../models/components/Form';
import { forkJoin } from 'rxjs';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [CommonModule, GenericTableComponent, GenericFormComponent, GenericSearchComponent],
  templateUrl: './category-management.component.html',
  styleUrl: './category-management.component.css'
})
export class CategoryManagementComponent implements OnInit {
  viewMode: 'list' | 'create' | 'edit' = 'list';
  activeRowCategory: any = null;

  categories: any[] = [];
  annotationCategories: AnnotationCategory[] = [];
  processedTableData: any[] = [];
  selectedCategory: any = {};
  searchTerm: string = '';

  tableColumns: string[] = ['logo', 'name', 'type', 'parent_name', 'status'];

  tableActions: TableAction[] = [
    { 
      name: 'edit', 
      label: 'Editar', 
      customClass: 'text-blue-500 hover:bg-blue-50 border-blue-200' 
    },
    { 
      name: 'delete', 
      label: 'Eliminar', 
      customClass: 'text-red-500 hover:bg-red-50 border-red-200' 
    }
  ];

  formFields: FormField[] = [
    { name: 'name', label: 'Nombre de la categoría', type: 'text', required: true },
    { name: 'description', label: 'Descripción', type: 'text', required: true },
    { name: 'file', label: 'Imagen representativa', type: 'file', required: false },
    { 
      name: 'id_parent_category', 
      label: 'Categoría padre (opcional)', 
      type: 'select', 
      options: [] as string[], // 💡 CAMBIADO: Estrictamente string[] para cumplir con tu formulario genérico
      required: false 
    },
    { name: 'status', label: 'Estado', type: 'select', options: ['Activa', 'Inactiva'], required: true }
  ];

  constructor(
    private categoryService: CategoryService,
    private annoCategoryService: AnnotationCategoryService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    forkJoin({
      cats: this.categoryService.getAll(),
      relations: this.annoCategoryService.getAll()
    }).subscribe({
      next: ({ cats, relations }) => {
        this.categories = cats;
        this.annotationCategories = relations;
        this.buildTableData();
        this.updateFormSelectOptions();
      },
      error: (err) => {
        console.error('Error al sincronizar datos de categorías:', err);
      }
    });
  }

  buildTableData(): void {
    this.processedTableData = this.categories.map(cat => {
      const hasParent = cat.id_parent_category && cat.id_parent_category !== 0;
      const parentNode = hasParent ? this.categories.find(c => c.id_category === cat.id_parent_category) : null;

      return {
        ...cat,
        type: hasParent ? 'Subcategoría' : 'Categoría Principal',
        parent_name: parentNode ? parentNode.name : '—'
      };
    });
  }

  // 💡 SOLUCIÓN MAESTRA: Guardamos el ID y el Nombre formateados como un solo String puro.
  // Tu componente HTML leerá "Ninguna" o "Infrastructure" limpiamente.
  updateFormSelectOptions(): void {
    const primaryCategories = this.categories.filter(c => !c.id_parent_category || c.id_parent_category === 0);
    
    const mappedOptions: string[] = [
      'Ninguna (Categoría Principal)', // Opción por defecto
      ...primaryCategories.map(c => `${c.id_category} | ${c.name}`) // Ej: "1 | Infrastructure"
    ];

    const parentField = this.formFields.find(f => f.name === 'id_parent_category');
    if (parentField) {
      parentField.options = mappedOptions;
    }
  }

  get filteredCategories(): any[] {
    if (!this.searchTerm.trim()) {
      return this.processedTableData;
    }
    const query = this.searchTerm.toLowerCase();
    return this.processedTableData.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.type.toLowerCase().includes(query) ||
      c.parent_name.toLowerCase().includes(query)
    );
  }

  showCreateForm(): void {
    this.activeRowCategory = null;
    // Por defecto al crear, se selecciona la opción de dejarla sin padre
    this.selectedCategory = { id_parent_category: 'Ninguna (Categoría Principal)', status: 'Activa', description: '' };
    this.viewMode = 'create';
  }

  backToList(): void {
    this.viewMode = 'list';
    this.activeRowCategory = null;
    this.loadData();
  }

  handleTableAction(event: TableActionEvent): void {
    const item = event.item as any; 

    if (event.actionName === 'edit') {
      this.activeRowCategory = item;
      
      // Al editar, buscamos si tiene padre para pre-seleccionar el string correspondiente en el selector genérico
      let selectStringValue = 'Ninguna (Categoría Principal)';
      if (item.id_parent_category && item.id_parent_category !== 0) {
        const parentNode = this.categories.find(c => c.id_category === item.id_parent_category);
        if (parentNode) {
          selectStringValue = `${parentNode.id_category} | ${parentNode.name}`;
        }
      }

      this.selectedCategory = { 
        ...item,
        id_parent_category: selectStringValue
      };
      this.viewMode = 'edit';
    } 
    else if (event.actionName === 'delete') {
      this.validateAndEliminate(item);
    }
  }

  validateAndEliminate(category: any): void {
    const targetId = category.id_category;

    const subcategoriesCount = this.categories.filter(c => c.id_parent_category === targetId).length;
    const annotationsCount = this.annotationCategories.filter(rc => rc.id_category === targetId).length;

    if (subcategoriesCount > 0 || annotationsCount > 0) {
      Swal.fire({
        icon: 'error',
        title: 'No se puede eliminar',
        html: `
          <div class="text-left text-sm space-y-2">
            <p>La categoría <strong>"${category.name}"</strong> posee dependencias activas:</p>
            <ul class="list-disc pl-5 font-semibold text-red-600">
              <li>Subcategorías hijas: ${subcategoriesCount}</li>
              <li>Anotaciones asociadas: ${annotationsCount}</li>
            </ul>
            <p class="pt-2 text-gray-500">Reasigna estas relaciones antes de borrar.</p>
          </div>
        `,
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    Swal.fire({
      title: '¿Confirmas la eliminación?',
      text: `Esta acción removerá definitivamente la categoría "${category.name}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && targetId) {
        this.categoryService.delete(targetId).subscribe({
          next: () => {
            this.loadData();
            Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Categoría removida.', timer: 1800, showConfirmButton: false });
          },
          error: (err) => console.error(err)
        });
      }
    });
  }

  handleFormSubmit(formData: Record<string, any>): void {
    const targetId = this.activeRowCategory?.id_category;
    const selectedParentString = formData['id_parent_category'] || '';

    // 💡 DESENCRIPTADO DEL STRING: Leemos el string devuelto por el formulario genérico
    let parentId = 0; // Si es "Ninguna (Categoría Principal)", el backend lo recibe como 0
    
    if (selectedParentString && selectedParentString.includes('|')) {
      // Si incluye la barra, significa que viene en formato "1 | Infrastructure", extraemos el número '1'
      parentId = Number(selectedParentString.split('|')[0].trim());
    }

    const payload: Category = {
      ...formData,
      id_parent_category: parentId, // Pasamos el ID numérico real al backend
      image_url: this.activeRowCategory?.image_url || 'categories/default.png',
      description: formData['description'] || 'Categoría del sistema',
      status: formData['status'] || 'Activa'
    } as Category;

    if (this.viewMode === 'create') {
      this.categoryService.create(payload).subscribe({
        next: () => {
          this.backToList();
          Swal.fire({ icon: 'success', title: 'Creada', text: 'Nueva categoría/subcategoría almacenada.', timer: 2000, showConfirmButton: false });
        },
        error: (err) => console.error(err)
      });
    } 
    else if (this.viewMode === 'edit' && targetId) {
      this.categoryService.update(targetId, payload).subscribe({
        next: () => {
          this.backToList();
          Swal.fire({ icon: 'success', title: 'Actualizada', text: 'Los cambios jerárquicos se han guardado.', timer: 2000, showConfirmButton: false });
        },
        error: (err) => console.error(err)
      });
    }
  }
}