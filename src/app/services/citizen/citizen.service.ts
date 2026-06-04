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
    // Garantizamos que mande la propiedad esperada por el backend en el cuerpo JSON
    const cleanBody = {
      name: citizen.name,
      email: citizen.email,
      phone: citizen.phone || (citizen as any).cellphone || '',
      address: citizen.address,
      latitude: citizen.latitude,
      longitude: citizen.longitude,
      status: citizen.status || 'active'
    };
    return this.http.post<Citizen>(this.url, cleanBody);
  }

  update(id: number, citizen: Citizen): Observable<Citizen> {
    const cleanBody = {
      name: citizen.name,
      email: citizen.email,
      phone: citizen.phone || (citizen as any).cellphone || '',
      address: citizen.address,
      latitude: citizen.latitude,
      longitude: citizen.longitude,
      status: citizen.status
    };
    return this.http.put<Citizen>(`${`${this.url}`}/${id}`, cleanBody);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}