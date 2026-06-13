import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrackingService, OfficialLocation } from '../../../services/tracking-service/tracking.service';
import { EntityService } from '../../../services/entity/entity.service';
import { MapService } from '../../../services/map/map.service';
import { GenericTableComponent } from '../../../components/ui/table/generic-table/generic-table.component';

@Component({
  selector: 'app-official-tracking',
  templateUrl: './official-tracking.component.html',
  styleUrls: ['./official-tracking.component.scss'],
  standalone: true,
  imports: [CommonModule, GenericTableComponent]
})
export class OfficialTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  entities: any[] = [];
  selectedEntityId: number | null = null;
  
  allOfficials: OfficialLocation[] = [];
  filteredOfficials: any[] = [];
  showEmptyStateMessage: boolean = false;

  // SOLUCIÓN AL ERROR TS2322: Ahora es un string[] con las llaves exactas del objeto
  tableColumns: string[] = ['id_official', 'name', 'status_text'];

  constructor(
    private trackingService: TrackingService,
    private entityService: EntityService,
    private mapService: MapService
  ) {}

  ngOnInit(): void {
    this.loadEntities();
  }

  ngAfterViewInit(): void {
    this.mapService.initMap('map');
    this.initRealTimeTracking();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.mapService.destroyMap();
  }

  private loadEntities(): void {
    this.entityService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.entities = data,
        error: (err) => console.error('Error al cargar entidades:', err)
      });
  }

  private initRealTimeTracking(): void {
    this.trackingService.getOfficialLocationsStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (locations: OfficialLocation[]) => {
          this.allOfficials = locations;
          this.applyFilter();
        }
      });
  }

  onEntityChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedEntityId = target.value ? Number(target.value) : null;
    this.applyFilter();
  }

  private applyFilter(): void {
    let rawFiltered = [];
    if (!this.selectedEntityId) {
      rawFiltered = this.allOfficials;
    } else {
      rawFiltered = this.allOfficials.filter(f => f.id_entity === this.selectedEntityId);
    }

    this.showEmptyStateMessage = this.selectedEntityId !== null && rawFiltered.length === 0;

    this.filteredOfficials = rawFiltered.map(official => ({
      ...official,
      id_official: official.id_official,
      name: official.name,
      status_text: official.is_online ? '🟢 En línea' : '🔴 Desconectado'
    }));

    this.renderMarkers();
  }

  onRowSelected(row: any): void {
    this.mapService.selectOfficialOnMap(row.id_official, row.latitude, row.longitude);
  }

  private renderMarkers(): void {
    this.mapService.clearMarkers();
    this.filteredOfficials.forEach(official => {
      const popupContent = `
        <div class="p-2 min-w-[180px]">
          <div class="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
            <h4 class="font-bold text-xs text-slate-900">${official.name}</h4>
          </div>
          <p class="text-[11px] text-slate-500">
            <b>Estado:</b> ${official.status_text}
          </p>
        </div>
      `;
      this.mapService.addOfficialMarker(
        official.id_official,
        official.latitude,
        official.longitude,
        popupContent,
        official.status_text.includes('🟢'),
        official.name
      );
    });
  }
}