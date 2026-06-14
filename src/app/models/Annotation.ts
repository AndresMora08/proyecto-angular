export interface Annotation {
  id_annotation?: number;
  description: string;
  latitude: number;
  longitude: number;
  status: string;
  id_neighborhood?: number | null;
  id_citizen?: number;
  
  categories?: any[]; 
  evidences?: any[];
  categories_text?: string; 
  entities_text?: string;   
}