import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CitizenService } from '../../../services/citizen/citizen.service';
import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';
import { GenericFormComponent } from '../../../components/ui/form/generic-form/generic-form.component';
import { GenericSearchComponent } from '../../../components/ui/search/generic-search/generic-search.component';
import { Citizen } from '../../../models/Citizen';

@Component({
  selector: 'app-citizen-management',
  standalone: true,
  imports: [CommonModule, GenericTableComponent, GenericFormComponent, GenericSearchComponent],
  templateUrl: './citizen-management.component.html',
  styleUrls: ['./citizen-management.component.css']
})
export class CitizenManagementComponent implements OnInit {
  viewMode: 'list'|'create'|'edit' = 'list';
  ciudadanos: Citizen[] = [];
  selected: any = {};

  tableColumns = ['name','email','cellphone','address'];

  formFields = [
    { name: 'name', label: 'Nombre', type: 'text', required: true },
    { name: 'email', label: 'Correo', type: 'email', required: false },
    { name: 'cellphone', label: 'Celular', type: 'text', required: false },
    { name: 'address', label: 'Dirección', type: 'text', required: false }
  ];

  constructor(private citizenService: CitizenService) {}

  ngOnInit(): void { this.loadCiudadanos(); }

  loadCiudadanos(): void {
    this.citizenService.getAll().subscribe({ next: (d) => this.ciudadanos = d || [], error: () => this.ciudadanos = [] });
  }

  showCreate() { this.viewMode = 'create'; this.selected = {}; }
  backToList() { this.viewMode = 'list'; this.selected = {}; this.loadCiudadanos(); }

  handleFormSubmit(payload: any) {
    if (this.viewMode === 'create') {
      this.citizenService.create(payload).subscribe(() => this.backToList(), () => this.backToList());
    } else if (this.viewMode === 'edit') {
      const id = this.selected?.id;
      if (id) this.citizenService.update(id, payload).subscribe(() => this.backToList(), () => this.backToList());
    }
  }

  handleTableAction(event: any) {
    if (event.actionName === 'edit') {
      this.selected = { ...event.item };
      this.viewMode = 'edit';
    }
  }
}
