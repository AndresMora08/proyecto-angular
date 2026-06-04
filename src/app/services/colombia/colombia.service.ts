import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ColombiaApiService {
  // URL Base pura del dominio, tal cual me indicaste
  private baseUrl = 'https://api-colombia.com';

  private departmentsCache$?: Observable<any[]>;
  private citiesCache$?: Observable<any[]>;

  constructor(private http: HttpClient) {}

  /**
   * GET https://api-colombia.com/api/v1/Department
   */
  getDepartments(): Observable<any[]> {
    if (!this.departmentsCache$) {
      this.departmentsCache$ = this.http.get<any[]>(`${this.baseUrl}/api/v1/Department`).pipe(
        shareReplay(1),
        catchError(() => of([]))
      );
    }
    return this.departmentsCache$;
  }

  /**
   * GET https://api-colombia.com/api/v1/Department/name/{name}
   */
  getDepartmentByName(name: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/v1/Department/name/${encodeURIComponent(name)}`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * GET https://api-colombia.com/api/v1/Department/{id}/cities
   */
  getCitiesByDepartmentId(departmentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/v1/Department/${departmentId}/cities`).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * GET https://api-colombia.com/api/v1/City
   */
  getAllCities(): Observable<any[]> {
    if (!this.citiesCache$) {
      this.citiesCache$ = this.http.get<any[]>(`${this.baseUrl}/api/v1/City`).pipe(
        shareReplay(1),
        catchError(() => of([]))
      );
    }
    return this.citiesCache$;
  }

  /**
   * GET https://api-colombia.com/api/v1/City/search/{name}
   */
  searchCitiesByName(name: string): Observable<any[]> {
    if (!name.trim()) return of([]);
    return this.http.get<any[]>(`${this.baseUrl}/api/v1/City/search/${encodeURIComponent(name)}`).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * GET https://api-colombia.com/api/v1/Country/Colombia
   */
  getCountryInfo(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/v1/Country/Colombia`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Validador de consistencia territorial usando la estructura exacta de rutas
   */
  validateCityAndDepartment(cityName: string, departmentName: string): Observable<boolean> {
    if (!cityName || !departmentName) return of(false);

    return this.searchCitiesByName(cityName).pipe(
      map((results) => {
        if (!results || results.length === 0) return false;

        const normalizeText = (str: string) => 
          str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

        const cleanDeptInput = normalizeText(departmentName);
        const cleanCityInput = normalizeText(cityName);

        return results.some(city => {
          const matchCity = normalizeText(city.name) === cleanCityInput;
          const matchDept = city.department?.name ? normalizeText(city.department.name) === cleanDeptInput : true;
          return matchCity && matchDept;
        });
      }),
      catchError(() => of(false))
    );
  }
}