export interface Annotation {
  id_annotation?: number; // 👈 Clave primaria real
  id_neighborhood: number;
  id_citizen: number;
  description: string;
  latitude: number;
  longitude: number;
  status: string;
}