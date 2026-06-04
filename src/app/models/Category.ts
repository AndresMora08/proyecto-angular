export interface Category {
  id?: number;
  id_parent_category: number;
  name: string;
  description: string;
  image_url: string;
  status: string;
  file?: File;
}