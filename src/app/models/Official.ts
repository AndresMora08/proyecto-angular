export interface Official {
  id_official?: number; // 🔄 Alineado con el Backend
  id_entity: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  last_latitude: number;
  last_longitude: number;
  last_gps_update: string | null; // 🔄 Puede ser string o null
  gps_active: boolean;
}