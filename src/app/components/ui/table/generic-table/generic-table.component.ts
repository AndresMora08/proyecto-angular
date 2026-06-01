// src/app/components/generic-table/generic-table.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableAction, TableActionEvent } from '../../../../models/components/Table';
@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [CommonModule], // Necesario si usas clases dinámicas o pipes comunes
  templateUrl: './generic-table.component.html',
  styleUrl: './generic-table.component.css' // o .scss si usas preprocesadores
})
export class GenericTableComponent {
  // @Input() equivale a las propiedades (Props) en React
  @Input() data: Record<string, any>[] = [];
  @Input() columns: string[] = [];
  @Input() actions: TableAction[] = [];

  // @Output() es la forma en que Angular envía eventos hacia el componente padre (onAction de React)
  @Output() onAction = new EventEmitter<TableActionEvent>();

  // Método que se activa al hacer clic en un botón de acción
  handleAction(event: MouseEvent, actionName: string, item: Record<string, any>): void {
    event.stopPropagation(); // Evita la propagación del clic en la fila si existiera
    this.onAction.emit({ actionName, item });
  }
}