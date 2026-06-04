import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Commune } from '../../models/Commune';

@Injectable({ providedIn: 'root' })
export class CommuneService {
  private url = `${environment.apiUrl}/communes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Commune[]> {
    return this.http.get<Commune[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<Commune> {
    return this.http.get<Commune>(`${this.url}/${id}`);
  }

  search(filters: { id_city?: number; page?: number; pageSize?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters.id_city) params = params.set('id_city', filters.id_city);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(commune: Commune): Observable<Commune> {
    return this.http.post<Commune>(this.url, commune);
  }

  update(id: number, commune: Commune): Observable<Commune> {
    return this.http.put<Commune>(`${this.url}/${id}`, commune);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}