import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Citizen } from '../../models/Citizen';

@Injectable({ providedIn: 'root' })
export class CitizenService {
  private url = `${environment.apiUrl}/citizens`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Citizen[]> {
    return this.http.get<Citizen[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<Citizen> {
    return this.http.get<Citizen>(`${this.url}/${id}`);
  }

  search(q: string, page: number = 1, pageSize: number = 5): Observable<any> {
    const params = new HttpParams().set('q', q).set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(citizen: Citizen): Observable<Citizen> {
    return this.http.post<Citizen>(this.url, citizen);
  }

  update(id: number, citizen: Citizen): Observable<Citizen> {
    return this.http.put<Citizen>(`${this.url}/${id}`, citizen);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}