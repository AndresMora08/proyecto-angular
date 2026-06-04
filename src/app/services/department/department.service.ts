import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Department } from '../../models/Departament';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private url = `${environment.apiUrl}/departments`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  // Ajustado para usar id_department según tu backend
  getById(id_department: number): Observable<Department> {
    return this.http.get<Department>(`${this.url}/${id_department}`);
  }

  search(q: string, page: number = 1, pageSize: number = 5): Observable<any> {
    const params = new HttpParams().set('q', q).set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(department: Department): Observable<Department> {
    return this.http.post<Department>(this.url, department);
  }

  // Ajustado para enviar id_department al endpoint de Flask
  update(id_department: number, department: Department): Observable<Department> {
    return this.http.put<Department>(`${this.url}/${id_department}`, department);
  }

  // Ajustado para eliminar sobre el identificador correcto
  delete(id_department: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id_department}`);
  }
}