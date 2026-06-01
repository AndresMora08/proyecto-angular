// src/app/models/table.model.ts

export interface TableAction {
  name: string;
  label: string;
}

// Representa la firma de la función que reaccionará al click de una acción
export interface TableActionEvent {
  actionName: string;
  item: Record<string, any>;
}