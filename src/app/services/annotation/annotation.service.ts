import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Annotation } from '../../models/Annotation';

@Injectable({ providedIn: 'root' })
export class AnnotationService {
  private url = `${environment.apiUrl}/annotations`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Annotation[]> {
    return this.http.get<Annotation[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<Annotation> {
    return this.http.get<Annotation>(`${this.url}/${id}`);
  }

  search(q: string): Observable<any> {
    const params = new HttpParams().set('q', q);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(annotation: Annotation): Observable<Annotation> {
    return this.http.post<Annotation>(this.url, annotation);
  }

  update(id: number, annotation: Annotation): Observable<Annotation> {
    return this.http.put<Annotation>(`${this.url}/${id}`, annotation);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}