import { Component } from '@angular/core';
import { Input, OnChanges } from '@angular/core';
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexNonAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexStroke,
  ApexFill,
  ApexLegend,
  ApexTooltip,
  ApexMarkers,
  ApexPlotOptions,
  ApexResponsive,
  ApexGrid,
  ApexAnnotations,
  ApexStates,
  ApexTheme,
  NgApexchartsModule,
} from 'ng-apexcharts';

export type ChartOptions = {
  series?: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart?: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis | ApexYAxis[];
  title?: ApexTitleSubtitle;
  subtitle?: ApexTitleSubtitle;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  fill?: ApexFill;
  legend?: ApexLegend;
  tooltip?: ApexTooltip;
  markers?: ApexMarkers;
  plotOptions?: ApexPlotOptions;
  responsive?: ApexResponsive[];
  grid?: ApexGrid;
  annotations?: ApexAnnotations;
  states?: ApexStates;
  theme?: ApexTheme;
  colors?: string[];
  labels?: any;
};

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './chart.component.html',
})
export class AppChart implements OnChanges {

  @Input() report: any;

  public chartOptions: any;

  ngOnChanges(): void {

    if (!this.report) return;

    this.chartOptions = {
      series: this.report.series,
      chart: {
        type: this.report.type,
        height: 400
      },
      labels: this.report.labels,
      xaxis: {
        categories: this.report.labels
      }
    };
  }
}