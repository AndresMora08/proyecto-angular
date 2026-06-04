// src/app/components/generic-search/generic-search.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 Crucial para poder usar ngModel

@Component({
  selector: 'app-generic-search',
  standalone: true,
  imports: [CommonModule, FormsModule], // Importamos FormsModule para el manejo del input
  templateUrl: './generic-search.component.html',
  styleUrl: './generic-search.component.css'
})
export class GenericSearchComponent {
  @Input() label?: string;
  @Input() placeholder: string = 'Buscar...';
  @Input() value: string = '';

  // Al llamarse exactamente igual que el Input pero con el sufijo "Change",
  // Angular habilita automáticamente el "Two-way data binding" (enlace bidireccional)
  @Output() valueChange = new EventEmitter<string>();

  // Se ejecuta cada vez que el usuario escribe un carácter
  onInputChange(newValue: string): void {
    this.valueChange.emit(newValue);
  }
}