import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ReportService } from '../../../services/repost/repost.service';

import { AppChart } from '../../../components/ui/chart/chart/chart.component';

@Component({
  selector: 'app-report-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppChart
  ],
  templateUrl: './report-chat.component.html',
})
export class ReportChatComponent {

  query: string = '';

  loading = false;

  report: any = null;

  constructor(private reportService: ReportService) {}

  sendQuery(): void {

    if (!this.query.trim()) return;

    this.loading = true;

    this.reportService.generateReport({
      query: this.query
    }).subscribe({
      next: (response) => {

        this.report = response;

        this.loading = false;

        console.log(response);
      },

      error: (err) => {

        console.error(err);

        this.loading = false;
      }
    });
  }
}