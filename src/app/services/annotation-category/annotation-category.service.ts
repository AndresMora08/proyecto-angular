import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { AnnotationCategory } from '../../models/AnnotationCategory';

@Injectable({ providedIn: 'root' })
export class AnnotationCategoryService {
  private url = `${environment.apiUrl}/annotation-categories`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AnnotationCategory[]> {
    return this.http.get<AnnotationCategory[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<AnnotationCategory> {
    return this.http.get<AnnotationCategory>(`${this.url}/${id}`);
  }

  search(q: string): Observable<any> {
    const params = new HttpParams().set('q', q);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(annotationCategory: AnnotationCategory): Observable<AnnotationCategory> {
    return this.http.post<AnnotationCategory>(this.url, annotationCategory);
  }

  update(id: number, annotationCategory: AnnotationCategory): Observable<AnnotationCategory> {
    return this.http.put<AnnotationCategory>(`${this.url}/${id}`, annotationCategory);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}