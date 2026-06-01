import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { InterestedParty } from '../../models/InterestedParty';

@Injectable({ providedIn: 'root' })
export class InterestedPartyService {
  private url = `${environment.apiUrl}/interested-parties`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<InterestedParty[]> {
    return this.http.get<InterestedParty[]>(this.url);
  }

  getPaginated(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(this.url, { params });
  }

  getById(id: number): Observable<InterestedParty> {
    return this.http.get<InterestedParty>(`${this.url}/${id}`);
  }

  search(q: string): Observable<any> {
    const params = new HttpParams().set('q', q);
    return this.http.get<any>(`${this.url}/search`, { params });
  }

  create(interestedParty: InterestedParty): Observable<InterestedParty> {
    return this.http.post<InterestedParty>(this.url, interestedParty);
  }

  update(id: number, interestedParty: InterestedParty): Observable<InterestedParty> {
    return this.http.put<InterestedParty>(`${this.url}/${id}`, interestedParty);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}