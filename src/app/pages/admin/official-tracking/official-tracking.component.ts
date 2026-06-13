import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrackingService, OfficialLocation } from '../../../services/tracking-service/tracking.service';
import { EntityService } from '../../../services/entity/entity.service';
import { MapService } from '../../../services/map/map.service';

@Component({
  selector: 'app-official-tracking',
  templateUrl: './official-tracking.component.html',
  styleUrls: ['./official-tracking.component.scss']
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
    // Inicializa el mapa de Leaflet una vez que el DOM esté listo
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

    // Paso 3a: Validar si no hay funcionarios activos en la entidad elegida
    this.showEmptyStateMessage = this.selectedEntityId !== null && this.filteredOfficials.length === 0;

    this.renderMarkers();
  }

  private renderMarkers(): void {
    this.mapService.clearMarkers();

    this.filteredOfficials.forEach(official => {
      const popupContent = `
        <div class="p-2">
          <h4 class="font-bold text-sm text-gray-900">${official.name}</h4>
          <p class="text-xs text-gray-600 mt-1">
            <b>Estado:</b> ${official.is_online ? '🟢 En línea' : '🔴 Desconectado'}<br>
            <b>Último reporte:</b> ${new Date(official.last_updated).toLocaleString()}
          </p>
        </div>
      `;

      this.mapService.addOfficialMarker(
        official.latitude,
        official.longitude,
        popupContent,
        official.is_online,
        official.name
      );
    });
  }
}