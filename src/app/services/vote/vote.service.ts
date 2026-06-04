import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Vote } from '../../models/Vote';

@Injectable({ providedIn: 'root' })
export class VoteService {
  private url = `${environment.apiUrl}/votes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Vote[]> {
    return this.http.get<Vote[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<Vote> {
    return this.http.get<Vote>(`${this.url}/${id}`);
  }

  search(filters: { id_annotation?: number; page?: number; pageSize?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters.id_annotation) params = params.set('id_annotation', filters.id_annotation);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(vote: Vote): Observable<Vote> {
    return this.http.post<Vote>(this.url, vote);
  }

  update(id: number, vote: Vote): Observable<Vote> {
    return this.http.put<Vote>(`${this.url}/${id}`, vote);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}