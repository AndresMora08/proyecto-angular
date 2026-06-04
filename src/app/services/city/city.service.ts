import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { City } from '../../models/City';

@Injectable({ providedIn: 'root' })
export class CityService {
  private url = `${environment.apiUrl}/cities`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<City[]> {
    return this.http.get<City[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  // Ajustado para usar id_city según la firma de tu backend
  getById(id_city: number): Observable<City> {
    return this.http.get<City>(`${this.url}/${id_city}`);
  }

  search(filters: { id_department?: number; q?: string; page?: number; pageSize?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters.id_department) params = params.set('id_department', filters.id_department);
    if (filters.q) params = params.set('q', filters.q);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(city: City): Observable<City> {
    return this.http.post<City>(this.url, city);
  }

  // Ajustado para enviar id_city al endpoint de Flask
  update(id_city: number, city: City): Observable<City> {
    return this.http.put<City>(`${this.url}/${id_city}`, city);
  }

  // Ajustado para eliminar sobre el identificador correcto
  delete(id_city: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id_city}`);
  }
}