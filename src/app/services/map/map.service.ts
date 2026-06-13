import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map!: L.Map;
  private markersGroup!: L.LayerGroup;
  // Registro para poder interactuar con los marcadores desde la lista lateral
  private markersMap = new Map<number, L.Marker>();

  private greenIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  private greyIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  initMap(elementId: string, center: [number, number] = [5.0681, -75.5174], zoom: number = 13): void {
    if (this.map) {
      this.destroyMap();
    }
    this.map = L.map(elementId, { zoomControl: false }).setView(center, zoom);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);
  }

  clearMarkers(): void {
    if (this.markersGroup) {
      this.markersGroup.clearLayers();
    }
    this.markersMap.clear();
  }

  addOfficialMarker(id: number, lat: number, lng: number, popupHtml: string, isOnline: boolean, name: string): void {
    if (!this.map || !this.markersGroup) return;

    const markerOptions: L.MarkerOptions = {
      icon: isOnline ? this.greenIcon : this.greyIcon,
      opacity: isOnline ? 1.0 : 0.5,
      title: name
    };

    const marker = L.marker([lat, lng], markerOptions);
    marker.bindPopup(popupHtml);
    
    this.markersGroup.addLayer(marker);
    this.markersMap.set(id, marker); // Guardamos la referencia
  }

  /**
   * Mueve la cámara del mapa hacia el funcionario y abre su popup automáticamente
   */
  selectOfficialOnMap(id: number, lat: number, lng: number): void {
    if (!this.map) return;
    
    this.map.flyTo([lat, lng], 16, {
      animate: true,
      duration: 1.2
    });

    const marker = this.markersMap.get(id);
    if (marker) {
      setTimeout(() => marker.openPopup(), 1200);
    }
  }

  destroyMap(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}