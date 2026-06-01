export interface Official {
  id?: number;
  id_entity: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  last_latitude: number;
  last_longitude: number;
  last_gps_update: string;
  gps_active: boolean;
}