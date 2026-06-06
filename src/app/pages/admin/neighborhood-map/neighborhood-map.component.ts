import { Component, OnInit, Input, Output, EventEmitter, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PointService } from '../../../services/point/point.service';
import { Point } from '../../../models/Point';
import { forkJoin, of, Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import * as L from 'leaflet';

@Component({
  selector: 'app-neighborhood-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './neighborhood-map.component.html',
  styleUrls: ['./neighborhood-map.component.css']
})
export class NeighborhoodMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() neighborhood: any | null = null;
  @Output() close = new EventEmitter<boolean>();

  map: any = null;
  markers: any[] = [];
  polygon: any = null;
  points: { latitude: number; longitude: number }[] = [];

  private subs: Subscription[] = [];

  constructor(private pointService: PointService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.map) this.map.remove();
  }

  initMap(): void {
    const center = L.latLng(5.0703, -75.5138);
    this.map = L.map('neighborhood-map-canvas', { center, zoom: 13 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // ensure map resizes correctly when placed in modal
    this.map.whenReady(() => setTimeout(() => this.map.invalidateSize(), 200));

    if (this.neighborhood?.id_neighborhood) {
      const s = this.pointService.search({ id_neighborhood: this.neighborhood.id_neighborhood }).subscribe({
        next: (res: any) => {
          const pts = this.extractPoints(res);
          this.points = pts
            .sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0))
            .map((p: any) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }))
            .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
          this.renderPoints();
        },
        error: () => { this.points = []; }
      });
      this.subs.push(s);
    }

    this.map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      this.points.push({ latitude: lat, longitude: lng });
      this.renderPoints();
    });
  }

  renderPoints(): void {
    this.markers.forEach(m => m.remove());
    this.markers = [];

    // add draggable markers and bind drag handler to update points in real time
    this.points.forEach((p, idx) => {
      const latlng = L.latLng(p.latitude, p.longitude);
      const m = L.marker(latlng, { draggable: true }).addTo(this.map);
      m.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        const markerIndex = this.markers.indexOf(e.target);
        const i = markerIndex >= 0 ? markerIndex : idx;
        this.points[i] = { latitude: pos.lat, longitude: pos.lng };
        // re-render to update polygon and marker positions
        this.renderPoints();
      });
      this.markers.push(m);
    });

    if (this.polygon) this.polygon.remove();
    if (this.points.length >= 3) {
      const latlngs = this.points.map(p => L.latLng(p.latitude, p.longitude));
      this.polygon = L.polygon(latlngs, { color: '#2b8a3e', fillOpacity: 0.15 }).addTo(this.map);
      this.map.fitBounds(this.polygon.getBounds(), { padding: [20, 20] });
    } else if (this.points.length > 0) {
      const last = this.points[this.points.length - 1];
      this.map.panTo([last.latitude, last.longitude]);
    }
  }

  removeLastPoint(): void {
    if (this.points.length > 0) {
      this.points.pop();
      this.renderPoints();
    }
  }

  clearPoints(): void {
    this.points = [];
    this.renderPoints();
  }

  savePoints(): void {
    // validar mínimo de puntos para formar polígono
    if (this.points.length < 3) {
      Swal.fire({ icon: 'warning', title: 'Puntos insuficientes', text: 'Debes agregar al menos 3 puntos para formar un polígono.' });
      return;
    }
    if (!this.neighborhood?.id_neighborhood) return;
    const idNeighborhood = this.neighborhood.id_neighborhood;

    const s = this.pointService.search({ id_neighborhood: idNeighborhood }).subscribe({
      next: (res: any) => {
        const existing = this.extractPoints(res);
        const deletes = (existing || [])
          .filter((p: any) => p?.id_point)
          .map((p: any) => this.pointService.delete(p.id_point));

        const deleteRequest = deletes.length ? forkJoin(deletes) : of([]);
        deleteRequest.subscribe({
          next: () => {
            const creations = this.points.map((pt, idx) => {
              const payload: Partial<Point> = {
                id_neighborhood: idNeighborhood,
                latitude: pt.latitude,
                longitude: pt.longitude,
                order: idx,
                point_type: 'boundary'
              };
              return this.pointService.create(payload);
            });

            forkJoin(creations.length ? creations : [of(null)]).subscribe({
              next: () => {
                Swal.fire({ icon: 'success', title: 'Puntos guardados', text: 'La demarcación del barrio se guardó correctamente.', timer: 1400, showConfirmButton: false });
                this.close.emit(true);
              },
              error: (err: HttpErrorResponse) => {
                Swal.fire({ icon: 'error', title: 'Error al guardar', text: this.getErrorMessage(err) });
                this.close.emit(false);
              }
            });
          },
          error: (err: HttpErrorResponse) => {
            Swal.fire({ icon: 'error', title: 'Error al limpiar puntos', text: this.getErrorMessage(err) });
            this.close.emit(false);
          }
        });
      },
      error: () => {
        const creations = this.points.map((pt, idx) => {
          const payload: Partial<Point> = {
            id_neighborhood: idNeighborhood,
            latitude: pt.latitude,
            longitude: pt.longitude,
            order: idx,
            point_type: 'boundary'
          };
          return this.pointService.create(payload);
        });
        forkJoin(creations.length ? creations : [of(null)]).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Puntos guardados', text: 'La demarcación del barrio se guardó correctamente.', timer: 1400, showConfirmButton: false });
            this.close.emit(true);
          },
          error: (err: HttpErrorResponse) => {
            Swal.fire({ icon: 'error', title: 'Error al guardar', text: this.getErrorMessage(err) });
            this.close.emit(false);
          }
        });
      }
    });
    this.subs.push(s);
  }

  private extractPoints(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.results)) return res.results;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.points)) return res.points;
    if (Array.isArray(res?.rows)) return res.rows;
    return [];
  }

  private getErrorMessage(err: HttpErrorResponse): string {
    const backendMessage = err?.error?.message || err?.error?.error || err?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    return 'No fue posible guardar los puntos del barrio.';
  }

  cancel(): void {
    this.close.emit(false);
  }
}
