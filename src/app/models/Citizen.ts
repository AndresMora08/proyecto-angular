export interface Citizen {
  id?: number;
  id_citizen?: number; // Mapeo exacto del campo de Flask
  name: string;
  email: string;
  phone: string;       // Cambiado de 'cellphone' a 'phone'
  address: string;
  latitude: number;
  longitude: number;
  status: string;
}