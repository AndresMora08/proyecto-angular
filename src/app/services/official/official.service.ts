import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';
import { Official } from '../../models/Official';
import { TrackingRequest } from '../../models/TrackingRequest';

@Injectable({ providedIn: 'root' })
export class OfficialService {
  private url = `${environment.apiUrl}/officials`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Official[]> {
    return this.http.get<Official[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<Official> {
    return this.http.get<Official>(`${this.url}/${id}`);
  }

  search(q: string): Observable<any> {
    const params = new HttpParams().set('q', q);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  checkEmailExists(email: string): Observable<boolean> {
    return this.search(email).pipe(
      map((res: any) => {
        const list = res?.results || (Array.isArray(res) ? res : []);
        return list.some((o: any) => o.email.toLowerCase() === email.toLowerCase());
      })
    );
  }

  create(official: Official): Observable<Official> {
    return this.http.post<Official>(this.url, official);
  }

  update(id: number, official: Official): Observable<Official> {
    return this.http.put<Official>(`${this.url}/${id}`, official);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  startTracking(request: TrackingRequest): Observable<any> {
    return this.http.post<any>(`${this.url}/tracking/start`, request);
  }

  stopTracking(): Observable<any> {
    return this.http.post<any>(`${this.url}/tracking/stop`, {});
  }
}