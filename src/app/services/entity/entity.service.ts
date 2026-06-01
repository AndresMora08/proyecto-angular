import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Entity } from '../../models/Entity';

@Injectable({ providedIn: 'root' })
export class EntityService {
  private url = `${environment.apiUrl}/entities`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Entity[]> {
    return this.http.get<Entity[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<Entity> {
    return this.http.get<Entity>(`${this.url}/${id}`);
  }

  search(q: string): Observable<any> {
    const params = new HttpParams().set('q', q);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(entity: Entity): Observable<Entity> {
    return this.http.post<Entity>(this.url, this.toFormData(entity));
  }

  update(id: number, entity: Entity): Observable<Entity> {
    return this.http.put<Entity>(`${this.url}/${id}`, this.toFormData(entity));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  private toFormData(entity: Entity): FormData {
    const fd = new FormData();
    fd.append('name', entity.name);
    fd.append('nit', entity.nit);
    fd.append('phone', entity.phone);
    fd.append('email', entity.email);
    fd.append('address', entity.address);
    fd.append('logo_url', entity.logo_url);
    fd.append('status', entity.status);
    if (entity.file) {
      fd.append('file', entity.file);
    }
    return fd;
  }
}