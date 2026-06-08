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

  // 🔄 CORREGIDO: Usa id_entity de forma estricta
  getById(id_entity: number): Observable<Entity> {
    return this.http.get<Entity>(`${this.url}/${id_entity}`);
  }

  search(q: string): Observable<any> {
    const params = new HttpParams().set('q', q);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(entity: Entity): Observable<Entity> {
    return this.http.post<Entity>(this.url, this.toFormData(entity));
  }

  // 🔄 CORREGIDO: Usa id_entity de forma estricta
  update(id_entity: number, entity: Entity): Observable<Entity> {
    return this.http.put<Entity>(`${this.url}/${id_entity}`, this.toFormData(entity));
  }

  // 🔄 CORREGIDO: Usa id_entity de forma estricta
  delete(id_entity: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id_entity}`);
  }

  getLogoUrl(logoName: string): string {
    const fileName = logoName ? logoName.split('/').pop() : 'default.png';
    return `${environment.apiUrl}/images/logos/${fileName}`;
  }

  private toFormData(entity: Entity): FormData {
    const fd = new FormData();
    
    // 🔄 CORREGIDO: Si existe id_entity (en actualizaciones), se adjunta al FormData
    if (entity.id_entity) {
      fd.append('id_entity', entity.id_entity.toString());
    }

    fd.append('name', entity.name || '');
    fd.append('nit', entity.nit || '');
    fd.append('phone', entity.phone || '');
    fd.append('email', entity.email || '');
    fd.append('address', entity.address || '');
    fd.append('status', entity.status || 'active');
    
    if (entity.description) {
      fd.append('description', entity.description);
    }
    if (entity.logo_url) {
      fd.append('logo_url', entity.logo_url);
    }
    if (entity.file) {
      fd.append('file', entity.file);
    }
    
    return fd;
  }
}