import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Neighborhood } from '../../models/Neighborhood';

@Injectable({ providedIn: 'root' })
export class NeighborhoodService {
  private url = `${environment.apiUrl}/neighborhoods`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Neighborhood[]> {
    return this.http.get<Neighborhood[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<Neighborhood> {
    return this.http.get<Neighborhood>(`${this.url}/${id}`);
  }

  search(filters: { id_commune?: number; page?: number; pageSize?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters.id_commune) params = params.set('id_commune', filters.id_commune);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(neighborhood: Neighborhood): Observable<Neighborhood> {
    return this.http.post<Neighborhood>(this.url, neighborhood);
  }

  update(id: number, neighborhood: Neighborhood): Observable<Neighborhood> {
    return this.http.put<Neighborhood>(`${this.url}/${id}`, neighborhood);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}