import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule]
})
export class OfficialTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  entities: any[] = [];
  selectedEntityId: number | null = null;
  
  allOfficials: OfficialLocation[] = [];
  filteredOfficials: any[] = [];
  searchTerm: string = '';
  
  // Variables para la sección de métricas numéricas
  activeCount: number = 0;
  inactiveCount: number = 0;
  totalCount: number = 0;

  // Fecha y hora de última actualización
  lastUpdateStr: string = '--/--/---- --:--:--';

  constructor(
    private trackingService: TrackingService,
    private entityService: EntityService,
    private mapService: MapService
  ) {}

  ngOnInit(): void {
    this.loadEntities();
    this.updateTimestamp();
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
          this.calculateMetrics();
          this.applyFilterAndSearch();
          this.updateTimestamp();
        }
      });
  }

  // Calcula los números globales solicitados para el panel superior
  private calculateMetrics(): void {
    this.totalCount = this.allOfficials.length;
    this.activeCount = this.allOfficials.filter(f => f.is_online).length;
    this.inactiveCount = this.totalCount - this.activeCount;
  }

  private updateTimestamp(): void {
    const now = new Date();
    this.lastUpdateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
  }

  onEntityChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedEntityId = target.value ? Number(target.value) : null;
    this.applyFilterAndSearch();
  }

  // Captura el texto del input de búsqueda
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value.toLowerCase();
    this.applyFilterAndSearch();
  }

  // Ejecuta la actualización manual solicitada
  manualRefresh(): void {
    this.updateTimestamp();
    this.applyFilterAndSearch();
    // Aquí puedes llamar una recarga forzada del backend si tu servicio lo permite
  }

  private applyFilterAndSearch(): void {
    let result = this.allOfficials;

    // 1. Filtrar por Entidad
    if (this.selectedEntityId) {
      result = result.filter(f => f.id_entity === this.selectedEntityId);
    }

    // 2. Filtrar por Buscador (Nombre)
    if (this.searchTerm.trim() !== '') {
      result = result.filter(f => f.name.toLowerCase().includes(this.searchTerm));
    }

    // Mapeamos los datos simulando o formateando la dirección/ubicación y fotos
    this.filteredOfficials = result.map(official => ({
      ...official,
      // Si el backend no tiene dirección exacta, mostramos coordenadas legibles o fallback como pide el CU
      address: (official as any).address || `Sector Central (Lat: ${official.latitude.toFixed(4)}, Lng: ${official.longitude.toFixed(4)})`,
      avatar_url: (official as any).avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(official.name)}&background=0D8ABC&color=fff`
    }));

    this.renderMarkers();
  }

  focusOfficial(official: any): void {
    this.mapService.selectOfficialOnMap(official.id_official, official.latitude, official.longitude);
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
            <b>Dirección:</b> ${official.address}
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