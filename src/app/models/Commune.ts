export interface Commune {
  id_commune?: number; // 👈 Llave primaria real del Backend
  id_city: number;
  name: string;
  status: string;
  created_at?: string; // Propiedad de auditoría opcional
  updated_at?: string; // Propiedad de auditoría opcional
}