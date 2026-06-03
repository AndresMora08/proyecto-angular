import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- NUEVO: Importación necesaria para standalone
import { OfficialService } from '../../../services/official/official.service';
import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericFormComponent } from '../../../components/ui/form/generic-form/generic-form.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';
import { Official } from '../../../models/Official';
import { FormField } from '../../../models/components/Form';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, // <-- NUEVO: Agregado aquí
    GenericTableComponent, 
    GenericFormComponent, 
    GenericSearchComponent
  ],
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css'
})
export class StaffManagementComponent implements OnInit {
  viewMode: 'list'|'create'|'edit' = 'list';
  funcionarios: Official[] = [];
  selected: any = {};
  searchTerm: string = '';

  tableColumns = ['name','email','role','phone'];

  formFields: FormField[] = [
    { name: 'name', label: 'Nombre', type: 'text' as const, required: true },
    { name: 'email', label: 'Correo', type: 'email' as const, required: true },
    { name: 'role', label: 'Cargo / Rol', type: 'text' as const, required: true },
    { name: 'cellphone', label: 'Celular', type: 'text' as const, required: false }
  ];

  constructor(private officialService: OfficialService) {}

  ngOnInit(): void {
    this.loadFuncionarios();
  }

  loadFuncionarios(): void {
    this.officialService.getAll().subscribe({
      next: (data) => this.funcionarios = data || [],
      error: () => this.funcionarios = []
    });
  }

  showCreate() { this.viewMode = 'create'; this.selected = {}; }
  backToList() { this.viewMode = 'list'; this.selected = {}; this.loadFuncionarios(); }

  handleFormSubmit(payload: any) {
    if (this.viewMode === 'create') {
      this.officialService.create(payload).subscribe(() => this.backToList(), () => this.backToList());
    } else if (this.viewMode === 'edit') {
      const id = this.selected?.id;
      if (id) this.officialService.update(id, payload).subscribe(() => this.backToList(), () => this.backToList());
    }
  }

  handleTableAction(event: any) {
    if (event.actionName === 'edit') {
      this.selected = { ...event.item };
      this.viewMode = 'edit';
    }
  }
}