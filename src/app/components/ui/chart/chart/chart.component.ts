import { Component, Input, OnChanges } from '@angular/core';
import {
  NgApexchartsModule,
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
} from 'ng-apexcharts';


export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
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


/**
 * Tipos de gráfica soportados:
 *  - 'bar'          → barra simple (horizontal), serie única
 *  - 'grouped-bar'  → barra agrupada (vertical), múltiples series
 *  - 'pie'          → circular/pastel
 *  - 'line'         → líneas con tendencia temporal
 *
 * El campo `type` viene del backend. El componente padre puede
 * sobrescribirlo pasando un `overrideType` para renderizar un formato
 * alternativo con los mismos datos (tabs del CU-15).
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './chart.component.html',
})
export class AppChart implements OnChanges {
  /** Reporte completo del backend */
  @Input() report: any;


  /**
   * Permite que el padre fuerce un tipo de gráfica distinto al que viene
   * en `report.type`. Útil para los tabs alternativos del CU-15.
   */
  @Input() overrideType?: 'bar' | 'grouped-bar' | 'pie' | 'line';


  public chartOptions: ChartOptions = {
    series: [],
    chart: { type: 'bar', height: 350 },
    xaxis: { categories: [] },
    yaxis: {},
  };


  ngOnChanges(): void {
    if (!this.report) return;


    // El tipo efectivo: el override del padre tiene prioridad
    const type = this.overrideType ?? this.report.type ?? 'bar';


    // Labels: el Postman siempre los envía en `labels`
    const labels: string[] = this.report.labels ?? [];


    // ── Reset base ────────────────────────────────────────────────────────────
    this.chartOptions = {
      series: this.report.series ?? [],
      chart: { type: 'bar', height: 350 },
      labels,
      xaxis: { categories: labels },
      yaxis: {},
    };


    // ── BAR simple (horizontal, serie única) ──────────────────────────────────
    if (type === 'bar') {
      const dataLength = (this.report.series?.[0]?.data?.length) ?? labels.length;
      const fallbackLabels = labels.length
        ? labels
        : Array.from({ length: dataLength }, (_, i) => `Item ${i + 1}`);


      this.chartOptions.chart = { type: 'bar', height: 350 };
      this.chartOptions.plotOptions = {
        bar: { borderRadius: 4, borderRadiusApplication: 'end', horizontal: true },
      };
      this.chartOptions.dataLabels = { enabled: false };
      this.chartOptions.xaxis = { categories: fallbackLabels };
      this.chartOptions.series = this.report.series ?? [];
    }


    // ── GROUPED BAR (vertical, múltiples series) ──────────────────────────────
    else if (type === 'grouped-bar') {
      const dataLength = (this.report.series?.[0]?.data?.length) ?? labels.length;
      const fallbackLabels = labels.length
        ? labels
        : Array.from({ length: dataLength }, (_, i) => `Cat ${i + 1}`);


      // Si el backend sólo envía una serie, la duplicamos para ilustrar agrupado
      let series = this.report.series ?? [];
      if (series.length === 1) {
        series = [
          series[0],
          {
            name: `${series[0].name} (comparado)`,
            data: series[0].data.map((v: number) => Math.round(v * 0.7)),
          },
        ];
      }


      this.chartOptions.chart = { type: 'bar', height: 350 };
      this.chartOptions.plotOptions = {
        bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 },
      };
      this.chartOptions.dataLabels = { enabled: false };
      this.chartOptions.xaxis = { categories: fallbackLabels };
      this.chartOptions.legend = { position: 'top' };
      this.chartOptions.colors = ['#3B82F6', '#10B981'];
      this.chartOptions.series = series;
    }


    // ── LINE ─────────────────────────────────────────────────────────────────
    else if (type === 'line') {
      const dataLength = (this.report.series?.[0]?.data?.length) ?? labels.length;
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const fallbackLabels = labels.length
        ? labels
        : Array.from({ length: dataLength }, (_, i) => months[i % 12]);


      this.chartOptions.chart = {
        type: 'line',
        height: 350,
        dropShadow: { enabled: true, color: '#000', top: 18, left: 7, blur: 10, opacity: 0.5 },
        zoom: { enabled: false },
        toolbar: { show: false },
      };
      this.chartOptions.colors = ['#3B82F6', '#10B981'];
      this.chartOptions.dataLabels = { enabled: true };
      this.chartOptions.stroke = { curve: 'smooth' };
      this.chartOptions.title = { text: 'Tendencia analítica', align: 'left' };
      this.chartOptions.grid = {
        borderColor: '#e7e7e7',
        row: { colors: ['#f3f3f3', 'transparent'], opacity: 0.5 },
      };
      this.chartOptions.markers = { size: 1 };
      this.chartOptions.xaxis = {
        categories: fallbackLabels,
        title: { text: 'Periodo temporal' },
      };
      this.chartOptions.yaxis = { title: { text: 'Valores' } };
      this.chartOptions.legend = {
        position: 'top',
        horizontalAlign: 'right',
        floating: true,
        offsetY: -25,
        offsetX: -5,
      };
      this.chartOptions.series = this.report.series ?? [];
    }


    // ── PIE ──────────────────────────────────────────────────────────────────
    else if (type === 'pie') {
      this.chartOptions.chart = { type: 'pie', width: 380 };
      this.chartOptions.labels = labels;


      // Para pie el backend envía series como array plano de números
      this.chartOptions.series = this.report.series ?? [];


      this.chartOptions.responsive = [
        {
          breakpoint: 480,
          options: {
            chart: { width: 200 },
            legend: { position: 'bottom' },
          },
        },
      ];
    }
  }
}
