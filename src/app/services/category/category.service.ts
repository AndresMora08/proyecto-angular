import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Category } from '../../models/Category';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private url = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.url}/${id}`);
  }

  search(q: string): Observable<any> {
    const params = new HttpParams().set('q', q);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(category: Category): Observable<Category> {
    return this.http.post<Category>(this.url, this.toFormData(category));
  }

  update(id: number, category: Category): Observable<Category> {
    return this.http.put<Category>(`${this.url}/${id}`, this.toFormData(category));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  private toFormData(category: Category): FormData {
    const fd = new FormData();
    fd.append('id_parent_category', String(category.id_parent_category));
    fd.append('name', category.name);
    fd.append('description', category.description);
    fd.append('image_url', category.image_url);
    fd.append('status', category.status);
    if (category.file) {
      fd.append('file', category.file);
    }
    return fd;
  }
}