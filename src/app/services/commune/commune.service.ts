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

  // Ajustado para usar la nomenclatura exacta de tu base de datos
  getById(id_commune: number): Observable<Commune> {
    return this.http.get<Commune>(`${this.url}/${id_commune}`);
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

  // Ajustado para enviar la llave primaria correcta al endpoint de Flask
  update(id_commune: number, commune: Commune): Observable<Commune> {
    return this.http.put<Commune>(`${this.url}/${id_commune}`, commune);
  }

  // Ajustado para procesar la eliminación sobre el recurso correcto
  delete(id_commune: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id_commune}`);
  }
}