import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReportRequest } from '../../models/ReportRequest';
import { Report } from '../../models/Report';


@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private url = 'http://127.0.0.1:5000/reports';


  constructor(private http: HttpClient) {}


  generateReport(body: ReportRequest): Observable<Report> {
    // ✅ Sin HttpHeaders manual — Angular envía Content-Type: application/json
    // automáticamente al detectar un objeto JS, evitando el preflight CORS
    // que provocaba el 400 en Flask.
    return this.http.post<Report>(this.url, body);
  }


  getTestPie(): Observable<Report> {
    return this.http.get<Report>(`${this.url}/test/pie`);
  }


  getTestBar(): Observable<Report> {
    return this.http.get<Report>(`${this.url}/test/bar`);
  }


  getTestLine(): Observable<Report> {
    return this.http.get<Report>(`${this.url}/test/line`);
  }
}
