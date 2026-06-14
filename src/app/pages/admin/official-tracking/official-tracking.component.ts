import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrackingService, OfficialLocation } from '../../../services/tracking-service/tracking.service';
import { EntityService } from '../../../services/entity/entity.service';
import { MapService } from '../../../services/map/map.service';
import { OfficialService } from '../../../services/official/official.service';
import { Official } from '../../../models/Official';
import { TrackingRequest } from '../../../models/TrackingRequest';


@Component({
  selector: 'app-official-tracking',
  templateUrl: './official-tracking.component.html',
  styleUrls: ['./official-tracking.component.css'],
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
    private entityService: EntityService,
    private mapService: MapService,
    private officialService: OfficialService, 
    private trackingService: TrackingService
  ) {}

  ngOnInit(): void {
  this.loadEntities();
  this.updateTimestamp();
  this.loadOfficialsAndInitializeTracking();
}

private loadOfficialsAndInitializeTracking(): void {
  this.officialService.getAll()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (officials: Official[]) => {
        this.allOfficials = officials.map((f: any) => ({
          id_official: f.id_official,
          name: f.name,
          id_entity: f.id_entity || 0,
          latitude: f.last_latitude || 0, 
          longitude: f.last_longitude || 0,
          is_online: false,
          last_updated: f.last_gps_update || new Date().toISOString(),
          avatar: f.avatar || 'assets/images/default-avatar.png'
        }));

        this.calculateMetrics();
        this.applyFilterAndSearch();
        this.initRealTimeTracking();
      },
      error: (err) => console.error('Error al precargar funcionarios:', err)
    });
}

  ngAfterViewInit(): void {
    this.mapService.initMap('map');
    this.initRealTimeTracking();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    this.officialService.stopTracking().subscribe({
      next: () => console.log('Bucle de tracking apagado en el backend de forma limpia.'),
      error: (err) => console.error('Error al detener el tracking:', err)
    });
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
        next: (response: { officials: any[] }) => {
          const updates = response.officials || [];

          // FUSIONAR COORDENADAS: Buscamos el funcionario en nuestra lista local y solo alteramos su posición
          updates.forEach(update => {
            const existing = this.allOfficials.find(f => f.id_official === update.id_official);
            
            if (existing) {
              existing.latitude = update.latitude;
              existing.longitude = update.longitude;
              existing.last_updated = update.last_gps_update || update.last_updated;
              existing.is_online = true; // Si vino en el flujo de tracking activo, está en línea
            } else {
              // Si por alguna razón el socket envía un ID nuevo que no teníamos mapeado
              this.allOfficials.push({
                id_official: update.id_official,
                name: `Funcionario Especial #${update.id_official}`,
                latitude: update.latitude,
                longitude: update.longitude,
                is_online: true,
                id_entity: 0, // Se asignará al actualizar o filtrar
                last_updated: update.last_gps_update || update.last_updated,
                avatar: update.avatar || 'assets/images/default-avatar.png'
              });
            }
          });

          // Recalcular métricas y refrescar la capa visual de Tailwind y Leaflet
          this.calculateMetrics();
          this.applyFilterAndSearch();
          this.updateTimestamp();
        },
        error: (err) => console.error('Error en el canal de tracking:', err)
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