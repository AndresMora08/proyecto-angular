import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Point } from '../../models/Point';

@Injectable({ providedIn: 'root' })
export class PointService {
  private url = `${environment.apiUrl}/points`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Point[]> {
    return this.http.get<Point[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id_point: number): Observable<Point> {
    return this.http.get<Point>(`${this.url}/${id_point}`);
  }

  search(filters: { id_neighborhood?: number; page?: number; pageSize?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters.id_neighborhood) params = params.set('id_neighborhood', filters.id_neighborhood);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(point: Partial<Point>): Observable<Point> {
    return this.http.post<Point>(this.url, point);
  }

  update(id_point: number, point: Point): Observable<Point> {
    return this.http.put<Point>(`${this.url}/${id_point}`, point);
  }

  delete(id_point: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id_point}`);
  }
}