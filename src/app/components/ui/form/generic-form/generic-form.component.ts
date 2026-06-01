// src/app/components/generic-form/generic-form.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../../../models/components/Form';

@Component({
  selector: 'app-generic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './generic-form.component.html',
  styleUrl: './generic-form.component.css'
})
export class GenericFormComponent implements OnInit, OnChanges {
  @Input() fields: FormField[] = [];
  @Input() buttonLabel: string = 'Guardar';
  @Input() initialValues: Record<string, any> = {};

  @Output() onSubmit = new EventEmitter<Record<string, any>>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForm();
  }

  // Detecta si los valores iniciales cambian desde el padre para actualizar el formulario
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValues'] && this.form) {
      this.form.patchValue(this.initialValues);
    }
  }

  // Construye el formulario reactivo dinámicamente
  buildForm(): void {
    const group: Record<string, any> = {};

    this.fields.forEach(field => {
      const validators = [];
      
      if (field.required) validators.push(Validators.required);
      if (field.type === 'email') validators.push(Validators.email);

      // Determinar valor por defecto (si es un select, agarra la primera opción por defecto)
      let defaultValue = this.initialValues[field.name] ?? '';
      if (field.type === 'select' && field.options?.length && !this.initialValues[field.name]) {
        defaultValue = field.options[0];
      }

      group[field.name] = [defaultValue, validators];
    });

    this.form = this.fb.group(group);
  }

  // Captura el archivo multimedia cuando el usuario selecciona una foto/archivo
  onFileChange(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Guardamos el archivo binario directamente en el estado del formulario
      this.form.patchValue({ [fieldName]: file });
    }
  }

  // Validador visual para los errores en el HTML
  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  sendForm(): void {
    if (this.form.valid) {
      this.onSubmit.emit(this.form.value);
    } else {
      this.form.markAllAsTouched(); // Marca errores si intentan enviar vacío
    }
  }
}