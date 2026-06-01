// src/app/models/form.model.ts

export interface FormField {
  name: string;
  label: string;
  // Soporta 'text', 'number', 'email', 'password', 'select' y 'file'
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'file';
  options?: string[]; // Para los desplegables (Ej: ['Activa', 'Inactiva'])
  required?: boolean;  // Si el campo es obligatorio
}