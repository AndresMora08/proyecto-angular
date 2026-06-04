export interface Entity {
  id?: number;
  name: string;
  description?: string;
  nit: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
  status: string;
  file?: File;
}