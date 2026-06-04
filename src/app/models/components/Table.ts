// src/app/models/table.model.ts

export interface TableAction {
  name: string;
  label: string;
  customClass?: string; // Para estilos personalizados (Ej: 'text-red-500' para eliminar)
}

// Representa la firma de la función que reaccionará al click de una acción
export interface TableActionEvent {
  actionName: string;
  item: Record<string, any>;
}