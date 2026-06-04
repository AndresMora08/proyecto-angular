export interface Point {
  id_point?: number; // 👈 Clave primaria real
  id_neighborhood: number;
  id_annotation: number;
  latitude: number;
  longitude: number;
  order: number;
  point_type: string;
}