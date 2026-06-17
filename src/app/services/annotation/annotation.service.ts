import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Annotation } from '../../models/Annotation';

export interface AnnotationEntityPayload {
  id_annotation: number;
  id_entity: number;
}

@Injectable({ providedIn: 'root' })
export class AnnotationService {
  private url = `${environment.apiUrl}/annotations`;
  private annotationEntitiesUrl = `${environment.apiUrl}/annotation-entities`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Annotation[]> {
    return this.http.get<Annotation[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id_annotation: number): Observable<Annotation> {
    return this.http.get<Annotation>(`${this.url}/${id_annotation}`);
  }

  // 💡 Añadimos soporte para buscar opcionalmente por id_neighborhood usando QueryParams
  search(filters: { q?: string; id_neighborhood?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters.q) params = params.set('q', filters.q);
    if (filters.id_neighborhood) params = params.set('id_neighborhood', filters.id_neighborhood);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(annotation: Annotation): Observable<Annotation> {
    return this.http.post<Annotation>(this.url, annotation);
  }

  createEntityRelation(payload: AnnotationEntityPayload): Observable<AnnotationEntityPayload> {
    return this.http.post<AnnotationEntityPayload>(this.annotationEntitiesUrl, payload);
  }

  update(id_annotation: number, annotation: Annotation): Observable<Annotation> {
    return this.http.put<Annotation>(`${this.url}/${id_annotation}`, annotation);
  }

  delete(id_annotation: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id_annotation}`);
  }
}
