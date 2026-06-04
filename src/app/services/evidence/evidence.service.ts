import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Evidence } from '../../models/Evidence';

@Injectable({ providedIn: 'root' })
export class EvidenceService {
  private url = `${environment.apiUrl}/evidences`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Evidence[]> {
    return this.http.get<Evidence[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<Evidence> {
    return this.http.get<Evidence>(`${this.url}/${id}`);
  }

  search(filters: { id_annotation?: number; page?: number; pageSize?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters.id_annotation) params = params.set('id_annotation', filters.id_annotation);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(evidence: Evidence): Observable<Evidence> {
    return this.http.post<Evidence>(this.url, this.toFormData(evidence));
  }

  update(id: number, evidence: Evidence): Observable<Evidence> {
    return this.http.put<Evidence>(`${this.url}/${id}`, this.toFormData(evidence));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  private toFormData(evidence: Evidence): FormData {
    const fd = new FormData();
    fd.append('id_annotation', String(evidence.id_annotation));
    fd.append('file_url', evidence.file_url);
    fd.append('file_type', evidence.file_type);
    fd.append('file_size', String(evidence.file_size));
    if (evidence.file) {
      fd.append('file', evidence.file);
    }
    return fd;
  }
}