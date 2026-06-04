import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Report } from '../../models/Report';
import { ReportRequest } from '../../models/ReportRequest';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private url = 'http://127.0.0.1:5000/reports';

  constructor(private http: HttpClient) {}

  generateReport(data: ReportRequest): Observable<Report> {
    return this.http.post<Report>(this.url, data);
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