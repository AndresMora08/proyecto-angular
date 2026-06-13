import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrackingService, OfficialLocation } from '../../../services/tracking-service/tracking.service';
import { EntityService } from '../../../services/entity/entity.service';
import { MapService } from '../../../services/map/map.service';

@Component({
  selector: 'app-official-tracking',
  templateUrl: './official-tracking.component.html',
  styleUrls: ['./official-tracking.component.scss'],
  standalone: true,
  imports: [DecimalPipe]
})
export class OfficialTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  entities: any[] = [];
  selectedEntityId: number | null = null;
  
  allOfficials: OfficialLocation[] = [];
  filteredOfficials: OfficialLocation[] = [];
  showEmptyStateMessage: boolean = false;

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
    if (!this.selectedEntityId) {
      this.filteredOfficials = this.allOfficials;
    } else {
      this.filteredOfficials = this.allOfficials.filter(
        f => f.id_entity === this.selectedEntityId
      );
    }
    this.showEmptyStateMessage = this.selectedEntityId !== null && this.filteredOfficials.length === 0;
    this.renderMarkers();
  }

  /**
   * Acción gatillada al hacer clic en un funcionario del panel izquierdo
   */
  focusOfficial(official: OfficialLocation): void {
    this.mapService.selectOfficialOnMap(
      official.id_official, 
      official.latitude, 
      official.longitude
    );
  }

  private renderMarkers(): void {
    this.mapService.clearMarkers();

    this.filteredOfficials.forEach(official => {
      const popupContent = `
        <div class="p-2 min-w-[180px]">
          <div class="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
            <span class="w-2 h-2 rounded-full ${official.is_online ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
            <h4 class="font-bold text-xs text-slate-900">${official.name}</h4>
          </div>
          <p class="text-[11px] text-slate-500 space-y-0.5">
            <b>Estado:</b> ${official.is_online ? 'En servicio' : 'Desconectado'}<br>
            <b>Reporte:</b> ${new Date(official.last_updated).toLocaleTimeString()}
          </p>
        </div>
      `;

      this.mapService.addOfficialMarker(
        official.id_official,
        official.latitude,
        official.longitude,
        popupContent,
        official.is_online,
        official.name
      );
    });
  }
}