import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';


import { ReportService } from '../../../services/repost/reports.service';
import { ReportRequest } from '../../../models/ReportRequest';
import { Report } from '../../../models/Report';
import { AppChart } from '../../../components/ui/chart/chart/chart.component';


/** Tipos de gráfica manejados en el CU-15 */
type ChartTabType = 'bar' | 'grouped-bar' | 'pie' | 'line';


interface ChartTabConfig {
  id: ChartTabType;
  label: string;
  icon: string;
  /** Motivo por el que está deshabilitado (null = habilitado) */
  disabledReason: string | null;
}


/**
 * Mapeo: qué tipo de gráfica devuelve el backend → qué tabs aplican.
 * Flujo alternativo 4a del CU-15: sólo un tipo aplica → los demás
 * se deshabilitan con un motivo explícito.
 */
const TAB_RULES: Record<string, Record<ChartTabType, string | null>> = {
  pie: {
    'bar':         'Los datos son proporcionales; la barra no refleja distribución porcentual.',
    'grouped-bar': 'Los datos son proporcionales; la barra agrupada requiere múltiples categorías.',
    'pie':         null,   // ← formato ideal
    'line':        'Los datos no tienen dimensión temporal; la línea de tendencia no aplica.',
  },
  bar: {
    'bar':         null,   // ← formato ideal
    'grouped-bar': null,   // habilitado: puede mostrar agrupado con la misma base de datos
    'pie':         'Los datos son comparativos entre categorías, no partes de un todo.',
    'line':        'Los datos no tienen dimensión temporal; la línea de tendencia no aplica.',
  },
  line: {
    'bar':         'Los datos tienen evolución temporal; la barra horizontal pierde la secuencia.',
    'grouped-bar': null,   // habilitado: útil para comparar series en el mismo periodo
    'pie':         'Los datos tienen múltiples puntos en el tiempo; el pastel no aplica.',
    'line':        null,   // ← formato ideal
  },
};


@Component({
  selector: 'app-report-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AppChart],
  templateUrl: './report-chat.component.html',
})
export class ReportManagementComponent {
  // ── Tabs del módulo ────────────────────────────────────────────────────────
  activeModuleTab: 'chat' | 'history' = 'chat';


  // ── Estado de la consulta ──────────────────────────────────────────────────
  loading: boolean = false;
  lastQuerySubmitted: string = '';


  currentReport: Report | null = null;
  errorMessage: string | null = null;
  infoMessage: string | null = null;


  // ── Tabs de los 4 formatos (CU-15 paso 4) ─────────────────────────────────
  activeChartTab: ChartTabType = 'bar';


  chartTabs: ChartTabConfig[] = [
    { id: 'bar',         label: 'Barra simple',   icon: '📊', disabledReason: null },
    { id: 'grouped-bar', label: 'Barra agrupada', icon: '📉', disabledReason: null },
    { id: 'pie',         label: 'Circular',        icon: '🥧', disabledReason: null },
    { id: 'line',        label: 'Líneas',          icon: '📈', disabledReason: null },
  ];


  constructor(private reportService: ReportService) {}


  // ── Envío del formulario ──────────────────────────────────────────────────
  onSendForm(event: Event): void {
    event.preventDefault();


    const inputElement = document.getElementById('queryInput') as HTMLInputElement;
    if (!inputElement) return;


    const textoDirecto = inputElement.value.trim();
    if (!textoDirecto) return;


    this.loading = true;
    this.errorMessage = null;
    this.infoMessage = null;
    this.lastQuerySubmitted = textoDirecto;


    const bodyRequest: ReportRequest = { query: textoDirecto };
    console.log('Body enviado:', JSON.stringify(bodyRequest));
    this.reportService.generateReport(bodyRequest).subscribe({
      next: (response: Report) => {
        this.loading = false;
        inputElement.value = '';


        // ── Flujo alternativo 3b: sin datos ────────────────────────────────
        if (
          !response ||
          (!response.series && !response.labels) ||
          (Array.isArray(response.series) && response.series.length === 0)
        ) {
          this.infoMessage =
            'La consulta no retorna datos. No hay registros para los filtros indicados.';
          this.currentReport = null;
          return;
        }


        this.applyReport(response);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.currentReport = null;


        // ── Flujo alternativo 3a: consulta no interpretable (422) ──────────
        if (err.status === 422) {
          this.errorMessage =
            'El sistema no interpreta la consulta. Intenta reformularla con palabras clave, ' +
            'zonas o fechas específicas.\n\n' +
            'Ejemplos: "ventas por región del último trimestre" · ' +
            '"comunas con más barrios" · "predios por estrato"';
        } else if (err.status === 400) {
          this.errorMessage =
            'La consulta enviada es inválida o el campo llegó vacío al servidor (Error 400).';
        } else {
          this.errorMessage =
            'Inconveniente en el servidor de IA al procesar la analítica (Error ' + err.status + ').';
        }
      },
    });
  }


  // ── Lógica de tabs (CU-15 paso 4 y flujo 4a) ─────────────────────────────
  /**
   * Recibe el reporte, aplica las reglas de habilitación de tabs y
   * activa automáticamente el tab ideal (el que el backend recomienda).
   */
  private applyReport(response: Report): void {
    this.currentReport = response;
    const backendType = response.type as string;


    const rules = TAB_RULES[backendType] ?? null;


    this.chartTabs = this.chartTabs.map((tab) => ({
      ...tab,
      disabledReason: rules ? (rules[tab.id] ?? null) : null,
    }));


    // Activa el tab ideal según lo que dijo el backend
    if (backendType === 'pie' || backendType === 'bar' || backendType === 'line') {
      this.activeChartTab = backendType as ChartTabType;
    } else {
      this.activeChartTab = 'bar';
    }
  }


  selectChartTab(tab: ChartTabConfig): void {
    if (tab.disabledReason) return;
    this.activeChartTab = tab.id;
  }


  get activeTabDisabledReason(): string | null {
    return this.chartTabs.find((t) => t.id === this.activeChartTab)?.disabledReason ?? null;
  }


  isIdealTab(tabId: ChartTabType): boolean {
    return !!this.currentReport && tabId === (this.currentReport as any).type;
  }


  // ── Botones de prueba ─────────────────────────────────────────────────────
  loadTestPie(): void {
    this.clearMessages();
    this.lastQuerySubmitted = 'Simulando consulta proporcional (Pie)…';
    this.reportService.getTestPie().subscribe((res) => this.applyReport(res));
  }


  loadTestBar(): void {
    this.clearMessages();
    this.lastQuerySubmitted = 'Simulando consulta comparativa (Bar)…';
    this.reportService.getTestBar().subscribe((res) => this.applyReport(res));
  }


  loadTestLine(): void {
    this.clearMessages();
    this.lastQuerySubmitted = 'Simulando tendencia temporal (Line)…';
    this.reportService.getTestLine().subscribe((res) => this.applyReport(res));
  }


  private clearMessages(): void {
    this.errorMessage = null;
    this.infoMessage = null;
  }
}
